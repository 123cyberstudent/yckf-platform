import { Router } from 'express';
import { AuthRequest, verifyToken } from '../auth/middleware.js';
import { generalRateLimiter } from '../shared/rateLimiter.js';
import { prisma } from '../shared/db.js';
import { OrderType } from './constants.js';
import { PaymentError } from './errors.js';
import {
  cancelOrder,
  createOrder,
  getOrderForUser,
  initializePaystackOrder,
  listOrdersForUser,
  listPaymentHistoryForUser,
} from './ordersService.js';

const router = Router();

router.use(verifyToken, generalRateLimiter);

function isOrderType(value: unknown): value is (typeof OrderType)[keyof typeof OrderType] {
  return value === OrderType.COURSE || value === OrderType.PREMIUM_SUBSCRIPTION;
}

/** POST /api/orders — server-priced order creation (quote + reserve). */
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { orderType, productId, promoCode, payWithCredits } = req.body ?? {};
    if (!isOrderType(orderType)) {
      return res.status(400).json({ success: false, error: 'orderType must be COURSE or PREMIUM_SUBSCRIPTION' });
    }
    if (payWithCredits) {
      return res.status(400).json({ success: false, error: 'Credits are no longer supported. Please use a subscription or course purchase.' });
    }
    if (orderType !== OrderType.PREMIUM_SUBSCRIPTION && !Number.isInteger(productId)) {
      return res.status(400).json({ success: false, error: 'productId is required' });
    }
    const order = await createOrder({
      userId: req.user!.id,
      orderType,
      productId,
      promoCode: typeof promoCode === 'string' ? promoCode : undefined,
      payWithCredits: Boolean(payWithCredits),
    });
    res.status(201).json({ success: true, order });
  } catch (err) {
    if (err instanceof PaymentError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message, details: err.details });
    }
    console.error('Failed to create order:', err);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

/** GET /api/orders — list my orders */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const orders = await listOrdersForUser(req.user!.id, limit);
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Failed to list orders:', err);
    res.status(500).json({ success: false, error: 'Failed to list orders' });
  }
});

/** GET /api/orders/history — unified payment history (orders + subscription payments). */
router.get('/history', async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const items = await listPaymentHistoryForUser(req.user!.id, limit);
    res.json({ success: true, items });
  } catch (err) {
    console.error('Failed to list payment history:', err);
    res.status(500).json({ success: false, error: 'Failed to list payment history' });
  }
});

/** Parse a unified history id ("order:12" | "subscription:7"). */
function parseHistoryId(id: string): { kind: 'order' | 'subscription'; numId: number } | null {
  const m = /^(order|subscription):(\d+)$/.exec(String(id || ''));
  if (!m) return null;
  return { kind: m[1] as 'order' | 'subscription', numId: Number(m[2]) };
}

const DELETABLE_ORDER_STATUSES = new Set(['CREATED', 'PENDING_PAYMENT', 'FAILED', 'CANCELLED', 'EXPIRED']);
const DELETABLE_SUB_STATUSES = new Set(['PENDING', 'FAILED', 'CANCELLED']);

/** Delete one of the caller's own non-paid history entries. Paid/fulfilled
 *  records are financial records and are never deleted. */
async function deleteHistoryEntry(userId: number, kind: 'order' | 'subscription', numId: number): Promise<{ ok: boolean; error?: string; status?: number }> {
  if (kind === 'order') {
    const order = await prisma.order.findFirst({ where: { id: numId, userId } });
    if (!order) return { ok: false, error: 'Order not found', status: 404 };
    if (!DELETABLE_ORDER_STATUSES.has(order.status)) {
      return { ok: false, error: 'Paid or fulfilled orders cannot be deleted', status: 409 };
    }
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId: order.id } }),
      prisma.paymentAttempt.deleteMany({ where: { orderId: order.id } }),
      prisma.order.delete({ where: { id: order.id } }),
    ]);
    return { ok: true };
  }
  const payment = await prisma.subscriptionPayment.findFirst({ where: { id: numId, userId } });
  if (!payment) return { ok: false, error: 'Payment not found', status: 404 };
  if (!DELETABLE_SUB_STATUSES.has(payment.status)) {
    return { ok: false, error: 'Completed subscription payments cannot be deleted', status: 409 };
  }
  const linked = await prisma.subscription.findFirst({ where: { paymentId: payment.id }, select: { id: true } });
  if (linked) return { ok: false, error: 'This payment is linked to an active subscription', status: 409 };
  await prisma.subscriptionPayment.delete({ where: { id: payment.id } });
  return { ok: true };
}

/** DELETE /api/orders/history/clear — remove all of the caller's unwanted
 *  (non-paid) history entries in one go. */
router.delete('/history/clear', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const [orders, payments] = await Promise.all([
      prisma.order.findMany({ where: { userId, status: { in: Array.from(DELETABLE_ORDER_STATUSES) } }, select: { id: true } }),
      prisma.subscriptionPayment.findMany({ where: { userId, status: { in: Array.from(DELETABLE_SUB_STATUSES) } }, select: { id: true } }),
    ]);
    const orderIds = orders.map((o) => o.id);
    const paymentIds = payments.map((p) => p.id);
    const linkedSubs = await prisma.subscription.findMany({ where: { paymentId: { in: paymentIds } }, select: { paymentId: true } });
    const protectedPaymentIds = new Set(linkedSubs.map((s) => s.paymentId));
    const deletablePaymentIds = paymentIds.filter((id) => !protectedPaymentIds.has(id));

    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } }),
      prisma.paymentAttempt.deleteMany({ where: { orderId: { in: orderIds } } }),
      prisma.order.deleteMany({ where: { id: { in: orderIds } } }),
      prisma.subscriptionPayment.deleteMany({ where: { id: { in: deletablePaymentIds } } }),
    ]);
    res.json({ success: true, removed: orderIds.length + deletablePaymentIds.length });
  } catch (err) {
    console.error('Failed to clear payment history:', err);
    res.status(500).json({ success: false, error: 'Failed to clear payment history' });
  }
});

/** DELETE /api/orders/history/:id — delete one history entry ("order:12" | "subscription:7"). */
router.delete('/history/:id', async (req: AuthRequest, res) => {
  try {
    const parsed = parseHistoryId(req.params.id);
    if (!parsed) return res.status(400).json({ success: false, error: 'Invalid history id' });
    const result = await deleteHistoryEntry(req.user!.id, parsed.kind, parsed.numId);
    if (!result.ok) return res.status(result.status ?? 500).json({ success: false, error: result.error });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete history entry:', err);
    res.status(500).json({ success: false, error: 'Failed to delete history entry' });
  }
});

/** GET /api/orders/:orderNumber — order detail + payment status */
router.get('/:orderNumber', async (req: AuthRequest, res) => {
  try {
    const order = await getOrderForUser(req.params.orderNumber, req.user!.id);
    res.json({ success: true, order });
  } catch (err) {
    if (err instanceof PaymentError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    console.error('Failed to get order:', err);
    res.status(500).json({ success: false, error: 'Failed to get order' });
  }
});

/** POST /api/orders/:orderNumber/pay — { method: 'paystack' } */
router.post('/:orderNumber/pay', async (req: AuthRequest, res) => {
  try {
    const method = req.body?.method;
    if (method === 'credits') {
      return res.status(400).json({ success: false, error: 'Credits are no longer supported. Please use a subscription or course purchase.' });
    }
    if (method === 'paystack') {
      const result = await initializePaystackOrder(req.params.orderNumber, req.user!.id);
      return res.json({
        success: true,
        order: result.order,
        payment: { provider: 'paystack', reference: result.reference, authorizationUrl: result.authorizationUrl, accessCode: result.accessCode },
      });
    }
    res.status(400).json({ success: false, error: "method must be 'paystack'" });
  } catch (err) {
    if (err instanceof PaymentError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message, details: err.details });
    }
    console.error('Failed to pay order:', err);
    res.status(500).json({ success: false, error: 'Failed to initialize payment' });
  }
});

/** POST /api/orders/:orderNumber/cancel — cancel an unpaid order */
router.post('/:orderNumber/cancel', async (req: AuthRequest, res) => {
  try {
    const order = await cancelOrder(req.params.orderNumber, req.user!.id);
    res.json({ success: true, order });
  } catch (err) {
    if (err instanceof PaymentError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    console.error('Failed to cancel order:', err);
    res.status(500).json({ success: false, error: 'Failed to cancel order' });
  }
});

export default router;
