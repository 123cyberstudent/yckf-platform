import { Router, Request, Response } from 'express';
import { verifyToken } from '../auth/middleware.js';
import { generalRateLimiter } from '../shared/rateLimiter.js';
import { prisma } from '../shared/db.js';

const router = Router();

router.use(verifyToken, generalRateLimiter);

router.get('/validate', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: 'code query parameter is required' });
    }
    const coupon = await prisma.coupon.findUnique({
      where: { code: String(code).toUpperCase() },
    });
    if (!coupon) {
      return res.json({ valid: false, message: 'Coupon not found', description: null });
    }
    if (!coupon.isActive) {
      return res.json({ valid: false, message: 'Coupon is inactive', description: null });
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.json({ valid: false, message: 'Coupon has expired', description: null });
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.json({ valid: false, message: 'Coupon has reached maximum uses', description: null });
    }
    res.json({
      valid: true,
      message: 'Coupon is valid',
      description: coupon.description,
      discountPercent: coupon.discountPercent,
      expiresAt: coupon.expiresAt,
    });
  } catch (err) {
    console.error('Failed to validate coupon:', err);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

router.post('/redeem', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'code is required' });
    }
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Invalid coupon code' });
    }
    if (!coupon.isActive) {
      return res.status(400).json({ success: false, error: 'Coupon is inactive' });
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, error: 'Coupon has expired' });
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ success: false, error: 'Coupon has reached maximum uses' });
    }
    const existingRedemption = await prisma.couponRedemption.findUnique({
      where: { couponId_userId: { couponId: coupon.id, userId } },
    });
    if (existingRedemption) {
      return res.status(400).json({ success: false, error: 'You have already redeemed this coupon' });
    }
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
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
        accessDuration: 24,
      },
    });
  } catch (err) {
    console.error('Failed to redeem coupon:', err);
    res.status(500).json({ success: false, error: 'Failed to redeem coupon' });
  }
});

export default router;
