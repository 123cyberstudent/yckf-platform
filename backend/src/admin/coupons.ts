import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, active } = req.query;
    const where: any = {};
    if (search) {
      where.OR = [
        { code: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (active !== undefined) {
      where.isActive = active === 'true';
    }
    const coupons = await prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { redemptions: true } } },
    });
    res.json({ coupons, total: coupons.length });
  } catch (err) {
    console.error('Failed to list coupons:', err);
    res.status(500).json({ error: 'Failed to list coupons' });
  }
});

router.post('/create', async (req: Request, res: Response) => {
  try {
    const { code, description, discountPercent, maxUses, expiresAt } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'code is required' });
    }
    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return res.status(409).json({ error: 'Coupon code already exists' });
    }
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description,
        discountPercent: discountPercent ? Number(discountPercent) : null,
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdById: (req as any).user?.id,
      },
    });
    res.json({ success: true, coupon });
  } catch (err) {
    console.error('Failed to create coupon:', err);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

router.post('/deactivate', async (req: Request, res: Response) => {
  try {
    const { couponId, code } = req.body;
    const identifier = couponId ? { id: Number(couponId) } : { code: String(code).toUpperCase() };
    if (!couponId && !code) {
      return res.status(400).json({ error: 'couponId or code is required' });
    }
    const coupon = await prisma.coupon.update({
      where: identifier,
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Coupon deactivated', coupon });
  } catch (err) {
    console.error('Failed to deactivate coupon:', err);
    res.status(500).json({ error: 'Failed to deactivate coupon' });
  }
});

router.post('/reactivate', async (req: Request, res: Response) => {
  try {
    const { couponId, code } = req.body;
    const identifier = couponId ? { id: Number(couponId) } : { code: String(code).toUpperCase() };
    if (!couponId && !code) {
      return res.status(400).json({ error: 'couponId or code is required' });
    }
    const coupon = await prisma.coupon.update({
      where: identifier,
      data: { isActive: true },
    });
    res.json({ success: true, message: 'Coupon reactivated', coupon });
  } catch (err) {
    console.error('Failed to reactivate coupon:', err);
    res.status(500).json({ error: 'Failed to reactivate coupon' });
  }
});

router.post('/delete', async (req: Request, res: Response) => {
  try {
    const { couponId, code } = req.body;
    const identifier = couponId ? { id: Number(couponId) } : { code: String(code).toUpperCase() };
    if (!couponId && !code) {
      return res.status(400).json({ error: 'couponId or code is required' });
    }
    await prisma.couponRedemption.deleteMany({ where: { coupon: identifier } });
    await prisma.coupon.delete({ where: identifier });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (err) {
    console.error('Failed to delete coupon:', err);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

export default router;
