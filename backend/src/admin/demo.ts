import { Router, Request, Response } from 'express';
import { verifyToken, isAdmin } from '../auth/middleware.js';
import { generalRateLimiter } from '../shared/rateLimiter.js';

const router = Router();

router.use(verifyToken, isAdmin, generalRateLimiter);

router.post('/activate', async (req: Request, res: Response) => {
  const { userId, durationHours } = req.body;
  res.json({
    success: true,
    message: 'Demo access activated',
    expiresAt: new Date(Date.now() + (durationHours || 24) * 3600000).toISOString(),
  });
});

router.post('/rotate-token', async (req: Request, res: Response) => {
  const token = Math.random().toString(36).substring(2, 15);
  res.json({ success: true, token });
});

router.get('/status', async (req: Request, res: Response) => {
  res.json({ active: false, expiresAt: null });
});

export default router;
