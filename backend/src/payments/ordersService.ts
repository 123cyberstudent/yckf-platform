import crypto from 'crypto';
import { Order, OrderItem, PaymentAttempt } from '@prisma/client';
import { prisma } from '../shared/db.js';
import { env } from '../config/env.js';
import {
  DEFAULT_REFERRAL_REWARD_CREDITS,
  EnrolmentSource,
  OrderStatus,
  OrderType,
  PAYMENT_EXPIRY_MINUTES,
  PaystackChannels,
  PaymentStatus,
  PREMIUM_SUBSCRIPTION_MONTHS,
  PREMIUM_SUBSCRIPTION_PRICE_PESEWAS,
  PromoCodeType,
  ReferralStatus,
  WalletTransactionType,
} from './constants.js';
import { PaymentError, PaymentErrorCode } from './errors.js';
import { getWallet, recordCreditTransaction } from './walletService.js';
import { emptyDiscount, resolveDiscountForQuote, DiscountResult } from './promotionService.js';
import { initializeTransaction, verifyTransaction } from './paystack.js';
import { SUBSCRIPTION_PAYMENT_STATUS } from '../subscriptions/constants.js';

export interface CreateOrderInput {
  userId: number;
  orderType: (typeof OrderType)[keyof typeof OrderType];
  productId?: number;
  promoCode?: string;
  payWithCredits?: boolean;
}

export interface OrderSummary {
  id: number;
  orderNumber: string;
  orderType: string;
  status: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  expiresAt: string | null;
  items: { productType: string; productId: number; productName: string; unitPrice: number; totalPrice: number }[];
  appliedCode: string | null;
  promotionLabel: string | null;
  bonusCredits: number;
}

async function generateOrderNumber(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const count = await prisma.order.count();
    const candidate = `YCKF-ORD-${dateStr}-${(count + 1 + attempt).toString().padStart(6, '0')}`;
    const exists = await prisma.order.findUnique({ where: { orderNumber: candidate } });
    if (!exists) return candidate;
  }
  return `YCKF-ORD-${dateStr}-${Date.now().toString().slice(-6)}`;
}

interface OrderWithRelations extends Order {
  items: OrderItem[];
  appliedPromoCode?: { code: string; type: string; ownerUserId: number | null } | null;
  appliedPromotion?: { publicTitle: string | null; internalName: string; bonusCredits: number } | null;
}

function toSummary(order: OrderWithRelations): OrderSummary {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    subtotalAmount: order.subtotalAmount,
    discountAmount: order.discountAmount,
    totalAmount: order.totalAmount,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    expiresAt: order.expiresAt?.toISOString() ?? null,
    items: order.items.map((i) => ({
      productType: i.productType,
      productId: i.productId,
      productName: i.productName,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
    })),
    appliedCode: order.appliedPromoCode?.code ?? null,
    promotionLabel: order.appliedPromotion?.publicTitle ?? order.appliedPromotion?.internalName ?? null,
    bonusCredits: order.appliedPromotion?.bonusCredits ?? 0,
  };
}

async function loadOrder(orderNumber: string, userId: number) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      appliedPromotion: true,
      appliedPromoCode: true,
      paymentAttempts: { orderBy: { id: 'desc' } },
    },
  });
  if (!order || order.userId !== userId) {
    throw new PaymentError(PaymentErrorCode.NOT_FOUND, 'Order not found', 404);
  }
  return order;
}

function assertPayable(order: { status: string; expiresAt: Date | null; totalAmount: number }) {
  if (order.status !== OrderStatus.PENDING_PAYMENT && order.status !== OrderStatus.CREATED) {
    throw new PaymentError(PaymentErrorCode.ORDER_NOT_PAYABLE, 'This order cannot be paid', 409, { status: order.status });
  }
  if (order.expiresAt && order.expiresAt < new Date()) {
    throw new PaymentError(PaymentErrorCode.ORDER_EXPIRED, 'This order has expired', 410);
  }
}

async function isFirstPurchase(userId: number): Promise<boolean> {
  const count = await prisma.order.count({
    where: { userId, status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } },
  });
  return count === 0;
}

export async function createOrder(input: CreateOrderInput): Promise<OrderSummary> {
  let product: { id: number; name: string; unitPrice: number; creditPrice: number };
  let metadata: { payWithCredits: boolean } | { subscriptionMonths: number } = { payWithCredits: Boolean(input.payWithCredits) };

  if (input.orderType === OrderType.PREMIUM_SUBSCRIPTION) {
    if (input.payWithCredits) {
      throw new PaymentError(PaymentErrorCode.INVALID_REQUEST, 'Premium subscription must be paid with money');
    }
    product = {
      id: 0,
      name: 'YCKF Premium Subscription (1 Year)',
      unitPrice: PREMIUM_SUBSCRIPTION_PRICE_PESEWAS,
      creditPrice: 0,
    };
    metadata = { subscriptionMonths: PREMIUM_SUBSCRIPTION_MONTHS };
  } else if (input.orderType === OrderType.COURSE) {
    const course = await prisma.course.findUnique({ where: { id: input.productId } });
    if (!course || !course.active) {
      throw new PaymentError(PaymentErrorCode.NOT_FOUND, 'Course not found', 404);
    }
    const unitPrice = input.payWithCredits && course.creditsPrice > 0 ? course.creditsPrice : course.price;
    product = { id: course.id, name: course.title, unitPrice, creditPrice: course.creditsPrice };
  } else if (input.orderType === OrderType.CREDIT_PACKAGE) {
    if (input.payWithCredits) {
      throw new PaymentError(PaymentErrorCode.INVALID_REQUEST, 'Credit packages must be paid with money');
    }
    const pkg = await prisma.creditPackage.findUnique({ where: { id: input.productId } });
    if (!pkg || !pkg.active) {
      throw new PaymentError(PaymentErrorCode.NOT_FOUND, 'Credit package not found', 404);
    }
    product = { id: pkg.id, name: pkg.name, unitPrice: pkg.price, creditPrice: 0 };
  } else {
    throw new PaymentError(PaymentErrorCode.INVALID_REQUEST, 'Unknown order type');
  }

  if (input.payWithCredits && input.orderType === OrderType.COURSE && product.creditPrice <= 0) {
    throw new PaymentError(PaymentErrorCode.INVALID_REQUEST, 'This course cannot be purchased with credits');
  }

  const subtotal = product.unitPrice;
  // Premium subscriptions are fixed-price (no promos / referral discounts).
  const discount: DiscountResult = input.orderType === OrderType.PREMIUM_SUBSCRIPTION
    ? emptyDiscount()
    : subtotal > 0
      ? await resolveDiscountForQuote(input.promoCode, {
          userId: input.userId,
          orderType: input.orderType,
          subtotal,
          productIds: [input.productId!],
          isFirstPurchase: await isFirstPurchase(input.userId),
        })
      : emptyDiscount();

  const total = Math.max(0, subtotal - discount.discountAmount);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PAYMENT_EXPIRY_MINUTES * 60 * 1000);

  const order = await prisma.order.create({
    data: {
      orderNumber: await generateOrderNumber(),
      userId: input.userId,
      orderType: input.orderType,
      status: OrderStatus.PENDING_PAYMENT,
      currency: 'GHS',
      subtotalAmount: subtotal,
      discountAmount: discount.discountAmount,
      taxAmount: 0,
      totalAmount: total,
      appliedPromotionId: discount.promotionId,
      appliedPromoCodeId: discount.promoCodeId,
      expiresAt,
      metadata,
      items: {
        create: [{
          productType: input.orderType,
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.unitPrice,
          totalPrice: product.unitPrice,
        }],
      },
    },
    include: { items: true, appliedPromoCode: true, appliedPromotion: true },
  });

  // Free orders (GHS 0) are granted immediately; no payment step required.
  if (total === 0) {
    const fulfilled = await fulfilOrder(order.id, null);
    return toSummary(fulfilled.order);
  }

  return toSummary(order);
}

export async function getOrderForUser(orderNumber: string, userId: number): Promise<OrderSummary> {
  const order = await loadOrder(orderNumber, userId);
  return toSummary(order);
}

export async function listOrdersForUser(userId: number, limit = 50) {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { id: 'desc' },
    take: Math.min(limit, 100),
    include: {
      items: true,
      appliedPromoCode: true,
      appliedPromotion: true,
      paymentAttempts: { orderBy: { id: 'desc' }, take: 1 },
    },
  });
  return orders.map((o) => ({
    ...toSummary(o),
    paymentStatus: o.paymentAttempts[0]?.status ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Unified payment history (legacy orders + subscription payments)
// ---------------------------------------------------------------------------

export type HistoryStatus = 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled' | 'expired' | 'refunded';

export interface PaymentHistoryItem {
  id: string;
  reference: string;
  kind: 'order' | 'subscription';
  orderType: string | null;
  status: HistoryStatus;
  amountPesewas: number;
  currency: string;
  productName: string;
  planCode: string | null;
  createdAt: string;
  paidAt: string | null;
}

function standardizeOrderStatus(status: string): HistoryStatus {
  switch (status) {
    case OrderStatus.CREATED:
    case OrderStatus.PENDING_PAYMENT:
      return 'pending';
    case OrderStatus.PAID:
    case OrderStatus.FULFILLED:
      return 'successful';
    case OrderStatus.FAILED:
      return 'failed';
    case OrderStatus.CANCELLED:
      return 'cancelled';
    case OrderStatus.EXPIRED:
      return 'expired';
    case OrderStatus.REFUNDED:
    case OrderStatus.PARTIALLY_REFUNDED:
      return 'refunded';
    default:
      return 'pending';
  }
}

function standardizeSubscriptionPaymentStatus(status: string): HistoryStatus {
  switch (status) {
    case SUBSCRIPTION_PAYMENT_STATUS.PAID:
      return 'successful';
    case SUBSCRIPTION_PAYMENT_STATUS.FAILED:
      return 'failed';
    case SUBSCRIPTION_PAYMENT_STATUS.CANCELLED:
      return 'cancelled';
    case SUBSCRIPTION_PAYMENT_STATUS.REFUNDED:
      return 'refunded';
    default:
      return 'pending';
  }
}

export async function listPaymentHistoryForUser(userId: number, limit = 50): Promise<PaymentHistoryItem[]> {
  const take = Math.min(limit, 100);
  const [orders, subscriptionPayments] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
      take,
      include: { items: true, paymentAttempts: { orderBy: { id: 'desc' }, take: 1 } },
    }),
    prisma.subscriptionPayment.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
      take,
      include: { plan: true },
    }),
  ]);

  const items: PaymentHistoryItem[] = [
    ...orders.map((o) => ({
      id: `order:${o.id}`,
      reference: o.orderNumber,
      kind: 'order' as const,
      orderType: o.orderType,
      status: standardizeOrderStatus(o.status),
      amountPesewas: o.totalAmount,
      currency: o.currency,
      productName: o.items.map((i) => i.productName).join(', ') || 'Order',
      planCode: null,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
    })),
    ...subscriptionPayments.map((p) => ({
      id: `subscription:${p.id}`,
      reference: p.providerReference,
      kind: 'subscription' as const,
      orderType: 'PREMIUM_SUBSCRIPTION',
      status: standardizeSubscriptionPaymentStatus(p.status),
      amountPesewas: p.amountPesewas,
      currency: p.currency,
      productName: `YCKF Premium (${p.plan?.name ?? 'Subscription'})`,
      planCode: p.plan?.code ?? null,
      createdAt: p.createdAt.toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
    })),
  ];

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items.slice(0, take);
}

export async function payOrderWithCredits(orderNumber: string, userId: number): Promise<OrderSummary> {
  const order = await loadOrder(orderNumber, userId);
  assertPayable(order);
  if (order.orderType !== OrderType.COURSE) {
    throw new PaymentError(PaymentErrorCode.INVALID_REQUEST, 'Credits can only pay for course orders');
  }
  // Only orders priced in credits (payWithCredits=true at creation) may be
  // paid with credits. Otherwise the GHS price could be spent as credits.
  const metadata = (order.metadata ?? {}) as { payWithCredits?: boolean };
  if (!metadata.payWithCredits) {
    throw new PaymentError(
      PaymentErrorCode.INVALID_REQUEST,
      'This order is priced in Ghana cedis and cannot be paid with credits. Create the order with "Pay with credits" selected.'
    );
  }

  const wallet = await getWallet(userId);
  if (wallet.availableBalance < order.totalAmount) {
    throw new PaymentError(
      PaymentErrorCode.INSUFFICIENT_CREDITS,
      'Insufficient credit balance',
      409,
      { availableBalance: wallet.availableBalance, required: order.totalAmount }
    );
  }

  const payment = await prisma.$transaction(async (tx) => {
    // Debit the wallet only once per order.
    const existingLedger = await tx.creditLedgerEntry.findUnique({
      where: { idempotencyKey: `credit-pay-${order.id}` },
    });
    if (!existingLedger) {
      const current = await tx.creditWallet.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
      const balanceAfter = current.availableBalance - order.totalAmount;
      if (balanceAfter < 0) {
        throw new PaymentError(PaymentErrorCode.INSUFFICIENT_CREDITS, 'Insufficient credit balance', 409);
      }
      await tx.creditLedgerEntry.create({
        data: {
          walletId: current.id,
          userId,
          type: WalletTransactionType.COURSE_PURCHASE,
          amount: -order.totalAmount,
          balanceBefore: current.availableBalance,
          balanceAfter,
          description: `Course purchase (${order.orderNumber})`,
          idempotencyKey: `credit-pay-${order.id}`,
          sourceType: 'ORDER',
          sourceId: order.id,
        },
      });
      await tx.creditWallet.update({
        where: { id: current.id },
        data: { availableBalance: balanceAfter, lifetimeSpent: { increment: order.totalAmount } },
      });
    }

    const existingPayment = await tx.paymentAttempt.findUnique({
      where: { idempotencyKey: `credit-pay-attempt-${order.id}` },
    });
    if (existingPayment) return existingPayment;

    return tx.paymentAttempt.create({
      data: {
        orderId: order.id,
        userId,
        provider: 'credits',
        providerReference: order.orderNumber,
        idempotencyKey: `credit-pay-attempt-${order.id}`,
        status: PaymentStatus.PENDING,
        amount: order.totalAmount,
      },
    });
  });

  try {
    const fulfilled = await fulfilOrder(order.id, payment.id);
    await prisma.paymentAttempt.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.SUCCESSFUL, paidAt: new Date() },
    });
    return toSummary(fulfilled.order);
  } catch (err) {
    // Compensate the debit so a failed fulfilment never costs the user credits.
    await recordCreditTransaction({
      userId,
      type: WalletTransactionType.REVERSAL,
      amount: order.totalAmount,
      idempotencyKey: `credit-pay-reverse-${order.id}`,
      description: `Reversal for failed credit purchase (${order.orderNumber})`,
      sourceType: 'ORDER',
      sourceId: order.id,
    }).catch(() => undefined);
    await prisma.paymentAttempt.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        failureMessage: err instanceof Error ? err.message : 'Fulfilment failed',
        failedAt: new Date(),
      },
    }).catch(() => undefined);
    throw err;
  }
}

export async function initializePaystackOrder(orderNumber: string, userId: number): Promise<{
  authorizationUrl: string;
  accessCode: string;
  reference: string;
  order: OrderSummary;
}> {
  const order = await loadOrder(orderNumber, userId);
  assertPayable(order);
  if (order.totalAmount <= 0) {
    throw new PaymentError(PaymentErrorCode.ORDER_NOT_PAYABLE, 'This order has nothing to pay');
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // Reuse an existing initialized attempt so retries don't create duplicate sessions.
  const existingAttempt = order.paymentAttempts.find((a) => a.provider === 'paystack' && a.status === PaymentStatus.INITIALIZED);
  if (existingAttempt?.providerResponse) {
    const providerResponse = existingAttempt.providerResponse as { authorization_url?: string; access_code?: string };
    return {
      authorizationUrl: providerResponse.authorization_url ?? '',
      accessCode: providerResponse.access_code ?? '',
      reference: existingAttempt.providerReference,
      order: toSummary(order),
    };
  }

  const reference = `YCKF-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  const attempt = await prisma.paymentAttempt.create({
    data: {
      orderId: order.id,
      userId,
      provider: 'paystack',
      providerReference: reference,
      idempotencyKey: `paystack-attempt-${order.id}-${reference}`,
      status: PaymentStatus.CREATED,
      amount: order.totalAmount,
    },
  });

  try {
    const init = await initializeTransaction({
      email: user.email,
      amount: order.totalAmount,
      reference,
      callbackUrl: env.paystack.callbackUrl,
      channels: [...PaystackChannels],
      metadata: { orderNumber: order.orderNumber, userId },
    });
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: PaymentStatus.INITIALIZED,
        providerResponse: { authorization_url: init.authorizationUrl, access_code: init.accessCode },
        initializedAt: new Date(),
      },
    });
    return { authorizationUrl: init.authorizationUrl, accessCode: init.accessCode, reference, order: toSummary(order) };
  } catch (err) {
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: PaymentStatus.FAILED, failureMessage: err instanceof Error ? err.message : 'Initialization failed', failedAt: new Date() },
    });
    throw err;
  }
}

export async function cancelOrder(orderNumber: string, userId: number): Promise<OrderSummary> {
  const order = await loadOrder(orderNumber, userId);
  if (order.status === OrderStatus.PAID || order.status === OrderStatus.FULFILLED) {
    throw new PaymentError(PaymentErrorCode.ORDER_NOT_PAYABLE, 'Paid orders cannot be cancelled', 409);
  }
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() },
    include: { items: true, appliedPromoCode: true, appliedPromotion: true },
  });
  return toSummary(updated);
}

interface FulfilmentOutcome {
  alreadyFulfilled: boolean;
  order: OrderWithRelations;
}

/**
 * Grant everything the order entitles: course enrolments, credit package
 * credits, promotion bonus credits, referral rewards. Idempotent by design:
 * every grant is keyed by a deterministic idempotency key and the order is
 * only ever transitioned PENDING_PAYMENT/CREATED -> PAID -> FULFILLED once.
 */
export async function fulfilOrder(orderId: number, paymentId: number | null): Promise<FulfilmentOutcome> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true, appliedPromotion: true, appliedPromoCode: true },
  });
  if (order.status === OrderStatus.FULFILLED) {
    return { alreadyFulfilled: true, order };
  }
  if (order.status !== OrderStatus.PENDING_PAYMENT && order.status !== OrderStatus.CREATED && order.status !== OrderStatus.PAID) {
    throw new PaymentError(PaymentErrorCode.ORDER_NOT_PAYABLE, 'Order is not in a fulfilable state', 409, { status: order.status });
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: { in: [OrderStatus.PENDING_PAYMENT, OrderStatus.CREATED, OrderStatus.PAID] } },
      data: { status: OrderStatus.PAID, paidAt: now },
    });
    if (claimed.count === 0) return;

    const userId = order.userId;

    for (const item of order.items) {
      if (item.productType === OrderType.COURSE) {
        const existing = await tx.courseEnrolment.findUnique({
          where: { userId_courseId: { userId, courseId: item.productId } },
        });
        if (!existing) {
          await tx.courseEnrolment.create({
            data: {
              userId,
              courseId: item.productId,
              source: order.metadata && (order.metadata as { payWithCredits?: boolean }).payWithCredits
                ? EnrolmentSource.CREDITS
                : EnrolmentSource.PURCHASE,
              status: 'active',
              orderId: order.id,
              paymentId,
              grantedAt: now,
            },
          });
        }
      } else if (item.productType === OrderType.CREDIT_PACKAGE) {
        const ledgerKey = `credit-pkg-${order.id}-${item.productId}`;
        const existingLedger = await tx.creditLedgerEntry.findUnique({ where: { idempotencyKey: ledgerKey } });
        if (!existingLedger) {
          const pkg = await tx.creditPackage.findUniqueOrThrow({ where: { id: item.productId } });
          const grant = pkg.baseCredits + pkg.bonusCredits;
          const wallet = await tx.creditWallet.upsert({ where: { userId }, create: { userId }, update: {} });
          const balanceAfter = wallet.availableBalance + grant;
          await tx.creditLedgerEntry.create({
            data: {
              walletId: wallet.id,
              userId,
              type: WalletTransactionType.PURCHASE,
              amount: grant,
              balanceBefore: wallet.availableBalance,
              balanceAfter,
              description: `${pkg.name} credit package (${order.orderNumber})`,
              idempotencyKey: ledgerKey,
              sourceType: 'ORDER',
              sourceId: order.id,
            },
          });
          await tx.creditWallet.update({
            where: { id: wallet.id },
            data: { availableBalance: balanceAfter, lifetimePurchased: { increment: grant } },
          });
        }
      }
    }

    if (order.appliedPromotionId && order.appliedPromotion) {
      const redemptionKey = `promo-redemption-${order.id}`;
      const existingRedemption = await tx.promotionRedemption.findUnique({ where: { idempotencyKey: redemptionKey } });
      if (!existingRedemption) {
        await tx.promotionRedemption.create({
          data: {
            promotionId: order.appliedPromotionId,
            userId,
            orderId: order.id,
            paymentId,
            discountAmount: order.discountAmount,
            bonusCredits: order.appliedPromotion.bonusCredits,
            idempotencyKey: redemptionKey,
            redeemedAt: now,
          },
        });
        await tx.promotion.update({
          where: { id: order.appliedPromotionId },
          data: { redemptionCount: { increment: 1 } },
        });
        if (order.appliedPromoCodeId) {
          await tx.promoCode.update({
            where: { id: order.appliedPromoCodeId },
            data: { redemptionCount: { increment: 1 } },
          });
        }

        const bonus = order.appliedPromotion.bonusCredits;
        if (bonus > 0) {
          const bonusKey = `promo-bonus-${order.id}`;
          const existingBonus = await tx.creditLedgerEntry.findUnique({ where: { idempotencyKey: bonusKey } });
          if (!existingBonus) {
            const wallet = await tx.creditWallet.upsert({ where: { userId }, create: { userId }, update: {} });
            const balanceAfter = wallet.availableBalance + bonus;
            await tx.creditLedgerEntry.create({
              data: {
                walletId: wallet.id,
                userId,
                type: WalletTransactionType.PROMOTION_BONUS,
                amount: bonus,
                balanceBefore: wallet.availableBalance,
                balanceAfter,
                description: `Promotion bonus (${order.appliedPromotion.publicTitle ?? order.appliedPromotion.internalName})`,
                idempotencyKey: bonusKey,
                sourceType: 'PROMOTION',
                sourceId: order.appliedPromotionId,
              },
            });
            await tx.creditWallet.update({
              where: { id: wallet.id },
              data: { availableBalance: balanceAfter, lifetimeBonus: { increment: bonus } },
            });
          }
        }
      }
    }

    if (order.appliedPromoCode && order.appliedPromoCode.type === PromoCodeType.REFERRAL && order.appliedPromoCode.ownerUserId && order.appliedPromoCode.ownerUserId !== userId) {
      const ownerUserId = order.appliedPromoCode.ownerUserId;
      const rel = await tx.referralRelationship.findUnique({
        where: { referrerUserId_referredUserId: { referrerUserId: ownerUserId, referredUserId: userId } },
      });
      if (rel && rel.status === ReferralStatus.PENDING) {
        const bonusKey = `referral-bonus-${rel.id}`;
        const existingBonus = await tx.creditLedgerEntry.findUnique({ where: { idempotencyKey: bonusKey } });
        if (!existingBonus) {
          const wallet = await tx.creditWallet.upsert({ where: { userId: ownerUserId }, create: { userId: ownerUserId }, update: {} });
          const balanceAfter = wallet.availableBalance + DEFAULT_REFERRAL_REWARD_CREDITS;
          await tx.creditLedgerEntry.create({
            data: {
              walletId: wallet.id,
              userId: ownerUserId,
              type: WalletTransactionType.REFERRAL_BONUS,
              amount: DEFAULT_REFERRAL_REWARD_CREDITS,
              balanceBefore: wallet.availableBalance,
              balanceAfter,
              description: `Referral reward for ${order.appliedPromoCode.code}`,
              idempotencyKey: bonusKey,
              sourceType: 'REFERRAL',
              sourceId: rel.id,
            },
          });
          await tx.creditWallet.update({
            where: { id: wallet.id },
            data: { availableBalance: balanceAfter, lifetimeBonus: { increment: DEFAULT_REFERRAL_REWARD_CREDITS } },
          });
          await tx.referralRelationship.update({
            where: { id: rel.id },
            data: {
              status: ReferralStatus.REWARDED,
              rewardCredits: DEFAULT_REFERRAL_REWARD_CREDITS,
              qualifyingOrderId: order.id,
              qualifyingPaymentId: paymentId,
              rewardedAt: now,
            },
          });
        }
      }
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.FULFILLED, fulfilledAt: now },
    });
  });

  const fresh = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { items: true, appliedPromotion: true, appliedPromoCode: true },
  });
  return { alreadyFulfilled: false, order: fresh };
}

/**
 * Handle a Paystack charge.success webhook for a transaction reference.
 * Verifies with the provider API, marks the attempt successful and fulfils
 * the order exactly once.
 */
export async function handleChargeSuccess(reference: string): Promise<{ status: string; orderNumber?: string }> {
  const payment = await prisma.paymentAttempt.findUnique({
    where: { providerReference: reference },
  });
  if (!payment) {
    return { status: 'ignored' };
  }
  if (payment.status === PaymentStatus.SUCCESSFUL) {
    const order = await prisma.order.findUnique({ where: { id: payment.orderId }, select: { orderNumber: true } });
    return { status: 'already_processed', orderNumber: order?.orderNumber };
  }

  const verified = await verifyTransaction(reference);
  if (verified.status !== 'success') {
    await prisma.paymentAttempt.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        failureCode: `provider:${verified.status}`,
        failureMessage: `Transaction verification returned ${verified.status}`,
        channel: verified.channel,
        failedAt: new Date(),
      },
    });
    return { status: 'failed' };
  }

  // Guard against underpayment / wrong-currency. Mirror the subscription
  // check: only fulfil when the charged amount and currency exactly match
  // the checkout attempt.
  if (verified.currency !== payment.currency || verified.amount !== payment.amount) {
    await prisma.paymentAttempt.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        failureCode: 'amount_mismatch',
        failureMessage: `Verified ${verified.currency} ${verified.amount} but expected ${payment.currency} ${payment.amount}`,
        channel: verified.channel,
        failedAt: new Date(),
      },
    });
    return { status: 'amount_mismatch' };
  }

  // The customer has paid; make sure the order is open so fulfilment can run.
  // An order that expired or was cancelled before the payment settled must be
  // re-activated rather than silently skipped.
  const orderState = await prisma.order.findUnique({
    where: { id: payment.orderId },
    select: { status: true },
  });
  if (
    orderState &&
    orderState.status !== OrderStatus.PENDING_PAYMENT &&
    orderState.status !== OrderStatus.CREATED &&
    orderState.status !== OrderStatus.PAID
  ) {
    await prisma.order.update({
      where: { id: payment.orderId },
      data: {
        status: OrderStatus.PENDING_PAYMENT,
        cancelledAt: null,
        expiresAt: new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60 * 1000),
      },
    });
  }

  await prisma.paymentAttempt.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.PROCESSING,
      channel: verified.channel,
      authorizationCode: verified.authorizationCode,
      providerResponse: { verifiedAt: new Date().toISOString() },
    },
  });

  const outcome = await fulfilOrder(payment.orderId, payment.id);

  await prisma.paymentAttempt.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.SUCCESSFUL, paidAt: new Date() },
  });

  return { status: outcome.alreadyFulfilled ? 'already_fulfilled' : 'fulfilled', orderNumber: outcome.order.orderNumber };
}
