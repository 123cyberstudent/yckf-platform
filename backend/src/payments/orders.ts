import { Router } from 'express';
import { AuthRequest, verifyToken } from '../auth/middleware.js';
import { generalRateLimiter } from '../shared/rateLimiter.js';
import { OrderType } from './constants.js';
import { PaymentError } from './errors.js';
import {
  cancelOrder,
  createOrder,
  getOrderForUser,
  initializePaystackOrder,
  listOrdersForUser,
  payOrderWithCredits,
} from './ordersService.js';

const router = Router();

router.use(verifyToken, generalRateLimiter);

function isOrderType(value: unknown): value is (typeof OrderType)[keyof typeof OrderType] {
  return value === OrderType.COURSE || value === OrderType.CREDIT_PACKAGE || value === OrderType.PREMIUM_SUBSCRIPTION;
}

/** POST /api/orders — server-priced order creation (quote + reserve). */
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { orderType, productId, promoCode, payWithCredits } = req.body ?? {};
    if (!isOrderType(orderType)) {
      return res.status(400).json({ success: false, error: 'orderType must be COURSE, CREDIT_PACKAGE or PREMIUM_SUBSCRIPTION' });
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

/** POST /api/orders/:orderNumber/pay — { method: 'paystack' | 'credits' } */
router.post('/:orderNumber/pay', async (req: AuthRequest, res) => {
  try {
    const method = req.body?.method;
    if (method === 'credits') {
      const order = await payOrderWithCredits(req.params.orderNumber, req.user!.id);
      return res.json({ success: true, order, paidWith: 'credits' });
    }
    if (method === 'paystack') {
      const result = await initializePaystackOrder(req.params.orderNumber, req.user!.id);
      return res.json({
        success: true,
        order: result.order,
        payment: { provider: 'paystack', reference: result.reference, authorizationUrl: result.authorizationUrl, accessCode: result.accessCode },
      });
    }
    res.status(400).json({ success: false, error: "method must be 'paystack' or 'credits'" });
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
