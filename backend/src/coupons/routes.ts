import { Router, Request, Response } from 'express';
import { verifyToken } from '../auth/middleware.js';
import { generalRateLimiter } from '../shared/rateLimiter.js';
import { prisma } from '../shared/db.js';

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
    await validateAndRespond(code, null, res);
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
    await validateAndRespond(code, null, res);
  } catch (err) {
    console.error('Failed to validate coupon:', err);
    res.status(500).json({ valid: false, error: 'Failed to validate coupon' });
  }
});

async function validateAndRespond(code: string, userId: number | null, res: Response) {
  const coupon = await prisma.coupon.findUnique({
    where: { code },
  });
  if (!coupon) {
    return res.json({ valid: false, message: 'Invalid coupon code', description: null });
  }
  if (!coupon.isActive) {
    return res.json({ valid: false, message: 'This coupon is inactive', description: null });
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return res.json({ valid: false, message: 'This coupon has expired', description: null });
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return res.json({ valid: false, message: 'This coupon has reached maximum uses', description: null });
  }
  if (userId) {
    const existingRedemption = await prisma.couponRedemption.findUnique({
      where: { couponId_userId: { couponId: coupon.id, userId } },
    });
    if (existingRedemption) {
      return res.json({ valid: false, message: 'You have already redeemed this coupon', description: null });
    }
  }
  res.json({
    valid: true,
    message: 'Coupon is valid',
    description: coupon.description,
    discountPercent: coupon.discountPercent,
    expiresAt: coupon.expiresAt,
    durationHours: coupon.durationHours || 24,
  });
}

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
    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });
    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Invalid coupon code' });
    }
    if (!coupon.isActive) {
      return res.status(400).json({ success: false, error: 'This coupon is inactive' });
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, error: 'This coupon has expired' });
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ success: false, error: 'This coupon has reached maximum uses' });
    }
    const existingRedemption = await prisma.couponRedemption.findUnique({
      where: { couponId_userId: { couponId: coupon.id, userId } },
    });
    if (existingRedemption) {
      return res.status(400).json({ success: false, error: 'You have already redeemed this coupon' });
    }

    const durationHours = coupon.durationHours || 24;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + durationHours);

    const redemption = await prisma.$transaction([
      prisma.couponRedemption.create({
        data: { couponId: coupon.id, userId, expiresAt },
      }),
      prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);
    res.json({
      success: true,
      message: 'Coupon redeemed successfully',
      redemption: {
        redeemedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        accessDuration: durationHours,
      },
    });
  } catch (err) {
    console.error('Failed to redeem coupon:', err);
    res.status(500).json({ success: false, error: 'Failed to redeem coupon' });
  }
});

export default router;
