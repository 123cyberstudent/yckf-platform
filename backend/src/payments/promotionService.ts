import { Prisma, Promotion, PromoCode } from '@prisma/client';
import { prisma } from '../shared/db.js';
import {
  DiscountType,
  PromoCodeType,
  PromotionStatus,
  PromotionType,
  ReferralStatus,
} from './constants.js';
import { PaymentError, PaymentErrorCode } from './errors.js';
import { percentOf } from './money.js';

export function normalizeCode(raw: string): string {
  return (raw || '').trim().toUpperCase();
}

export interface DiscountQuoteContext {
  userId: number;
  orderType: string; // COURSE | CREDIT_PACKAGE
  subtotal: number; // minor units
  productIds: number[]; // course or package ids in the cart
  isFirstPurchase: boolean;
  now?: Date;
}

export interface DiscountResult {
  promotionId: number | null;
  promoCodeId: number | null;
  discountAmount: number;
  bonusCredits: number;
  code: string | null;
  label: string | null;
  message: string;
}

export function emptyDiscount(): DiscountResult {
  return { promotionId: null, promoCodeId: null, discountAmount: 0, bonusCredits: 0, code: null, label: null, message: 'No discount applied' };
}

function generateReferralCode(userId: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 5; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const part = userId.toString(36).toUpperCase();
  return (part + suffix).padEnd(8, 'X').slice(0, 8);
}

/** Get the user's own referral code, creating one deterministically if missing. */
export async function getOrCreateReferralCode(userId: number): Promise<PromoCode> {
  const existing = await prisma.promoCode.findFirst({
    where: { ownerUserId: userId, type: PromoCodeType.REFERRAL },
  });
  if (existing) return existing;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateReferralCode(userId);
    try {
      return await prisma.promoCode.create({
        data: {
          code,
          normalizedCode: code,
          type: PromoCodeType.REFERRAL,
          ownerUserId: userId,
          status: 'ACTIVE',
          maxRedemptionsPerUser: 1,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue;
      throw err;
    }
  }
  throw new PaymentError(PaymentErrorCode.CONFLICT, 'Could not generate a unique referral code');
}

/** Record that a new user registered through a referral code (self-referral ignored). */
export async function registerReferral(code: string | undefined, referredUserId: number): Promise<void> {
  if (!code) return;
  const normalized = normalizeCode(code);
  const promoCode = await prisma.promoCode.findUnique({ where: { normalizedCode: normalized } });
  if (!promoCode || promoCode.type !== PromoCodeType.REFERRAL || !promoCode.ownerUserId) return;
  if (promoCode.ownerUserId === referredUserId) return;

  const existing = await prisma.referralRelationship.findUnique({
    where: { referrerUserId_referredUserId: { referrerUserId: promoCode.ownerUserId, referredUserId } },
  });
  if (existing) return;

  await prisma.referralRelationship.create({
    data: {
      referrerUserId: promoCode.ownerUserId,
      referredUserId,
      referralCodeId: promoCode.id,
      status: ReferralStatus.PENDING,
    },
  });
}

async function evaluatePromotion(promotion: Promotion, promoCode: PromoCode, ctx: DiscountQuoteContext): Promise<DiscountResult> {
  const now = ctx.now ?? new Date();

  if (promotion.status !== PromotionStatus.ACTIVE) {
    throw new PaymentError(PaymentErrorCode.PROMOTION_INACTIVE, 'This promotion is not active');
  }
  if (promotion.startAt && promotion.startAt > now) {
    throw new PaymentError(PaymentErrorCode.PROMOTION_INACTIVE, 'This promotion has not started yet');
  }
  if (promotion.endAt && promotion.endAt < now) {
    throw new PaymentError(PaymentErrorCode.PROMO_CODE_EXPIRED, 'This promotion has ended');
  }
  if (promotion.totalRedemptionLimit != null && promotion.redemptionCount >= promotion.totalRedemptionLimit) {
    throw new PaymentError(PaymentErrorCode.PROMO_CODE_LIMIT_REACHED, 'This promotion has reached its usage limit');
  }
  if (promotion.perUserRedemptionLimit > 0) {
    const userUses = await prisma.promotionRedemption.count({
      where: { promotionId: promotion.id, userId: ctx.userId },
    });
    if (userUses >= promotion.perUserRedemptionLimit) {
      throw new PaymentError(PaymentErrorCode.PROMO_CODE_LIMIT_REACHED, 'You have already used this promotion');
    }
  }
  if (promotion.firstPurchaseOnly && !ctx.isFirstPurchase) {
    throw new PaymentError(PaymentErrorCode.PROMO_NOT_APPLICABLE, 'This promotion is only for your first purchase');
  }
  if (promotion.minimumPurchaseAmount > 0 && ctx.subtotal < promotion.minimumPurchaseAmount) {
    throw new PaymentError(PaymentErrorCode.PROMO_NOT_APPLICABLE, `Minimum purchase of GHS ${(promotion.minimumPurchaseAmount / 100).toFixed(2)} required`);
  }
  if (promotion.eligibleProductType && promotion.eligibleProductType !== ctx.orderType) {
    throw new PaymentError(PaymentErrorCode.PROMO_NOT_APPLICABLE, 'This promotion does not apply to this item');
  }
  if (promotion.eligibleCourseIds.length > 0 && !ctx.productIds.some((id) => promotion.eligibleCourseIds.includes(id))) {
    throw new PaymentError(PaymentErrorCode.PROMO_NOT_APPLICABLE, 'This promotion does not apply to this course');
  }
  if (promotion.eligiblePackageIds.length > 0 && !ctx.productIds.some((id) => promotion.eligiblePackageIds.includes(id))) {
    throw new PaymentError(PaymentErrorCode.PROMO_NOT_APPLICABLE, 'This promotion does not apply to this package');
  }

  let discountAmount = 0;
  switch (promotion.promotionType) {
    case PromotionType.PERCENTAGE_DISCOUNT:
      discountAmount = percentOf(ctx.subtotal, promotion.discountValue);
      break;
    case PromotionType.FIXED_DISCOUNT:
      discountAmount = Math.min(promotion.discountValue, ctx.subtotal);
      break;
    case PromotionType.FREE_COURSE: {
      const courses = await prisma.course.findMany({ where: { id: { in: ctx.productIds } } });
      discountAmount = courses
        .filter((c) => promotion.eligibleCourseIds.length === 0 || promotion.eligibleCourseIds.includes(c.id))
        .reduce((sum, c) => sum + c.price, 0);
      break;
    }
    default:
      break;
  }
  discountAmount = Math.min(discountAmount, ctx.subtotal);

  return {
    promotionId: promotion.id,
    promoCodeId: promoCode.id,
    discountAmount,
    bonusCredits: promotion.bonusCredits,
    code: promoCode.code,
    label: promotion.publicTitle ?? promotion.internalName,
    message: promotion.publicDescription ?? 'Promotion applied',
  };
}

/**
 * Resolve a promo/referral code against a quote. Returns the discount breakdown
 * or throws a PaymentError describing why the code cannot be used.
 */
export async function resolveDiscountForQuote(code: string | undefined, ctx: DiscountQuoteContext): Promise<DiscountResult> {
  if (!code) return emptyDiscount();
  const normalized = normalizeCode(code);
  const promoCode = await prisma.promoCode.findUnique({
    where: { normalizedCode: normalized },
    include: { promotion: true },
  });
  if (!promoCode) {
    throw new PaymentError(PaymentErrorCode.PROMO_CODE_INVALID, 'Invalid promo code', 404);
  }
  if (promoCode.status !== 'ACTIVE') {
    throw new PaymentError(PaymentErrorCode.PROMO_CODE_INVALID, 'This promo code is not active');
  }
  const now = ctx.now ?? new Date();
  if (promoCode.startAt && promoCode.startAt > now) {
    throw new PaymentError(PaymentErrorCode.PROMO_CODE_INVALID, 'This promo code is not yet valid');
  }
  if (promoCode.endAt && promoCode.endAt < now) {
    throw new PaymentError(PaymentErrorCode.PROMO_CODE_EXPIRED, 'This promo code has expired');
  }
  if (promoCode.maxRedemptions != null && promoCode.redemptionCount >= promoCode.maxRedemptions) {
    throw new PaymentError(PaymentErrorCode.PROMO_CODE_LIMIT_REACHED, 'This promo code has reached its usage limit');
  }

  if (promoCode.type === PromoCodeType.REFERRAL) {
    if (promoCode.ownerUserId === ctx.userId) {
      throw new PaymentError(PaymentErrorCode.SELF_REFERRAL, 'You cannot use your own referral code');
    }
    // Default referral benefit: 15% off the quote (stacked on the checkout).
    const discountAmount = Math.min(percentOf(ctx.subtotal, 15), ctx.subtotal);
    return {
      promotionId: null,
      promoCodeId: promoCode.id,
      discountAmount,
      bonusCredits: 0,
      code: promoCode.code,
      label: 'Friend referral',
      message: 'Referral discount applied',
    };
  }

  if (!promoCode.promotion) {
    throw new PaymentError(PaymentErrorCode.PROMO_CODE_INVALID, 'This promo code has no linked promotion');
  }
  return evaluatePromotion(promoCode.promotion, promoCode, ctx);
}

/** Active promotions for banner/modal display. */
export async function listActivePromotions(now: Date = new Date()) {
  return prisma.promotion.findMany({
    where: {
      status: PromotionStatus.ACTIVE,
      OR: [{ startAt: null }, { startAt: { lte: now } }],
      AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
    },
    orderBy: [{ priority: 'desc' }, { id: 'desc' }],
  });
}
