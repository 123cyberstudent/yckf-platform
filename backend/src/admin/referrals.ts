import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';

const router = Router();

function serializeReferral(r: any) {
  return {
    id: r.id,
    referralCode: r.referralCode,
    rewardHours: r.rewardHours,
    status: r.status,
    rewardGrantedAt: r.rewardGrantedAt,
    rewardExpiresAt: r.rewardExpiresAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    referrer: r.referrer ? { id: r.referrer.id, email: r.referrer.email, fullName: r.referrer.fullName } : null,
    referred: r.referred ? { id: r.referred.id, email: r.referred.email, fullName: r.referred.fullName } : null,
  };
}

/** GET /api/admin/referrals — filters: status, search, cursor pagination. */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    const where: any = {};
    if (status) where.status = String(status).toUpperCase();
    if (search) {
      where.OR = [
        { referralCode: { contains: String(search), mode: 'insensitive' } },
        { referrer: { email: { contains: String(search), mode: 'insensitive' } } },
        { referred: { email: { contains: String(search), mode: 'insensitive' } } },
      ];
    }

    const referrals = await prisma.referral.findMany({
      where,
      orderBy: { id: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        referrer: { select: { id: true, email: true, fullName: true } },
        referred: { select: { id: true, email: true, fullName: true } },
      },
    });

    res.json({
      referrals: referrals.map(serializeReferral),
      nextCursor: referrals.length === limit ? referrals[referrals.length - 1].id : null,
      total: await prisma.referral.count({ where }),
    });
  } catch (err) {
    console.error('Failed to list referrals:', err);
    res.status(500).json({ error: 'Failed to list referrals' });
  }
});

export default router;
