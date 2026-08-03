import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';
import { SUBSCRIPTION_PAYMENT_STATUS } from '../subscriptions/constants.js';

const router = Router();

function serializePayment(p: any) {
  return {
    id: p.id,
    provider: p.provider,
    providerReference: p.providerReference,
    amountPesewas: p.amountPesewas,
    amountGhs: p.amountPesewas / 100,
    currency: p.currency,
    channel: p.channel,
    status: p.status,
    referralCodeEntered: p.referralCodeEntered,
    referredUserId: p.referredUserId,
    paidAt: p.paidAt,
    verifiedAt: p.verifiedAt,
    rawProviderStatus: p.rawProviderStatus,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    user: p.user ? { id: p.user.id, email: p.user.email, fullName: p.user.fullName } : null,
    plan: p.plan ? { id: p.plan.id, code: p.plan.code, name: p.plan.name } : null,
  };
}

/** GET /api/admin/subscription-payments — filters: status, search, cursor pagination. */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    const where: any = {};
    if (status && Object.values(SUBSCRIPTION_PAYMENT_STATUS).includes(String(status).toUpperCase() as any)) {
      where.status = String(status).toUpperCase();
    }
    if (search) {
      where.OR = [
        { providerReference: { contains: String(search), mode: 'insensitive' } },
        { user: { email: { contains: String(search), mode: 'insensitive' } } },
        { user: { fullName: { contains: String(search), mode: 'insensitive' } } },
      ];
    }

    const payments = await prisma.subscriptionPayment.findMany({
      where,
      orderBy: { id: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        plan: { select: { id: true, code: true, name: true } },
      },
    });

    res.json({
      payments: payments.map(serializePayment),
      nextCursor: payments.length === limit ? payments[payments.length - 1].id : null,
      total: await prisma.subscriptionPayment.count({ where }),
    });
  } catch (err) {
    console.error('Failed to list subscription payments:', err);
    res.status(500).json({ error: 'Failed to list subscription payments' });
  }
});

/** GET /api/admin/subscription-payments/:id — full payment detail. */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const payment = await prisma.subscriptionPayment.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        user: { select: { id: true, email: true, fullName: true, phone: true } },
        plan: true,
        subscription: true,
        referral: true,
      },
    });
    if (!payment) return res.status(404).json({ error: 'Subscription payment not found' });
    res.json({ payment: serializePayment(payment) });
  } catch (err) {
    console.error('Failed to get subscription payment:', err);
    res.status(500).json({ error: 'Failed to get subscription payment' });
  }
});

export default router;
