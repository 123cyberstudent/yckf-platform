import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/shared/db.js';
import { recordCreditTransaction, getWallet } from '../src/payments/walletService.js';
import { createOrder, fulfilOrder, payOrderWithCredits } from '../src/payments/ordersService.js';
import { PaymentError, PaymentErrorCode } from '../src/payments/errors.js';
import { getOrCreateReferralCode, registerReferral, resolveDiscountForQuote } from '../src/payments/promotionService.js';
import { OrderType, WalletTransactionType, PromotionStatus, PromotionType, PromoCodeType, DiscountType } from '../src/payments/constants.js';
import { toMinorUnits } from '../src/payments/money.js';

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)('Payments integration (live dev DB)', () => {
  const runId = `${Date.now()}`;
  const emails = {
    buyer: `itest-buyer-${runId}@test.local`,
    referrer: `itest-referrer-${runId}@test.local`,
  };
  let buyerId = 0;
  let referrerId = 0;
  let courseId = 0;
  let packageId = 0;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 4);
    const buyer = await prisma.user.create({
      data: { email: emails.buyer, fullName: 'IT Buyer', passwordHash, role: 'USER' },
    });
    const referrer = await prisma.user.create({
      data: { email: emails.referrer, fullName: 'IT Referrer', passwordHash, role: 'USER' },
    });
    buyerId = buyer.id;
    referrerId = referrer.id;

    const course = await prisma.course.create({
      data: {
        slug: `it-course-${runId}`,
        title: `IT Course ${runId}`,
        price: toMinorUnits(100),
        creditsPrice: 500,
        active: true,
      },
    });
    const pkg = await prisma.creditPackage.create({
      data: {
        name: `IT Package ${runId}`,
        baseCredits: 100,
        bonusCredits: 25,
        totalCredits: 125,
        price: toMinorUnits(10),
        active: true,
      },
    });
    courseId = course.id;
    packageId = pkg.id;
  });

  afterAll(async () => {
    const users = [buyerId, referrerId];
    await prisma.webhookEvent.deleteMany({ where: { paymentAttempt: { userId: { in: users } } } }).catch(() => undefined);
    await prisma.refund.deleteMany({ where: { order: { userId: { in: users } } } }).catch(() => undefined);
    await prisma.courseEnrolment.deleteMany({ where: { userId: { in: users } } });
    await prisma.paymentAttempt.deleteMany({ where: { userId: { in: users } } });
    await prisma.promotionRedemption.deleteMany({ where: { userId: { in: users } } });
    await prisma.orderItem.deleteMany({ where: { order: { userId: { in: users } } } });
    await prisma.order.deleteMany({ where: { userId: { in: users } } });
    await prisma.referralRelationship.deleteMany({ where: { referredUserId: { in: users } } });
    await prisma.referralRelationship.deleteMany({ where: { referrerUserId: { in: users } } });
    await prisma.promoCode.deleteMany({ where: { ownerUserId: { in: users } } });
    await prisma.creditLedgerEntry.deleteMany({ where: { userId: { in: users } } });
    await prisma.creditWallet.deleteMany({ where: { userId: { in: users } } });
    await prisma.promotion.deleteMany({ where: { internalName: { startsWith: `IT Promo ${runId}` } } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.creditPackage.deleteMany({ where: { id: packageId } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it('records a wallet credit and is idempotent', async () => {
    const first = await recordCreditTransaction({
      userId: buyerId,
      type: WalletTransactionType.PURCHASE,
      amount: 100,
      idempotencyKey: `it-signup-${runId}`,
      description: 'Test purchase credit',
    });
    const second = await recordCreditTransaction({
      userId: buyerId,
      type: WalletTransactionType.PURCHASE,
      amount: 100,
      idempotencyKey: `it-signup-${runId}`,
      description: 'Test purchase credit',
    });
    expect(first.existedBefore).toBe(false);
    expect(second.existedBefore).toBe(true);
    expect(first.balanceAfter).toBe(100);
    expect(second.balanceAfter).toBe(100);

    const wallet = await getWallet(buyerId);
    expect(wallet.availableBalance).toBe(100);
  });

  it('creates a credit-package order, fulfils it and grants credits exactly once', async () => {
    const order = await createOrder({
      userId: buyerId,
      orderType: OrderType.CREDIT_PACKAGE,
      productId: packageId,
    });
    expect(order.totalAmount).toBe(toMinorUnits(10));
    expect(order.subtotalAmount).toBe(toMinorUnits(10));
    expect(order.discountAmount).toBe(0);

    const first = await fulfilOrder(order.id, null);
    expect(first.alreadyFulfilled).toBe(false);
    const second = await fulfilOrder(order.id, null);
    expect(second.alreadyFulfilled).toBe(true);

    const wallet = await getWallet(buyerId);
    // 100 signup bonus + 125 package credits, no double-credit
    expect(wallet.availableBalance).toBe(225);
  });

  it('pays for a course with credits and grants the enrolment', async () => {
    await recordCreditTransaction({
      userId: buyerId,
      type: WalletTransactionType.PURCHASE,
      amount: 1000,
      idempotencyKey: `it-fund-${runId}`,
      description: 'Test funding',
    });

    const order = await createOrder({
      userId: buyerId,
      orderType: OrderType.COURSE,
      productId: courseId,
      payWithCredits: true,
    });
    expect(order.totalAmount).toBe(500);

    const paid = await payOrderWithCredits(order.orderNumber, buyerId);
    expect(paid.status).toBe('FULFILLED');

    // 225 (signup+package) + 1000 (funding) - 500 (course debit)
    const wallet = await getWallet(buyerId);
    expect(wallet.availableBalance).toBe(225 + 1000 - 500);

    const enrolment = await prisma.courseEnrolment.findUnique({
      where: { userId_courseId: { userId: buyerId, courseId } },
    });
    expect(enrolment).not.toBeNull();
    expect(enrolment!.source).toBe('CREDITS');
  });

  it('rejects paying with credits for a cedi-priced order', async () => {
    const order = await createOrder({
      userId: buyerId,
      orderType: OrderType.COURSE,
      productId: courseId,
    });
    expect(order.totalAmount).toBe(toMinorUnits(100));

    await expect(payOrderWithCredits(order.orderNumber, buyerId)).rejects.toMatchObject({
      code: PaymentErrorCode.INVALID_REQUEST,
    });
    await expect(
      prisma.paymentAttempt.findUnique({ where: { idempotencyKey: `credit-pay-attempt-${order.id}` } })
    ).resolves.toBeNull();
  });

  it('applies a discount promo code and grants bonus credits on fulfilment', async () => {
    const promotion = await prisma.promotion.create({
      data: {
        internalName: `IT Promo ${runId}`,
        publicTitle: 'IT Test Discount',
        promotionType: PromotionType.PERCENTAGE_DISCOUNT,
        status: PromotionStatus.ACTIVE,
        discountType: DiscountType.PERCENT,
        discountValue: 20,
        bonusCredits: 50,
        perUserRedemptionLimit: 2,
        stackable: false,
      },
    });
    const promoCode = await prisma.promoCode.create({
      data: {
        code: `ITPROMO${runId.slice(-6)}`,
        normalizedCode: `ITPROMO${runId.slice(-6)}`,
        type: PromoCodeType.PROMO,
        promotionId: promotion.id,
      },
    });

    const discount = await resolveDiscountForQuote(promoCode.code, {
      userId: buyerId,
      orderType: OrderType.COURSE,
      subtotal: toMinorUnits(100),
      productIds: [courseId],
      isFirstPurchase: false,
    });
    expect(discount.discountAmount).toBe(toMinorUnits(20));
    expect(discount.bonusCredits).toBe(50);

    const order = await createOrder({
      userId: buyerId,
      orderType: OrderType.COURSE,
      productId: courseId,
      promoCode: promoCode.code,
    });
    expect(order.totalAmount).toBe(toMinorUnits(80));

    await fulfilOrder(order.id, null);

    const wallet = await getWallet(buyerId);
    expect(wallet.lifetimeBonus).toBe(50);

    const redemption = await prisma.promotionRedemption.findUnique({
      where: { idempotencyKey: `promo-redemption-${order.id}` },
    });
    expect(redemption).not.toBeNull();
    expect(redemption!.discountAmount).toBe(toMinorUnits(20));
  });

  it('grants a referral reward to the referrer after the referred user buys', async () => {
    const referrerCode = await getOrCreateReferralCode(referrerId);
    expect(referrerCode.ownerUserId).toBe(referrerId);

    await registerReferral(referrerCode.code, buyerId);

    const order = await createOrder({
      userId: buyerId,
      orderType: OrderType.COURSE,
      productId: courseId,
      promoCode: referrerCode.code,
    });
    expect(order.discountAmount).toBeGreaterThan(0);
    await fulfilOrder(order.id, null);

    const referrerWallet = await getWallet(referrerId);
    expect(referrerWallet.availableBalance).toBeGreaterThanOrEqual(50);

    const relationship = await prisma.referralRelationship.findUnique({
      where: { referrerUserId_referredUserId: { referrerUserId: referrerId, referredUserId: buyerId } },
    });
    expect(relationship?.status).toBe('REWARDED');
    expect(relationship?.rewardCredits).toBeGreaterThanOrEqual(50);
  });
});
