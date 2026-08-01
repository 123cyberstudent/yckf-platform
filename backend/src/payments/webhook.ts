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
 * HMAC signature verification.
 *
 * Processing happens before we acknowledge. On a transient failure we respond
 * 5xx so Paystack retries; the event row is kept as FAILED and re-processed on
 * the next identical delivery (instead of being treated as a duplicate).
 * Fulfilment grants are idempotent, so double-processing is always safe.
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
  const dedupeKey = `${event}:${reference ?? ''}:${payloadHash.slice(0, 20)}`;

  // Find an existing delivery. PROCESSED/IGNORED deliveries are deduplicated;
  // FAILED deliveries are retried (Paystack will re-send after a 5xx).
  let webhookEvent = await prisma.webhookEvent.findFirst({ where: { providerEventId: dedupeKey } });
  if (webhookEvent) {
    if (webhookEvent.processingStatus === WebhookProcessingStatus.PROCESSED || webhookEvent.processingStatus === WebhookProcessingStatus.IGNORED) {
      return res.json({ status: 'duplicate' });
    }
  }

  const paymentAttempt = reference
    ? await prisma.paymentAttempt.findUnique({ where: { providerReference: String(reference) }, select: { id: true } })
    : null;

  webhookEvent = webhookEvent
    ? await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processingStatus: WebhookProcessingStatus.PROCESSING, attemptCount: { increment: 1 }, paymentAttemptId: paymentAttempt?.id ?? webhookEvent.paymentAttemptId },
      })
    : await prisma.webhookEvent.create({
        data: {
          provider: 'paystack',
          providerEventId: dedupeKey,
          eventType: event,
          payloadHash,
          paymentReference: reference,
          paymentAttemptId: paymentAttempt?.id,
          processingStatus: WebhookProcessingStatus.PROCESSING,
        },
      });

  try {
    if (event === 'charge.success' && reference) {
      const result = await handleChargeSuccess(String(reference));
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processingStatus: result.status === 'ignored' ? WebhookProcessingStatus.IGNORED : WebhookProcessingStatus.PROCESSED,
          processedAt: new Date(),
        },
      });
    } else {
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processingStatus: WebhookProcessingStatus.IGNORED, processedAt: new Date() },
      });
    }
    res.json({ status: 'received' });
  } catch (err) {
    console.error('Webhook processing failed:', err);
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        processingStatus: WebhookProcessingStatus.FAILED,
        lastError: err instanceof Error ? err.message : 'Unknown error',
      },
    });
    res.status(500).json({ status: 'processing_failed' });
  }
});

export default router;
