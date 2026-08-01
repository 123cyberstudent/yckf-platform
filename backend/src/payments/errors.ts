export const PaymentErrorCode = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_FULFILLED: 'ALREADY_FULFILLED',
  ORDER_NOT_PAYABLE: 'ORDER_NOT_PAYABLE',
  ORDER_EXPIRED: 'ORDER_EXPIRED',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  PROMO_CODE_INVALID: 'PROMO_CODE_INVALID',
  PROMO_CODE_EXPIRED: 'PROMO_CODE_EXPIRED',
  PROMO_CODE_LIMIT_REACHED: 'PROMO_CODE_LIMIT_REACHED',
  PROMO_NOT_APPLICABLE: 'PROMO_NOT_APPLICABLE',
  PROMOTION_INACTIVE: 'PROMOTION_INACTIVE',
  SELF_REFERRAL: 'SELF_REFERRAL',
  PAYMENT_PROVIDER_ERROR: 'PAYMENT_PROVIDER_ERROR',
  WEBHOOK_INVALID: 'WEBHOOK_INVALID',
  WEBHOOK_SIGNATURE_INVALID: 'WEBHOOK_SIGNATURE_INVALID',
  CONFLICT: 'CONFLICT',
} as const;

export type PaymentErrorCodeValue = (typeof PaymentErrorCode)[keyof typeof PaymentErrorCode];

export class PaymentError extends Error {
  constructor(
    public readonly code: PaymentErrorCodeValue,
    message: string,
    public readonly status: number = 400,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}
