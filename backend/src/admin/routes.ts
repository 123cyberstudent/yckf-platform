import { Router, Request, Response } from 'express';
import { verifyToken, isAdmin, AuthRequest } from '../auth/middleware.js';
import { generalRateLimiter } from '../shared/rateLimiter.js';
import couponsRouter from './coupons.js';
import ordersRouter from './orders.js';
import packagesRouter from './packages.js';
import promotionsRouter from './promotions.js';
import redemptionsRouter from './redemptions.js';
import demoRouter from './demo.js';
import { siteStatsAdminRouter } from './siteStats.js';
import loginLogsRouter from './loginLogs.js';
import volunteerStatsRouter from './volunteerStats.js';
import testSendRouter from './testSend.js';

const router = Router();

router.use('/volunteer-stats', verifyToken, (req: AuthRequest, res: Response, next) => {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}, volunteerStatsRouter);

router.use(verifyToken, isAdmin, generalRateLimiter);

router.get('/audit-logs', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  res.json({ logs: [], total: 0, limit });
});

router.use('/coupons', couponsRouter);
router.use('/orders', ordersRouter);
router.use('/packages', packagesRouter);
router.use('/promotions', promotionsRouter);
router.use('/redemptions', redemptionsRouter);
router.use('/demo', demoRouter);
router.use('/login-logs', loginLogsRouter);
router.use('/site-stats', siteStatsAdminRouter);
router.use('/test-send', testSendRouter);

export default router;
