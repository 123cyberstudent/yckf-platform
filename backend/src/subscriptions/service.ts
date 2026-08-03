import crypto from 'crypto';
import { Prisma, User } from '@prisma/client';
import { prisma } from '../shared/db.js';
import { env } from '../config/env.js';
import { initializeTransaction, verifyTransaction } from '../payments/paystack.js';
import { PaymentError } from '../payments/errors.js';
import {
  PLAN_BY_CODE,
  SUBSCRIPTION_PLANS,
  TRIAL_DURATION_HOURS,
  FIRST_SUBSCRIPTION_BONUS_HOURS,
  REFERRAL_REWARD_HOURS,
  REFERRAL_REWARD_VALIDITY_YEARS,
  REFERRAL_SIGNUP_HOURS,
  BENEFIT_EXEMPT_ROLES,
  SUBSCRIPTION_CHANNELS,
  PremiumBenefitType,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_PAYMENT_STATUS,
} from './constants.js';

// ---------------------------------------------------------------------------
// Calendar-aware duration math
// ---------------------------------------------------------------------------

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setFullYear(result.getFullYear() + years);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

// ---------------------------------------------------------------------------
// Referral codes
// ---------------------------------------------------------------------------

const REFERRAL_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateReferralCode(): string {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += REFERRAL_ALPHABET[Math.floor(Math.random() * REFERRAL_ALPHABET.length)];
  }
  return `YCKF-${suffix}`;
}

/** Assign a unique referral code to a user, retrying on collision. */
export async function assignReferralCodeToUser(userId: number): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();
    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch (err) {
      const p2002 = (err as { code?: string })?.code === 'P2002';
      if (!p2002) throw err;
    }
  }
  console.error('[subscriptions] Failed to assign unique referral code for user', userId);
  return null;
}

const REFERRAL_CODE_REGEX = /^YCKF-[A-Z0-9]{6}$/;

export async function validateReferralCode(code: string): Promise<{ valid: boolean; ownerName?: string; message?: string }> {
  const normalized = String(code || '').trim().toUpperCase();
  if (!REFERRAL_CODE_REGEX.test(normalized)) {
    return { valid: false, message: 'Invalid referral code format' };
  }
  const owner = await prisma.user.findUnique({
    where: { referralCode: normalized },
    select: { id: true, fullName: true },
  });
  if (!owner) return { valid: false, message: 'Referral code not found' };
  return { valid: true, ownerName: owner.fullName };
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export async function ensurePlansSeeded(): Promise<void> {
  for (const def of SUBSCRIPTION_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { code: def.code },
      update: {
        name: def.name,
        description: def.description,
        pricePesewas: def.pricePesewas,
        durationUnit: def.durationUnit,
        durationValue: def.durationValue,
        displayOrder: def.displayOrder,
      },
      create: {
        code: def.code,
        name: def.name,
        description: def.description,
        pricePesewas: def.pricePesewas,
        currency: def.currency,
        durationUnit: def.durationUnit,
        durationValue: def.durationValue,
        active: true,
        displayOrder: def.displayOrder,
      },
    });
  }
}

export async function getActivePlans() {
  await ensurePlansSeeded();
  const plans = await prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
  });
  return plans.map((plan) => ({
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    priceGhs: plan.pricePesewas / 100,
    pricePesewas: plan.pricePesewas,
    currency: plan.currency,
    durationUnit: plan.durationUnit,
    durationValue: plan.durationValue,
  }));
}

// ---------------------------------------------------------------------------
// Premium status + benefit grants
// ---------------------------------------------------------------------------

export function isExemptRole(role: string): boolean {
  return BENEFIT_EXEMPT_ROLES.includes(role);
}

export function isPremiumUser(user: { role: string; premiumExpiresAt?: Date | null }): boolean {
  if (isExemptRole(user.role)) return true;
  return Boolean(user.premiumExpiresAt && user.premiumExpiresAt.getTime() > Date.now());
}

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Append `durationMinutes` of premium to the user's existing entitlement.
 *  Returns whether the grant was newly applied (idempotent via the ledger). */
export async function grantPremiumBenefit(
  client: DbClient,
  opts: { userId: number; benefitType: string; durationMinutes: number; sourceId?: string | null }
): Promise<{ granted: boolean; reason?: string; expiresAt?: Date }> {
  const { userId, benefitType, durationMinutes, sourceId } = opts;
  const user = await client.user.findUnique({ where: { id: userId } });
  if (!user) return { granted: false, reason: 'user_not_found' };
  if (isExemptRole(user.role)) return { granted: false, reason: 'role_exempt' };

  const now = new Date();
  const baseTime = user.premiumExpiresAt && user.premiumExpiresAt > now ? user.premiumExpiresAt : now;
  const newExpiresAt = new Date(baseTime.getTime() + durationMinutes * 60 * 1000);

  const ledgerCreate = client.premiumBenefitLedger.create({
    data: { userId, benefitType, durationMinutes, sourceId, grantedAt: now, expiresAt: newExpiresAt },
  });
  const userUpdate = client.user.update({
    where: { id: userId },
    data: {
      premiumStartsAt: user.premiumStartsAt ?? now,
      premiumExpiresAt: newExpiresAt,
      subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
    },
  });

  try {
    if ('$transaction' in client) {
      // Top-level call: run both writes atomically.
      await (client as typeof prisma).$transaction([ledgerCreate, userUpdate]);
    } else {
      // Already inside an interactive transaction: run sequentially.
      await ledgerCreate;
      await userUpdate;
    }
    return { granted: true, expiresAt: newExpiresAt };
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2002') {
      return { granted: false, reason: 'already_granted' };
    }
    throw err;
  }
}

export function isSignupPromoEnabled(): boolean {
  const envFlag = process.env.PROMO_SIGNUP_TRIAL_ENABLED;
  if (envFlag !== undefined && envFlag !== '') return envFlag !== 'false';
  return true;
}

export function isFirstSubscriptionPromoEnabled(): boolean {
  const envFlag = process.env.PROMO_FIRST_SUBSCRIPTION_ENABLED;
  if (envFlag !== undefined && envFlag !== '') return envFlag !== 'false';
  return true;
}

function promoInWindow(endEnv: string | undefined): boolean {
  if (!endEnv) return true;
  const end = new Date(endEnv);
  if (Number.isNaN(end.getTime())) return true;
  return Date.now() <= end.getTime();
}

/** Grant the 12-hour signup trial when an account is created (once). The
 *  benefit ledger makes it idempotent, so it is also safe to re-apply on
 *  email verification. */
export async function grantSignupTrial(userId: number): Promise<{ granted: boolean; reason?: string }> {
  if (!isSignupPromoEnabled()) return { granted: false, reason: 'promo_disabled' };
  if (!promoInWindow(process.env.PROMO_SIGNUP_TRIAL_END)) return { granted: false, reason: 'promo_expired' };
  return grantPremiumBenefit(prisma, {
    userId,
    benefitType: PremiumBenefitType.SIGNUP_TRIAL,
    durationMinutes: TRIAL_DURATION_HOURS * 60,
    sourceId: 'signup-trial',
  });
}

/** Grant the 12-hour first-subscription bonus (once, after first verified purchase). */
export async function grantFirstSubscriptionBonus(userId: number, paymentId: number): Promise<{ granted: boolean; reason?: string }> {
  if (!isFirstSubscriptionPromoEnabled()) return { granted: false, reason: 'promo_disabled' };
  if (!promoInWindow(process.env.PROMO_FIRST_SUBSCRIPTION_END)) return { granted: false, reason: 'promo_expired' };
  return grantPremiumBenefit(prisma, {
    userId,
    benefitType: PremiumBenefitType.FIRST_SUBSCRIPTION_BONUS,
    durationMinutes: FIRST_SUBSCRIPTION_BONUS_HOURS * 60,
    sourceId: `first-subscription:${paymentId}`,
  });
}

/** Grant 1 hour of free Premium to a new account that signed up using a
 *  referral code. Idempotent per referrer via the benefit ledger. */
export async function grantReferralSignupBonus(userId: number, referrerId: number): Promise<{ granted: boolean; reason?: string }> {
  return grantPremiumBenefit(prisma, {
    userId,
    benefitType: PremiumBenefitType.REFERRAL_SIGNUP,
    durationMinutes: REFERRAL_SIGNUP_HOURS * 60,
    sourceId: `referral-signup:${referrerId}`,
  });
}

// ---------------------------------------------------------------------------
// Subscription status
// ---------------------------------------------------------------------------

export async function getSubscriptionStatus(userId: number) {
  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new PaymentError('NOT_FOUND', 'User not found', 404);
  if (!user.referralCode) {
    await assignReferralCodeToUser(user.id);
    const refreshed = await prisma.user.findUnique({ where: { id: userId } });
    if (refreshed) user = refreshed;
  }
  const latest = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { plan: true },
  });
  const now = new Date();
  const hasPremiumWindow = Boolean(user.premiumExpiresAt && user.premiumExpiresAt > now);
  const status = isExemptRole(user.role)
    ? 'staff'
    : user.subscriptionStatus === SUBSCRIPTION_STATUS.ACTIVE && hasPremiumWindow
      ? SUBSCRIPTION_STATUS.ACTIVE
      : hasPremiumWindow
        ? user.subscriptionStatus
        : SUBSCRIPTION_STATUS.INACTIVE;

  return {
    isPremium: hasPremiumWindow,
    status,
    premiumStartsAt: user.premiumStartsAt,
    premiumExpiresAt: user.premiumExpiresAt,
    plan: latest
      ? { id: latest.plan.id, code: latest.plan.code, name: latest.plan.name, expiresAt: latest.expiresAt, subscriptionStatus: latest.status }
      : null,
    referralCode: user.referralCode,
    referredByUserId: user.referredByUserId,
  };
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export async function initializeSubscriptionPayment(opts: {
  userId: number;
  planCode: string;
  referralCode?: string;
  platform?: string;
}): Promise<{ authorizationUrl: string; reference: string; paymentId: number; plan: Record<string, unknown> }> {
  const planDef = PLAN_BY_CODE[opts.planCode];
  if (!planDef) throw new PaymentError('INVALID_REQUEST', 'Unknown plan code', 400);

  await ensurePlansSeeded();
  const dbPlan = await prisma.subscriptionPlan.findUnique({ where: { code: planDef.code } });
  if (!dbPlan || !dbPlan.active) throw new PaymentError('PROMOTION_INACTIVE', 'This plan is not currently available', 409);

  const user = await prisma.user.findUnique({ where: { id: opts.userId } });
  if (!user) throw new PaymentError('NOT_FOUND', 'User not found', 404);

  let referredUserId: number | null = null;
  if (opts.referralCode) {
    const owner = await prisma.user.findUnique({ where: { referralCode: String(opts.referralCode).trim().toUpperCase() } });
    if (!owner) throw new PaymentError('PROMO_CODE_INVALID', 'Invalid referral code', 404);
    if (owner.id === user.id) throw new PaymentError('SELF_REFERRAL', 'You cannot use your own referral code', 400);
    referredUserId = owner.id;
  }

  const reference = `YCKFSUB-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
  const idempotencyKey = crypto.randomUUID();
  const amountPesewas = dbPlan.pricePesewas;

  const payment = await prisma.subscriptionPayment.create({
    data: {
      userId: user.id,
      planId: dbPlan.id,
      providerReference: reference,
      idempotencyKey,
      amountPesewas,
      currency: 'GHS',
      status: SUBSCRIPTION_PAYMENT_STATUS.PENDING,
      referralCodeEntered: opts.referralCode ? String(opts.referralCode).trim().toUpperCase() : null,
      referredUserId,
      metadata: { planCode: dbPlan.code, platform: opts.platform ?? 'WEB' },
    },
  });

  let authorizationUrl: string;
  try {
    const init = await initializeTransaction({
      email: user.email,
      amount: amountPesewas,
      reference,
      callbackUrl: env.paystack.callbackUrl,
      channels: [...SUBSCRIPTION_CHANNELS],
      metadata: {
        product: 'premium_subscription',
        planCode: dbPlan.code,
        planName: dbPlan.name,
        userId: user.id,
        paymentId: payment.id,
      },
    });
    authorizationUrl = init.authorizationUrl;
  } catch (err) {
    await prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: { status: SUBSCRIPTION_PAYMENT_STATUS.FAILED },
    });
    throw err;
  }

  return {
    authorizationUrl,
    reference,
    paymentId: payment.id,
    plan: {
      code: dbPlan.code,
      name: dbPlan.name,
      priceGhs: dbPlan.pricePesewas / 100,
      pricePesewas: dbPlan.pricePesewas,
      currency: dbPlan.currency,
      durationUnit: dbPlan.durationUnit,
      durationValue: dbPlan.durationValue,
    },
  };
}

// ---------------------------------------------------------------------------
// Webhook fulfilment
// ---------------------------------------------------------------------------

/** Process a `charge.success` webhook reference against a subscription payment.
 *  Returns 'not_found' when the reference belongs to the legacy order flow. */
export async function handleSubscriptionChargeSuccess(reference: string): Promise<{ status: 'processed' | 'duplicate' | 'ignored' | 'not_found' }> {
  const payment = await prisma.subscriptionPayment.findUnique({
    where: { providerReference: reference },
    include: { user: true, plan: true },
  });
  if (!payment) return { status: 'not_found' };
  if (payment.status === SUBSCRIPTION_PAYMENT_STATUS.PAID) return { status: 'duplicate' };

  const verified = await verifyTransaction(reference);
  if (verified.status !== 'success') {
    await prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: { status: SUBSCRIPTION_PAYMENT_STATUS.FAILED, rawProviderStatus: verified.status },
    });
    return { status: 'ignored' };
  }

  if (verified.currency !== 'GHS' || verified.amount !== payment.amountPesewas) {
    await prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: { status: SUBSCRIPTION_PAYMENT_STATUS.FAILED, rawProviderStatus: `amount_mismatch_${verified.amount}` },
    });
    return { status: 'ignored' };
  }

  await fulfillSubscriptionPayment(payment, verified);
  return { status: 'processed' };
}

type PaymentWithRelations = NonNullable<Awaited<ReturnType<typeof prisma.subscriptionPayment.findUnique>>> & {
  user: User;
  plan: { code: string; name: string; durationUnit: string; durationValue: number };
};

async function fulfillSubscriptionPayment(
  payment: PaymentWithRelations,
  verified: { paidAt?: string; channel?: string }
): Promise<void> {
  const now = new Date();
  const baseTime = payment.user.premiumExpiresAt && payment.user.premiumExpiresAt > now ? payment.user.premiumExpiresAt : now;
  const expiresAt =
    payment.plan.durationUnit === 'YEAR'
      ? addYears(baseTime, payment.plan.durationValue)
      : addMonths(baseTime, payment.plan.durationValue);
  const durationMinutes =
    payment.plan.durationUnit === 'YEAR'
      ? payment.plan.durationValue * 365 * 24 * 60
      : payment.plan.durationValue * 30 * 24 * 60;

  await prisma.$transaction(async (tx) => {
    await tx.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: SUBSCRIPTION_PAYMENT_STATUS.PAID,
        paidAt: verified.paidAt ? new Date(verified.paidAt) : now,
        verifiedAt: now,
        channel: verified.channel ?? payment.channel,
        rawProviderStatus: 'success',
      },
    });

    await tx.subscription.create({
      data: {
        userId: payment.userId,
        planId: payment.planId,
        paymentId: payment.id,
        startsAt: baseTime,
        expiresAt,
        status: 'active',
      },
    });

    await tx.user.update({
      where: { id: payment.userId },
      data: {
        premiumStartsAt: payment.user.premiumStartsAt ?? baseTime,
        premiumExpiresAt: expiresAt,
        subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
        currentSubscriptionPlanId: payment.planId,
        ...(payment.referredUserId && !payment.user.referredByUserId ? { referredByUserId: payment.referredUserId } : {}),
      },
    });

    await tx.premiumBenefitLedger
      .create({
        data: {
          userId: payment.userId,
          benefitType: PremiumBenefitType.SUBSCRIPTION_PURCHASE,
          durationMinutes,
          sourceId: `payment:${payment.id}`,
          grantedAt: now,
          expiresAt,
        },
      })
      .catch(() => undefined);

    const priorPaidCount = await tx.subscriptionPayment.count({
      where: { userId: payment.userId, status: SUBSCRIPTION_PAYMENT_STATUS.PAID, id: { not: payment.id } },
    });

    // 12-hour first-subscription bonus — granted only for the FIRST verified
    // paid subscription and never to exempt roles.
    if (priorPaidCount === 0) {
      await grantPremiumBenefit(tx, {
        userId: payment.userId,
        benefitType: PremiumBenefitType.FIRST_SUBSCRIPTION_BONUS,
        durationMinutes: FIRST_SUBSCRIPTION_BONUS_HOURS * 60,
        sourceId: `first-subscription:${payment.id}`,
      });
    }

    // Referral: only the FIRST verified subscription of a referred account
    // rewards the code owner, and only once.
    if (payment.referredUserId && payment.referralCodeEntered) {
      const existing = await tx.referral.findUnique({
        where: {
          referrerUserId_referredUserId: {
            referrerUserId: payment.referredUserId,
            referredUserId: payment.userId,
          },
        },
      });
      if (!existing) {
        const referral = await tx.referral.create({
          data: {
            referrerUserId: payment.referredUserId,
            referredUserId: payment.userId,
            referralCode: payment.referralCodeEntered,
            subscriptionPaymentId: payment.id,
            rewardHours: REFERRAL_REWARD_HOURS,
            status: 'PENDING',
          },
        });
        if (priorPaidCount === 0) {
          const reward = await grantPremiumBenefit(tx, {
            userId: payment.referredUserId,
            benefitType: PremiumBenefitType.REFERRAL_REWARD,
            durationMinutes: REFERRAL_REWARD_HOURS * 60,
            sourceId: `referral:${referral.id}`,
          });
          if (reward.granted) {
            const rewardGrantedAt = now;
            const rewardExpiresAt = addYears(rewardGrantedAt, REFERRAL_REWARD_VALIDITY_YEARS);
            await tx.referral.update({
              where: { id: referral.id },
              data: { status: 'REWARDED', rewardGrantedAt, rewardExpiresAt },
            });
          } else {
            await tx.referral.update({
              where: { id: referral.id },
              data: { status: reward.reason === 'role_exempt' ? 'REVERSED' : 'PENDING' },
            });
          }
        }
      }
    }
  });
}
