import crypto from 'crypto';
import express, { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';
import { WebhookProcessingStatus } from './constants.js';
import { handleChargeSuccess } from './ordersService.js';
import { verifyWebhookSignature } from './paystack.js';

const router = Router();

/**
 * POST /api/paystack/webhook
 * Mounted BEFORE express.json() in app.ts so the raw body is available for
 * HMAC signature verification. The route acks quickly (200) and processes
 * idempotently; every grant is keyed so re-processing is safe.
 */
router.post('/', express.raw({ type: 'application/json', limit: '1mb' }), async (req: Request, res: Response) => {
  const signature = req.headers['x-paystack-signature'] as string | undefined;
  const rawBody = req.body as Buffer;

  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
    return res.status(400).json({ status: 'empty_body' });
  }

  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).json({ status: 'invalid_signature' });
  }

  let payload: { event?: string; data?: { reference?: string } } | null = null;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ status: 'invalid_json' });
  }

  const event = payload?.event ?? 'unknown';
  const reference = payload?.data?.reference ?? null;
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

  // Dedupe identical deliveries (providerEventId is intentionally non-unique).
  const dedupeKey = `${event}:${reference ?? ''}:${payloadHash.slice(0, 20)}`;
  const existingEvent = await prisma.webhookEvent.findFirst({ where: { providerEventId: dedupeKey } });
  if (existingEvent) {
    return res.json({ status: 'duplicate' });
  }

  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      provider: 'paystack',
      providerEventId: dedupeKey,
      eventType: event,
      payloadHash,
      paymentReference: reference,
      processingStatus: WebhookProcessingStatus.RECEIVED,
    },
  });

  res.json({ status: 'received' });

  if (event === 'charge.success' && reference) {
    try {
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processingStatus: WebhookProcessingStatus.PROCESSING },
      });
      const result = await handleChargeSuccess(String(reference));
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processingStatus: result.status === 'ignored' ? WebhookProcessingStatus.IGNORED : WebhookProcessingStatus.PROCESSED,
          processedAt: new Date(),
          attemptCount: { increment: 1 },
        },
      });
    } catch (err) {
      console.error('Webhook processing failed:', err);
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processingStatus: WebhookProcessingStatus.FAILED,
          lastError: err instanceof Error ? err.message : 'Unknown error',
          attemptCount: { increment: 1 },
        },
      });
    }
  } else {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processingStatus: WebhookProcessingStatus.IGNORED, processedAt: new Date() },
    });
  }
});

export default router;
