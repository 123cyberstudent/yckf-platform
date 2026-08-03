import { prisma } from '../shared/db.js';
import { isSignupPromoEnabled, isFirstSubscriptionPromoEnabled, isPremiumUser } from './service.js';
import { PremiumBenefitType } from './constants.js';

export interface PromoDefinition {
  key: string;
  title: string;
  message: string;
  ctaLabel: string;
  placement: 'signup' | 'subscriptions';
  kind: 'signup_trial' | 'first_subscription_bonus';
  durationHours: number;
}

/** Server-driven fixed promotions. Enable/disable and end dates are controlled
 *  via env (PROMO_SIGNUP_TRIAL_ENABLED, PROMO_SIGNUP_TRIAL_END,
 *  PROMO_FIRST_SUBSCRIPTION_ENABLED, PROMO_FIRST_SUBSCRIPTION_END). */
export const PROMOS: PromoDefinition[] = [
  {
    key: 'signup_trial',
    title: 'Try Premium free for 12 hours',
    message: 'Create your account and instantly unlock 12 hours of YCKF Premium at no cost.',
    ctaLabel: 'Sign up free',
    placement: 'signup',
    kind: 'signup_trial',
    durationHours: 12,
  },
  {
    key: 'first_subscription_bonus',
    title: 'Get 12 bonus hours on your first plan',
    message: 'Buy any Premium plan and receive 12 extra hours added to your subscription.',
    ctaLabel: 'View plans',
    placement: 'subscriptions',
    kind: 'first_subscription_bonus',
    durationHours: 12,
  },
];

export function getPromoByKey(key: string): PromoDefinition | undefined {
  return PROMOS.find((promo) => promo.key === key);
}

export function promoEnabled(promo: PromoDefinition): boolean {
  if (promo.kind === 'signup_trial') return isSignupPromoEnabled();
  return isFirstSubscriptionPromoEnabled();
}

function promoInWindow(kind: PromoDefinition['kind']): boolean {
  const endEnv = kind === 'signup_trial' ? process.env.PROMO_SIGNUP_TRIAL_END : process.env.PROMO_FIRST_SUBSCRIPTION_END;
  if (!endEnv) return true;
  const end = new Date(endEnv);
  if (Number.isNaN(end.getTime())) return true;
  return Date.now() <= end.getTime();
}

/**
 * GET /api/promotions/eligible?placement=&platform=
 * `placement` = signup (public, unauthenticated visitor) | subscriptions (authenticated).
 * Server decides whether the promo may be shown and supplies tracking hints.
 */
export async function getEligiblePromo(opts: {
  placement: string;
  platform?: string;
  userId?: number;
}): Promise<{ show: boolean; promo?: PromoDefinition; reason?: string; engagement?: unknown }> {
  if (opts.placement === 'signup') {
    const promo = getPromoByKey('signup_trial');
    if (!promo || !promoEnabled(promo) || !promoInWindow(promo.kind)) {
      return { show: false, reason: 'not_active' };
    }
    // Already-verified/premium users should not be offered the signup trial.
    if (opts.userId) {
      const user = await prisma.user.findUnique({ where: { id: opts.userId } });
      if (user) {
        if (isPremiumUser(user)) return { show: false, reason: 'already_premium' };
        const trial = await prisma.premiumBenefitLedger.findUnique({
          where: { userId_benefitType_sourceId: { userId: opts.userId, benefitType: PremiumBenefitType.SIGNUP_TRIAL, sourceId: 'signup-trial' } },
        });
        if (trial) return { show: false, reason: 'already_used' };
      }
    }
    return { show: true, promo };
  }

  if (opts.placement === 'subscriptions') {
    const promo = getPromoByKey('first_subscription_bonus');
    if (!promo || !promoEnabled(promo) || !promoInWindow(promo.kind)) {
      return { show: false, reason: 'not_active' };
    }
    if (!opts.userId) return { show: false, reason: 'requires_auth' };
    const user = await prisma.user.findUnique({ where: { id: opts.userId } });
    if (!user) return { show: false, reason: 'user_not_found' };
    if (isPremiumUser(user)) return { show: false, reason: 'already_premium' };
    // The bonus is only offered once — check any granted first-subscription bonus.
    const anyBonus = await prisma.premiumBenefitLedger.findFirst({
      where: { userId: opts.userId, benefitType: PremiumBenefitType.FIRST_SUBSCRIPTION_BONUS },
    });
    if (anyBonus) return { show: false, reason: 'already_used' };

    // Max once/day: if the promo was already shown within the last 24h, don't show again.
    const engagement = await prisma.promotionEngagement.findUnique({
      where: { userId_promoKey_placement: { userId: opts.userId, promoKey: promo.key, placement: opts.placement } },
    });
    if (engagement && engagement.lastSeenAt && Date.now() - engagement.lastSeenAt.getTime() < 24 * 60 * 60 * 1000) {
      return { show: false, reason: 'once_per_day' };
    }
    return { show: true, promo };
  }

  return { show: false, reason: 'unknown_placement' };
}

/** Record impression/dismiss/click for a promo (authenticated). */
export async function recordPromoEngagement(opts: {
  userId: number;
  promoKey: string;
  placement: string;
  action: 'impression' | 'dismiss' | 'click';
  platform?: string;
}): Promise<void> {
  const promo = getPromoByKey(opts.promoKey);
  if (!promo) return;

  const now = new Date();
  const existing = await prisma.promotionEngagement.findUnique({
    where: {
      userId_promoKey_placement: { userId: opts.userId, promoKey: opts.promoKey, placement: opts.placement },
    },
  });

  if (!existing) {
    await prisma.promotionEngagement.create({
      data: {
        userId: opts.userId,
        promoKey: opts.promoKey,
        placement: opts.placement,
        platform: opts.platform,
        seenCount: opts.action === 'impression' ? 1 : 0,
        lastSeenAt: opts.action === 'impression' ? now : now,
        dismissCount: opts.action === 'dismiss' ? 1 : 0,
        dismissedAt: opts.action === 'dismiss' ? now : null,
        clickCount: opts.action === 'click' ? 1 : 0,
        lastClickedAt: opts.action === 'click' ? now : null,
      },
    });
    return;
  }

  await prisma.promotionEngagement.update({
    where: { id: existing.id },
    data: {
      seenCount: opts.action === 'impression' ? { increment: 1 } : existing.seenCount,
      lastSeenAt: now,
      dismissCount: opts.action === 'dismiss' ? { increment: 1 } : existing.dismissCount,
      dismissedAt: opts.action === 'dismiss' ? now : existing.dismissedAt,
      clickCount: opts.action === 'click' ? { increment: 1 } : existing.clickCount,
      lastClickedAt: opts.action === 'click' ? now : existing.lastClickedAt,
    },
  });
}
