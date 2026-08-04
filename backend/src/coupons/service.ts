import { prisma } from '../shared/db.js';
import { computeExpiry } from './duration.js';
import { logAudit } from '../audit/service.js';

export interface CouponValidationResult {
  valid: boolean;
  code?: string;
  message?: string;
  description?: string | null;
  discountPercent?: number | null;
  expiresAt?: Date | null;
  validFrom?: Date | null;
  accessDurationValue?: number;
  accessDurationUnit?: string;
}

/**
 * Single source of truth for coupon validation. Returns structured codes so
 * clients can render precise, localized errors (COUPON_INVALID, COUPON_INACTIVE,
 * COUPON_NOT_ACTIVE_YET, COUPON_EXPIRED, COUPON_USAGE_LIMIT_REACHED,
 * COUPON_ALREADY_USED, COUPON_VALID).
 */
export async function validateCoupon(code: string, userId: number | null): Promise<CouponValidationResult> {
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) {
    return { valid: false, code: 'COUPON_INVALID', message: 'Invalid coupon code', description: null };
  }
  if (!coupon.isActive || (coupon.status && coupon.status !== 'active')) {
    return { valid: false, code: 'COUPON_INACTIVE', message: 'This coupon is inactive', description: null };
  }
  if (coupon.validFrom && new Date(coupon.validFrom) > new Date()) {
    return { valid: false, code: 'COUPON_NOT_ACTIVE_YET', message: 'This coupon is not yet active', description: null };
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, code: 'COUPON_EXPIRED', message: 'This coupon has expired', description: null };
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, code: 'COUPON_USAGE_LIMIT_REACHED', message: 'This coupon has reached maximum uses', description: null };
  }
  if (userId) {
    const userRedemptions = await prisma.couponRedemption.count({ where: { couponId: coupon.id, userId } });
    const perUserLimit = coupon.perUserLimit ?? 1;
    if (userRedemptions >= perUserLimit) {
      return { valid: false, code: 'COUPON_ALREADY_USED', message: 'You have already redeemed this coupon', description: null };
    }
  }
  return {
    valid: true,
    code: 'COUPON_VALID',
    message: 'Coupon is valid',
    description: coupon.description,
    discountPercent: coupon.discountPercent,
    expiresAt: coupon.expiresAt,
    validFrom: coupon.validFrom,
    accessDurationValue: coupon.accessDurationValue ?? coupon.durationHours ?? 24,
    accessDurationUnit: coupon.accessDurationUnit ?? 'hours',
  };
}

export interface RedemptionResult {
  success: boolean;
  message: string;
  redemption?: {
    redeemedAt: string;
    expiresAt: string;
    accessDuration: number;
    accessDurationUnit: string;
  };
}

/**
 * Redeem a coupon: atomically create the redemption, bump usage, grant the
 * premium window on the user, and record a Subscription with source 'coupon'
 * so the subscription-status UI and entitlements both reflect coupon access.
 */
export async function redeemCoupon(code: string, userId: number, meta: { ip?: string; userAgent?: string } = {}): Promise<RedemptionResult> {
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) {
    return { success: false, message: 'COUPON_INVALID' };
  }

  const validation = await validateCoupon(code, userId);
  if (!validation.valid) {
    return { success: false, message: validation.code || 'INVALID' };
  }

  const durationValue = coupon.accessDurationValue ?? coupon.durationHours ?? 24;
  const durationUnit = (coupon.accessDurationUnit ?? 'hours') as 'hours' | 'days' | 'months';
  const now = new Date();
  const expiresAt = computeExpiry(now, durationValue, durationUnit);

  await prisma.$transaction(async (tx) => {
    await tx.couponRedemption.create({
      data: {
        couponId: coupon.id,
        userId,
        expiresAt,
        accessStartsAt: now,
        status: 'active',
      },
    });
    await tx.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });
    await tx.user.update({
      where: { id: userId },
      data: {
        premiumStartsAt: now,
        premiumExpiresAt: expiresAt,
        subscriptionStatus: 'active',
      },
    });
    await tx.subscription.create({
      data: {
        userId,
        planId: null,
        source: 'coupon',
        startsAt: now,
        expiresAt,
        status: 'active',
      },
    });
  });

  await logAudit(userId, 'coupon.redeem', coupon.id, meta.ip ?? '', {
    entityType: 'coupon',
    entityId: coupon.id,
    newValue: { expiresAt: expiresAt.toISOString(), accessDurationValue: durationValue, accessDurationUnit: durationUnit },
    userAgent: meta.userAgent ?? undefined,
  }).catch(() => {});

  return {
    success: true,
    message: 'Coupon redeemed successfully',
    redemption: {
      redeemedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      accessDuration: durationValue,
      accessDurationUnit: durationUnit,
    },
  };
}
