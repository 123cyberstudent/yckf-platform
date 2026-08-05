import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';
import { fulfilOrder } from '../payments/ordersService.js';
import { PaymentError } from '../payments/errors.js';
import { logAudit } from '../audit/service.js';

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
    source: 'order',
  };
}

/** Order-status vocabulary <-> SubscriptionPayment status mapping so premium
 *  checkouts (which live in SubscriptionPayment, not Order) appear on the
 *  admin Orders page instead of silently vanishing ("No orders found"). */
const SUB_PAYMENT_TO_ORDER_STATUS: Record<string, string> = {
  PENDING: 'PENDING_PAYMENT',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
};
const ORDER_TO_SUB_PAYMENT_STATUS: Record<string, string> = {
  PENDING_PAYMENT: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
};

const SUBSCRIPTION_ID_OFFSET = 1_000_000_000;

function serializeSubscriptionPayment(p: any) {
  return {
    id: SUBSCRIPTION_ID_OFFSET + p.id,
    orderNumber: p.providerReference,
    orderType: 'PREMIUM_SUBSCRIPTION',
    status: SUB_PAYMENT_TO_ORDER_STATUS[p.status] ?? p.status,
    currency: p.currency,
    subtotalAmount: p.amountPesewas,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: p.amountPesewas,
    metadata: p.metadata,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    paidAt: p.paidAt,
    fulfilledAt: p.paidAt,
    cancelledAt: null,
    expiresAt: null,
    user: p.user ? { id: p.user.id, email: p.user.email, fullName: p.user.fullName } : null,
    items: [
      {
        id: SUBSCRIPTION_ID_OFFSET + p.id,
        productType: 'PREMIUM_SUBSCRIPTION',
        productId: p.planId,
        productName: p.plan?.name ? `${p.plan.name} Premium` : 'Premium subscription',
        unitPrice: p.amountPesewas,
        totalPrice: p.amountPesewas,
        quantity: 1,
      },
    ],
    paymentStatus: p.status,
    source: 'subscription_payment',
  };
}

/** GET /api/admin/orders — all orders, filters: status, orderType, search, cursor pagination.
 *  Merges legacy Order rows with SubscriptionPayment rows (premium checkouts). */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, orderType, search } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    const where: any = {};
    if (status && ORDER_STATUSES.includes(String(status))) where.status = String(status);
    if (orderType && ['COURSE', 'PREMIUM_SUBSCRIPTION'].includes(String(orderType).toUpperCase())) {
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

    // Merge in subscription checkouts (first page only; cursor pages stay
    // legacy-order-only to keep cursor semantics stable).
    let subscriptionRows: any[] = [];
    let subscriptionTotal = 0;
    const typeFilter = orderType ? String(orderType).toUpperCase() : null;
    const includeSubscriptions = !cursor && (!typeFilter || typeFilter === 'PREMIUM_SUBSCRIPTION');
    const statusFilter = status ? String(status) : null;
    const mappedSubStatus = statusFilter ? ORDER_TO_SUB_PAYMENT_STATUS[statusFilter] : null;
    if (includeSubscriptions && (!statusFilter || mappedSubStatus)) {
      const subWhere: any = {};
      if (mappedSubStatus) subWhere.status = mappedSubStatus;
      if (search) {
        subWhere.OR = [
          { providerReference: { contains: String(search), mode: 'insensitive' } },
          { user: { email: { contains: String(search), mode: 'insensitive' } } },
          { user: { fullName: { contains: String(search), mode: 'insensitive' } } },
        ];
      }
      const [payments, count] = await Promise.all([
        prisma.subscriptionPayment.findMany({
          where: subWhere,
          orderBy: { id: 'desc' },
          take: limit,
          include: {
            user: { select: { id: true, email: true, fullName: true } },
            plan: { select: { name: true } },
          },
        }),
        prisma.subscriptionPayment.count({ where: subWhere }),
      ]);
      subscriptionRows = payments.map(serializeSubscriptionPayment);
      subscriptionTotal = count;
    }

    const merged = [...orders.map(serializeOrder), ...subscriptionRows]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    res.json({
      orders: merged,
      nextCursor: orders.length === limit ? orders[orders.length - 1].id : null,
      total: (await prisma.order.count({ where })) + subscriptionTotal,
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

/** POST /api/admin/orders/:orderNumber/fulfill — idempotently grant and complete an order */
router.post('/:orderNumber/fulfill', async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({ where: { orderNumber: String(req.params.orderNumber) } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const outcome = await fulfilOrder(order.id, null);
    await logAudit((req as any).user?.id ?? null, 'order.fulfill', order.id, String(req.ip), {
      entityType: 'order',
      entityId: order.id,
      previousValue: { status: order.status },
      newValue: { status: outcome.order.status, alreadyFulfilled: outcome.alreadyFulfilled },
      userAgent: req.get('user-agent') ?? undefined,
    });
    res.json({ success: true, alreadyFulfilled: outcome.alreadyFulfilled, order: serializeOrder({ ...outcome.order, paymentAttempts: [] }) });
  } catch (err) {
    if (err instanceof PaymentError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    console.error('Failed to fulfill order:', err);
    res.status(500).json({ error: 'Failed to fulfill order' });
  }
});

/** POST /api/admin/orders/:orderNumber/cancel — cancel a pending/unpaid order */
router.post('/:orderNumber/cancel', async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({ where: { orderNumber: String(req.params.orderNumber) } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'PAID' || order.status === 'FULFILLED') {
      return res.status(409).json({ error: 'Paid or fulfilled orders cannot be cancelled' });
    }
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED' || order.status === 'PARTIALLY_REFUNDED') {
      return res.status(409).json({ error: 'Order is already cancelled/refunded' });
    }
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    await logAudit((req as any).user?.id ?? null, 'order.cancel', order.id, String(req.ip), {
      entityType: 'order',
      entityId: order.id,
      previousValue: { status: order.status },
      newValue: { status: 'CANCELLED' },
      userAgent: req.get('user-agent') ?? undefined,
    });
    res.json({ success: true, order: serializeOrder({ ...updated, items: [], paymentAttempts: [] }) });
  } catch (err) {
    console.error('Failed to cancel order:', err);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

/** POST /api/admin/orders/:orderNumber/refund — admin override refund for paid/fulfilled orders */
router.post('/:orderNumber/refund', async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({ where: { orderNumber: String(req.params.orderNumber) } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'PAID' && order.status !== 'FULFILLED') {
      return res.status(409).json({ error: 'Only paid or fulfilled orders can be refunded' });
    }
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'REFUNDED' },
    });
    await logAudit((req as any).user?.id ?? null, 'order.refund', order.id, String(req.ip), {
      entityType: 'order',
      entityId: order.id,
      previousValue: { status: order.status },
      newValue: { status: 'REFUNDED' },
      userAgent: req.get('user-agent') ?? undefined,
    });
    res.json({ success: true, order: serializeOrder({ ...updated, items: [], paymentAttempts: [] }) });
  } catch (err) {
    console.error('Failed to refund order:', err);
    res.status(500).json({ error: 'Failed to refund order' });
  }
});

// Non-paid statuses that are safe to remove. Paid/fulfilled/refunded records
// are financial records and are never deleted.
const ADMIN_DELETABLE_ORDER_STATUSES = new Set(['CREATED', 'PENDING_PAYMENT', 'FAILED', 'CANCELLED', 'EXPIRED']);
const ADMIN_DELETABLE_SUB_STATUSES = new Set(['PENDING', 'FAILED', 'CANCELLED']);

/** DELETE /api/admin/orders/:orderNumber — remove one non-paid order entry.
 *  Accepts either a legacy Order number or a subscription provider reference. */
router.delete('/:orderNumber', async (req: Request, res: Response) => {
  try {
    const orderNumber = String(req.params.orderNumber);

    const legacy = await prisma.order.findUnique({ where: { orderNumber } });
    if (legacy) {
      if (!ADMIN_DELETABLE_ORDER_STATUSES.has(legacy.status)) {
        return res.status(409).json({ error: 'Paid or fulfilled orders cannot be deleted' });
      }
      await prisma.$transaction([
        prisma.orderItem.deleteMany({ where: { orderId: legacy.id } }),
        prisma.paymentAttempt.deleteMany({ where: { orderId: legacy.id } }),
        prisma.order.delete({ where: { id: legacy.id } }),
      ]);
      await logAudit((req as any).user?.id ?? null, 'order.delete', legacy.id, String(req.ip), {
        entityType: 'order',
        entityId: legacy.id,
        previousValue: { orderNumber, status: legacy.status },
        newValue: { deleted: true },
        userAgent: req.get('user-agent') ?? undefined,
      });
      return res.json({ success: true, deleted: { kind: 'order', orderNumber } });
    }

    const payment = await prisma.subscriptionPayment.findUnique({ where: { providerReference: orderNumber } });
    if (payment) {
      if (!ADMIN_DELETABLE_SUB_STATUSES.has(payment.status)) {
        return res.status(409).json({ error: 'Completed subscription payments cannot be deleted' });
      }
      const linked = await prisma.subscription.findFirst({ where: { paymentId: payment.id }, select: { id: true } });
      if (linked) return res.status(409).json({ error: 'This payment is linked to an active subscription' });
      await prisma.subscriptionPayment.delete({ where: { id: payment.id } });
      await logAudit((req as any).user?.id ?? null, 'order.delete', payment.id, String(req.ip), {
        entityType: 'subscriptionPayment',
        entityId: payment.id,
        previousValue: { providerReference: orderNumber, status: payment.status },
        newValue: { deleted: true },
        userAgent: req.get('user-agent') ?? undefined,
      });
      return res.json({ success: true, deleted: { kind: 'subscription', orderNumber } });
    }

    res.status(404).json({ error: 'Order not found' });
  } catch (err) {
    console.error('Failed to delete order:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

/** DELETE /api/admin/orders — remove all non-paid order entries in one go.
 *  Optionally scope by ?status= (single status, e.g. FAILED). */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const statusFilter = typeof req.query.status === 'string' && req.query.status !== 'ALL' ? req.query.status : null;

    const orderWhere: any = {};
    if (statusFilter) {
      const mapped = ADMIN_DELETABLE_ORDER_STATUSES.has(statusFilter) ? statusFilter : null;
      if (mapped) orderWhere.status = mapped;
    } else {
      orderWhere.status = { in: Array.from(ADMIN_DELETABLE_ORDER_STATUSES) };
    }

    const orders = await prisma.order.findMany({ where: orderWhere, select: { id: true } });
    const orderIds = orders.map((o) => o.id);

    const subWhere: any = {};
    if (statusFilter) {
      const mapped = ADMIN_DELETABLE_SUB_STATUSES.has(statusFilter) ? statusFilter : null;
      if (mapped) subWhere.status = mapped;
    } else {
      subWhere.status = { in: Array.from(ADMIN_DELETABLE_SUB_STATUSES) };
    }
    const payments = await prisma.subscriptionPayment.findMany({ where: subWhere, select: { id: true } });
    const linkedSubs = await prisma.subscription.findMany({ where: { paymentId: { in: payments.map((p) => p.id) } }, select: { paymentId: true } });
    const protectedIds = new Set(linkedSubs.map((s) => s.paymentId));
    const paymentIds = payments.map((p) => p.id).filter((id) => !protectedIds.has(id));

    if (orderIds.length > 0 || paymentIds.length > 0) {
      await prisma.$transaction([
        prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } }),
        prisma.paymentAttempt.deleteMany({ where: { orderId: { in: orderIds } } }),
        prisma.order.deleteMany({ where: { id: { in: orderIds } } }),
        prisma.subscriptionPayment.deleteMany({ where: { id: { in: paymentIds } } }),
      ]);
      await logAudit((req as any).user?.id ?? null, 'order.clear', 0, String(req.ip), {
        entityType: 'order',
        previousValue: { count: orderIds.length + paymentIds.length },
        newValue: { cleared: true },
        userAgent: req.get('user-agent') ?? undefined,
      });
    }

    res.json({ success: true, removed: orderIds.length + paymentIds.length });
  } catch (err) {
    console.error('Failed to clear orders:', err);
    res.status(500).json({ error: 'Failed to clear orders' });
  }
});

export default router;
