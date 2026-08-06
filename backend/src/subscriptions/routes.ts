import { Router } from 'express';
import { body, param } from 'express-validator';
import rateLimit from 'express-rate-limit';
import type { Response } from 'express';
import { AuthRequest, verifyToken } from '../auth/middleware.js';
import { generalRateLimiter } from '../shared/rateLimiter.js';
import { validateRequest } from '../utils/validators.js';
import { prisma } from '../shared/db.js';
import { PaymentError } from '../payments/errors.js';
import {
  getActivePlans,
  getSubscriptionStatus,
  initializeSubscriptionPayment,
  validateReferralCode,
} from './service.js';

const router = Router();

const checkoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => String(((req as AuthRequest).user?.id) ?? req.ip ?? 'unknown'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many subscription requests, please try again later.' },
});

/** GET /api/subscriptions/plans — public plan catalogue (server-priced). */
router.get('/plans', generalRateLimiter, async (_req, res) => {
  try {
    const plans = await getActivePlans();
    res.json({ success: true, plans });
  } catch (err) {
    console.error('Failed to list subscription plans:', err);
    res.status(500).json({ success: false, error: 'Failed to list subscription plans' });
  }
});

router.use('/status', verifyToken);
router.use('/initialize', verifyToken);
router.use('/validate-referral', verifyToken);
router.use('/payment-status', verifyToken);

/** GET /api/subscriptions/status — current premium entitlement. */
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const status = await getSubscriptionStatus(req.user!.id);
    res.json({ success: true, ...status });
  } catch (err) {
    if (err instanceof PaymentError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    console.error('Failed to get subscription status:', err);
    res.status(500).json({ success: false, error: 'Failed to get subscription status' });
  }
});

/** GET /api/subscriptions/payment-status/:reference — poll a checkout by reference.
 *  Returns the provider status so the mobile WebView can detect completion. */
router.get(
  '/payment-status/:reference',
  [param('reference').trim().notEmpty().withMessage('reference is required')],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const reference = String(req.params.reference).trim();
      const payment = await prisma.subscriptionPayment.findFirst({
        where: { providerReference: reference, userId: req.user!.id },
        select: { status: true, paidAt: true, amountPesewas: true, plan: { select: { name: true, code: true } } },
      });
      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }
      res.json({
        success: true,
        reference,
        status: payment.status,
        paid: payment.status === 'PAID',
        paidAt: payment.paidAt,
        plan: payment.plan?.name ?? null,
      });
    } catch (err) {
      console.error('Failed to get payment status:', err);
      res.status(500).json({ success: false, error: 'Failed to get payment status' });
    }
  }
);

/** POST /api/subscriptions/initialize — { planCode, referralCode? } → Paystack auth URL. */
router.post(
  '/initialize',
  checkoutRateLimiter,
  [
    body('planCode').trim().notEmpty().withMessage('planCode is required'),
    body('referralCode').optional().isString().withMessage('referralCode must be a string'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const result = await initializeSubscriptionPayment({
        userId: req.user!.id,
        planCode: String(req.body.planCode).trim(),
        referralCode: typeof req.body.referralCode === 'string' ? req.body.referralCode : undefined,
        platform: typeof req.body.platform === 'string' ? req.body.platform : undefined,
      });
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      if (err instanceof PaymentError) {
        return res.status(err.status).json({ success: false, code: err.code, error: err.message, details: err.details });
      }
      console.error('Failed to initialize subscription:', err);
      res.status(500).json({ success: false, error: 'Failed to initialize subscription' });
    }
  }
);

/** POST /api/subscriptions/validate-referral — { referralCode } → owner name. */
router.post(
  '/validate-referral',
  checkoutRateLimiter,
  [body('referralCode').trim().notEmpty().withMessage('referralCode is required')],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const result = await validateReferralCode(String(req.body.referralCode));
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('Failed to validate referral code:', err);
      res.status(500).json({ success: false, error: 'Failed to validate referral code' });
    }
  }
);

/** POST /api/subscriptions/:reference/cancel — cancel/park an abandoned checkout. */
router.post(
  '/:reference/cancel',
  checkoutRateLimiter,
  [param('reference').trim().notEmpty().withMessage('reference is required')],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const reference = String(req.params.reference).trim();
      const payment = await prisma.subscriptionPayment.findFirst({
        where: { providerReference: reference, userId: req.user!.id },
      });
      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }
      if (payment.status === 'PAID') {
        return res.status(400).json({ success: false, error: 'Payment already completed' });
      }
      // Only transition still-pending/abandoned checkouts so a completed
      // charge (processed by webhook a moment later) is never cancelled.
      if (payment.status === 'PENDING' || payment.status === 'INITIALIZED') {
        await prisma.subscriptionPayment.update({
          where: { id: payment.id },
          data: { status: 'CANCELLED', rawProviderStatus: 'cancelled_by_user' },
        });
      }
      res.json({ success: true, message: 'Subscription checkout cancelled' });
    } catch (err) {
      console.error('Failed to cancel subscription checkout:', err);
      res.status(500).json({ success: false, error: 'Failed to cancel subscription checkout' });
    }
  }
);

export default router;
