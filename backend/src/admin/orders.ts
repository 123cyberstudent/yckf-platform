import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';

const router = Router();

const ORDER_STATUSES = [
  'CREATED',
  'PENDING_PAYMENT',
  'PAID',
  'FULFILLED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
];

function serializeOrder(order: any) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    currency: order.currency,
    subtotalAmount: order.subtotalAmount,
    discountAmount: order.discountAmount,
    taxAmount: order.taxAmount,
    totalAmount: order.totalAmount,
    metadata: order.metadata,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    paidAt: order.paidAt,
    fulfilledAt: order.fulfilledAt,
    cancelledAt: order.cancelledAt,
    expiresAt: order.expiresAt,
    user: order.user ? { id: order.user.id, email: order.user.email, fullName: order.user.fullName } : null,
    items: order.items,
    paymentStatus: order.paymentAttempts?.[0]?.status ?? null,
  };
}

/** GET /api/admin/orders — all orders, filters: status, orderType, search, cursor pagination */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, orderType, search } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    const where: any = {};
    if (status && ORDER_STATUSES.includes(String(status))) where.status = String(status);
    if (orderType && ['COURSE', 'CREDIT_PACKAGE'].includes(String(orderType).toUpperCase())) {
      where.orderType = String(orderType).toUpperCase();
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: String(search), mode: 'insensitive' } },
        { user: { email: { contains: String(search), mode: 'insensitive' } } },
        { user: { fullName: { contains: String(search), mode: 'insensitive' } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { id: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        items: true,
        paymentAttempts: { orderBy: { id: 'desc' }, take: 1 },
      },
    });

    res.json({
      orders: orders.map(serializeOrder),
      nextCursor: orders.length === limit ? orders[orders.length - 1].id : null,
      total: await prisma.order.count({ where }),
    });
  } catch (err) {
    console.error('Failed to list orders:', err);
    res.status(500).json({ error: 'Failed to list orders' });
  }
});

/** GET /api/admin/orders/:orderNumber — full order detail */
router.get('/:orderNumber', async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: String(req.params.orderNumber) },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        items: true,
        paymentAttempts: { orderBy: { id: 'desc' } },
        appliedPromotion: true,
        appliedPromoCode: true,
        redemptions: { include: { user: { select: { id: true, email: true, fullName: true } } } },
        enrolments: true,
        refunds: true,
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (err) {
    console.error('Failed to get order:', err);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

export default router;
