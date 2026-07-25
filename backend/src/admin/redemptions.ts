import { Router, Request, Response } from 'express';
import { verifyToken, isAdmin } from '../auth/middleware.js';
import { generalRateLimiter } from '../shared/rateLimiter.js';

const router = Router();

router.use(verifyToken, isAdmin, generalRateLimiter);

router.get('/', async (req: Request, res: Response) => {
  res.json({ redemptions: [], total: 0 });
});

export default router;
