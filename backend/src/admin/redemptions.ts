import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { couponId, userId } = req.query;
    const where: any = {};
    if (couponId) where.couponId = Number(couponId);
    if (userId) where.userId = Number(userId);
    const redemptions = await prisma.couponRedemption.findMany({
      where,
      orderBy: { redeemedAt: 'desc' },
      include: { coupon: true, user: { select: { id: true, fullName: true, email: true } } },
    });
    res.json({ redemptions, total: redemptions.length });
  } catch (err) {
    console.error('Failed to list redemptions:', err);
    res.status(500).json({ error: 'Failed to list redemptions' });
  }
});

export default router;
