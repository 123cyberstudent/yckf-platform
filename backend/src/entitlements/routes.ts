import { Router, Request, Response } from 'express';
import { verifyToken, AuthRequest } from '../auth/middleware.js';
import { PrismaClient } from '@prisma/client';
import { OrderStatus, OrderType, PREMIUM_SUBSCRIPTION_MONTHS } from '../payments/constants.js';

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

    // Source of truth: the User premium window (granted via the subscription
    // module — signup trial, first-subscription bonus, referral reward, or a
    // verified plan purchase).
    if (userId) {
      const account = await prisma.user.findUnique({ where: { id: userId } });
      const now = new Date();
      if (account?.premiumExpiresAt && account.premiumExpiresAt > now) {
        return res.json({
          premium: true,
          reason: 'subscription',
          expiresAt: account.premiumExpiresAt,
          demoSessionActive: false,
          timeRemaining: Math.floor((account.premiumExpiresAt.getTime() - now.getTime()) / (1000 * 60)),
        });
      }

      // Grace fallback for pre-existing PREMIUM_SUBSCRIPTION orders that were
      // fulfilled before the subscription module existed.
      if (!account?.premiumExpiresAt) {
        const legacy = await prisma.order.findFirst({
          where: {
            userId,
            orderType: OrderType.PREMIUM_SUBSCRIPTION,
            status: OrderStatus.FULFILLED,
            fulfilledAt: { not: null },
          },
          orderBy: { fulfilledAt: 'desc' },
          select: { metadata: true, fulfilledAt: true },
        });
        if (legacy?.fulfilledAt) {
          const months = (legacy.metadata as { subscriptionMonths?: number } | null)?.subscriptionMonths ?? PREMIUM_SUBSCRIPTION_MONTHS;
          const expiresAt = new Date(legacy.fulfilledAt.getTime() + months * 30 * 24 * 60 * 60 * 1000);
          if (expiresAt > now) {
            return res.json({
              premium: true,
              reason: 'subscription',
              expiresAt,
              demoSessionActive: false,
              timeRemaining: Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60)),
            });
          }
        }
      }
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
