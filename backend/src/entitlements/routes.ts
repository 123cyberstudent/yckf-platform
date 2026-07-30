import { Router, Request, Response } from 'express';
import { verifyToken, AuthRequest } from '../auth/middleware.js';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const userId = user?.id;
    const role = user?.role;

    // Role-based premium (admin/investigator/volunteer)
    const roleBasedPremium = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'INVESTIGATOR' || role === 'VOLUNTEER';

    if (roleBasedPremium) {
      return res.json({
        premium: true,
        reason: 'admin',
        expiresAt: null,
        demoSessionActive: false,
        timeRemaining: null,
      });
    }

    // Check coupon redemptions for regular users
    if (userId) {
      const now = new Date();
      const activeRedemption = await prisma.couponRedemption.findFirst({
        where: {
          userId: userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
        orderBy: { expiresAt: 'desc' },
      });

      if (activeRedemption) {
        const timeRemaining = activeRedemption.expiresAt
          ? Math.floor((activeRedemption.expiresAt.getTime() - now.getTime()) / (1000 * 60))
          : null;

        return res.json({
          premium: true,
          reason: 'coupon',
          expiresAt: activeRedemption.expiresAt,
          demoSessionActive: false,
          timeRemaining,
        });
      }
    }

    // No premium access
    res.json({
      premium: false,
      reason: 'none',
      expiresAt: null,
      demoSessionActive: false,
      timeRemaining: null,
    });
  } catch (error) {
    console.error('Entitlements check error:', error);
    res.json({
      premium: false,
      reason: 'none',
      expiresAt: null,
      demoSessionActive: false,
      timeRemaining: null,
    });
  }
});

export default router;
