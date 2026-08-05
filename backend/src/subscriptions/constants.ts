/** Fixed YCKF Premium plan catalogue. Prices are in GHS pesewas and are
 * derived server-side ONLY — never from client input. */
export interface SubscriptionPlanDef {
  code: string;
  name: string;
  description: string;
  pricePesewas: number;
  currency: string;
  durationUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  durationValue: number;
  displayOrder: number;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanDef[] = [
  {
    code: 'monthly',
    name: 'Monthly',
    description: '1 month of YCKF Premium access.',
    pricePesewas: 50_00,
    currency: 'GHS',
    durationUnit: 'MONTH',
    durationValue: 1,
    displayOrder: 1,
  },
  {
    code: 'six_months',
    name: '6 Months',
    description: '6 months of YCKF Premium access.',
    pricePesewas: 250_00,
    currency: 'GHS',
    durationUnit: 'MONTH',
    durationValue: 6,
    displayOrder: 2,
  },
  {
    code: 'annual',
    name: 'Annual',
    description: '1 year of YCKF Premium access.',
    pricePesewas: 500_00,
    currency: 'GHS',
    durationUnit: 'YEAR',
    durationValue: 1,
    displayOrder: 3,
  },
];

export const PLAN_BY_CODE: Record<string, SubscriptionPlanDef> = Object.fromEntries(
  SUBSCRIPTION_PLANS.map((plan) => [plan.code, plan])
);

export const SUBSCRIPTION_STATUS = {
  INACTIVE: 'inactive',
  ACTIVE: 'active',
  TRIAL: 'trial',
  EXPIRED: 'expired',
} as const;

/** Premium benefit ledger benefitType values. */
export const PremiumBenefitType = {
  SIGNUP_TRIAL: 'signup_trial',
  FIRST_SUBSCRIPTION_BONUS: 'first_subscription_bonus',
  REFERRAL_REWARD: 'referral_reward',
  REFERRAL_SIGNUP: 'referral_signup',
  ADMIN_ADJUSTMENT: 'admin_adjustment',
  SUBSCRIPTION_PURCHASE: 'subscription_purchase',
} as const;

/** The 12-hour first subscription bonus and the 12-hour signup trial. */
export const TRIAL_DURATION_HOURS = 12;
export const FIRST_SUBSCRIPTION_BONUS_HOURS = 12;
export const REFERRAL_REWARD_HOURS = 1;
export const REFERRAL_REWARD_VALIDITY_YEARS = 1;

/** Free premium hours granted to a new account that signs up with a referral code. */
export const REFERRAL_SIGNUP_HOURS = 1;

/** Roles that are exempt from one-time benefits (trial + bonus). */
export const BENEFIT_EXEMPT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'INVESTIGATOR', 'VOLUNTEER'];

/** Placements a promotion can be surfaced at. */
export const PROMO_PLACEMENTS = ['signup', 'subscriptions'] as const;

/** Paystack channels allowed for subscription checkout (GHS). */
export const SUBSCRIPTION_CHANNELS = ['card', 'mobile_money', 'bank', 'bank_transfer'];

export const SUBSCRIPTION_PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;

export const SUBSCRIPTION_STATUS_VALUES = ['active', 'expired', 'cancelled', 'refunded'] as const;
