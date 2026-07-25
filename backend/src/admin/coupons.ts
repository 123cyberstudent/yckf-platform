import { Router, Request, Response } from 'express';
import { verifyToken, isAdmin } from '../auth/middleware.js';
import { generalRateLimiter } from '../shared/rateLimiter.js';

const router = Router();

router.use(verifyToken, isAdmin, generalRateLimiter);

router.get('/', async (req: Request, res: Response) => {
  res.json({ coupons: [], total: 0 });
});

router.post('/create', async (req: Request, res: Response) => {
  const { code, description, discountPercent, maxUses, expiresAt } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'code is required' });
  }
  res.json({
    success: true,
    coupon: { id: Date.now().toString(), code, description, discountPercent, maxUses, expiresAt, isActive: true, createdAt: new Date().toISOString() },
  });
});

router.post('/deactivate', async (req: Request, res: Response) => {
  const { couponId } = req.body;
  if (!couponId) {
    return res.status(400).json({ error: 'couponId is required' });
  }
  res.json({ success: true, message: 'Coupon deactivated' });
});

router.post('/reactivate', async (req: Request, res: Response) => {
  const { couponId } = req.body;
  if (!couponId) {
    return res.status(400).json({ error: 'couponId is required' });
  }
  res.json({ success: true, message: 'Coupon reactivated' });
});

router.post('/delete', async (req: Request, res: Response) => {
  const { couponId } = req.body;
  if (!couponId) {
    return res.status(400).json({ error: 'couponId is required' });
  }
  res.json({ success: true, message: 'Coupon deleted' });
});

export default router;
