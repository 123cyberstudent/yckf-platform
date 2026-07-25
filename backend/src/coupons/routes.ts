import { Router, Request, Response } from 'express';
import { verifyToken } from '../auth/middleware.js';
import { generalRateLimiter } from '../shared/rateLimiter.js';

const router = Router();

router.use(verifyToken, generalRateLimiter);

router.get('/validate', async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'code query parameter is required' });
  }
  res.json({ valid: false, message: 'Coupon not found', description: null });
});

router.post('/redeem', async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'code is required' });
  }
  res.json({ success: false, message: 'Invalid coupon' });
});

export default router;
