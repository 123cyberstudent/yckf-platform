export const OrderType = {
  COURSE: 'COURSE',
  CREDIT_PACKAGE: 'CREDIT_PACKAGE',
  PREMIUM_SUBSCRIPTION: 'PREMIUM_SUBSCRIPTION',
} as const;
export type OrderTypeValue = (typeof OrderType)[keyof typeof OrderType];

export const OrderStatus = {
  CREATED: 'CREATED',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  FULFILLED: 'FULFILLED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;
export type OrderStatusValue = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentStatus = {
  CREATED: 'CREATED',
  INITIALIZED: 'INITIALIZED',
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESSFUL: 'SUCCESSFUL',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;
export type PaymentStatusValue = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const WalletTransactionType = {
  PURCHASE: 'PURCHASE',
  SIGNUP_BONUS: 'SIGNUP_BONUS',
  PROMOTION_BONUS: 'PROMOTION_BONUS',
  REFERRAL_BONUS: 'REFERRAL_BONUS',
  ADMIN_ADJUSTMENT: 'ADMIN_ADJUSTMENT',
  COURSE_PURCHASE: 'COURSE_PURCHASE',
  REFUND: 'REFUND',
  REVERSAL: 'REVERSAL',
  RESERVATION: 'RESERVATION',
  RESERVATION_RELEASE: 'RESERVATION_RELEASE',
  EXPIRATION: 'EXPIRATION',
} as const;
export type WalletTransactionTypeValue = (typeof WalletTransactionType)[keyof typeof WalletTransactionType];

export const PromotionType = {
  BONUS_CREDITS: 'BONUS_CREDITS',
  PERCENTAGE_DISCOUNT: 'PERCENTAGE_DISCOUNT',
  FIXED_DISCOUNT: 'FIXED_DISCOUNT',
  FREE_COURSE: 'FREE_COURSE',
  COURSE_BUNDLE: 'COURSE_BUNDLE',
  SIGNUP_REWARD: 'SIGNUP_REWARD',
  REFERRAL_REWARD: 'REFERRAL_REWARD',
} as const;
export type PromotionTypeValue = (typeof PromotionType)[keyof typeof PromotionType];

export const PromotionStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  EXPIRED: 'EXPIRED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type PromotionStatusValue = (typeof PromotionStatus)[keyof typeof PromotionStatus];

export const PromoCodeType = {
  PROMO: 'PROMO',
  REFERRAL: 'REFERRAL',
} as const;
export type PromoCodeTypeValue = (typeof PromoCodeType)[keyof typeof PromoCodeType];

export const DiscountType = {
  PERCENT: 'PERCENT',
  FIXED: 'FIXED',
} as const;
export type DiscountTypeValue = (typeof DiscountType)[keyof typeof DiscountType];

export const Currency = {
  GHS: 'GHS',
} as const;
export type CurrencyValue = (typeof Currency)[keyof typeof Currency];

export const EnrolmentSource = {
  PURCHASE: 'PURCHASE',
  CREDITS: 'CREDITS',
  PROMOTION: 'PROMOTION',
  REFERRAL: 'REFERRAL',
  ADMIN: 'ADMIN',
} as const;

export const EnrolmentStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  REVOKED: 'revoked',
} as const;

export const ReferralStatus = {
  PENDING: 'PENDING',
  QUALIFIED: 'QUALIFIED',
  REWARDED: 'REWARDED',
} as const;

export const WebhookProcessingStatus = {
  RECEIVED: 'RECEIVED',
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
  IGNORED: 'IGNORED',
  DUPLICATE: 'DUPLICATE',
} as const;

export const RefundStatus = {
  PENDING: 'PENDING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
} as const;

export const PaystackChannels = ['mobile_money_ghana', 'card'] as const;

export const PAYMENT_EXPIRY_MINUTES = 30;

export const DEFAULT_REFERRAL_REWARD_CREDITS = 50;
export const DEFAULT_SIGNUP_BONUS_CREDITS = 25;

/** YCKF Premium subscription pricing (GHS pesewas) and duration. */
export const PREMIUM_SUBSCRIPTION_PRICE_PESEWAS = 100_00; // GHS 100.00 / year
export const PREMIUM_SUBSCRIPTION_MONTHS = 12;
