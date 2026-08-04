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
    const { code, description, discountPercent, durationHours, maxUses, expiresAt } = req.body;
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'code is required' });
    }

    const discount = discountPercent === undefined || discountPercent === null || discountPercent === ''
      ? null
      : Number(discountPercent);
    if (discount !== null && (!Number.isFinite(discount) || discount < 0 || discount > 100)) {
      return res.status(400).json({ error: 'discountPercent must be a number between 0 and 100' });
    }

    const duration = durationHours === undefined || durationHours === null || durationHours === ''
      ? 24
      : Number(durationHours);
    if (!Number.isInteger(duration) || duration < 1) {
      return res.status(400).json({ error: 'durationHours must be a positive integer' });
    }

    const max = maxUses === undefined || maxUses === null || maxUses === ''
      ? null
      : Number(maxUses);
    if (max !== null && (!Number.isInteger(max) || max < 1)) {
      return res.status(400).json({ error: 'maxUses must be a positive integer' });
    }

    let expires: Date | null = null;
    if (expiresAt) {
      expires = new Date(expiresAt);
      if (Number.isNaN(expires.getTime())) {
        return res.status(400).json({ error: 'expiresAt must be a valid date' });
      }
    }

    const existing = await prisma.coupon.findUnique({ where: { code: String(code).trim().toUpperCase() } });
    if (existing) {
      return res.status(409).json({ error: 'Coupon code already exists' });
    }
    const coupon = await prisma.coupon.create({
      data: {
        code: String(code).trim().toUpperCase(),
        description,
        discountPercent: discount,
        durationHours: duration,
        maxUses: max,
        expiresAt: expires,
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
