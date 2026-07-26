import { Router, Request, Response } from 'express';
import { verifyToken, AuthRequest } from '../auth/middleware.js';

const router = Router();

router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'INVESTIGATOR' || user?.role === 'VOLUNTEER';

  res.json({
    premium: isAdmin,
    reason: isAdmin ? 'admin' : 'none',
    expiresAt: null,
    demoSessionActive: false,
    timeRemaining: null,
  });
});

export default router;
