import { Router, Request, Response } from 'express';
import { verifyToken, isAdmin } from '../auth/middleware.js';
import { generalRateLimiter } from '../shared/rateLimiter.js';
import couponsRouter from './coupons.js';
import redemptionsRouter from './redemptions.js';
import demoRouter from './demo.js';

const router = Router();

router.use(verifyToken, isAdmin, generalRateLimiter);

router.get('/audit-logs', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  res.json({ logs: [], total: 0, limit });
});

router.use('/coupons', couponsRouter);
router.use('/redemptions', redemptionsRouter);
router.use('/demo', demoRouter);

export default router;
