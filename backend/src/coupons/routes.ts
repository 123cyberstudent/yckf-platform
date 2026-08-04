import { Router, Request, Response } from 'express';
import { verifyToken } from '../auth/middleware.js';
import { generalRateLimiter } from '../shared/rateLimiter.js';
import { redeemCoupon, validateCoupon } from './service.js';

const router = Router();

router.use(verifyToken, generalRateLimiter);

function normalizeCode(raw: string): string {
  return (raw || '').trim().toUpperCase();
}

// Validate coupon — supports both GET (?code=X) and POST (body { code } or { couponCode })
router.get('/validate', async (req: Request, res: Response) => {
  try {
    const code = normalizeCode(String(req.query.code || ''));
    if (!code) {
      return res.status(400).json({ valid: false, error: 'code query parameter is required' });
    }
    const result = await validateCoupon(code, (req as any).user?.id ?? null);
    res.json(result);
  } catch (err) {
    console.error('Failed to validate coupon:', err);
    res.status(500).json({ valid: false, error: 'Failed to validate coupon' });
  }
});

router.post('/validate', async (req: Request, res: Response) => {
  try {
    const rawCode = req.body.couponCode || req.body.code || '';
    const code = normalizeCode(rawCode);
    if (!code) {
      return res.status(400).json({ valid: false, error: 'couponCode is required' });
    }
    const result = await validateCoupon(code, (req as any).user?.id ?? null);
    res.json(result);
  } catch (err) {
    console.error('Failed to validate coupon:', err);
    res.status(500).json({ valid: false, error: 'Failed to validate coupon' });
  }
});

// Redeem coupon — accepts { code } or { couponCode }
router.post('/redeem', async (req: Request, res: Response) => {
  try {
    const rawCode = req.body.couponCode || req.body.code || '';
    const code = normalizeCode(rawCode);
    if (!code) {
      return res.status(400).json({ success: false, error: 'couponCode is required' });
    }
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const result = await redeemCoupon(code, userId, {
      ip: String(req.ip),
      userAgent: req.get('user-agent') ?? undefined,
    });
    if (!result.success) {
      const statusCode = result.message === 'COUPON_INVALID' ? 404 : 400;
      return res.status(statusCode).json({ success: false, code: result.message, error: result.message });
    }
    res.json(result);
  } catch (err) {
    console.error('Failed to redeem coupon:', err);
    res.status(500).json({ success: false, error: 'Failed to redeem coupon' });
  }
});

export default router;
