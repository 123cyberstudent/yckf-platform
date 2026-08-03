import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/shared/db.js';
import {
  assignReferralCodeToUser,
  ensurePlansSeeded,
  grantSignupTrial,
  handleSubscriptionChargeSuccess,
  initializeSubscriptionPayment,
  validateReferralCode,
  addMonths,
  addYears,
} from '../src/subscriptions/service.js';
import { getEligiblePromo, recordPromoEngagement } from '../src/subscriptions/promotions.js';
import { SUBSCRIPTION_PLANS, PremiumBenefitType, SUBSCRIPTION_PAYMENT_STATUS } from '../src/subscriptions/constants.js';

const mocks = vi.hoisted(() => ({
  verifyResult: { status: 'success', amount: 0, currency: 'GHS', paidAt: new Date().toISOString(), channel: 'card' } as {
    status: string;
    amount: number;
    currency: string;
    paidAt?: string;
    channel?: string;
  },
}));

vi.mock('../src/payments/paystack.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/payments/paystack.js')>();
  return {
    ...actual,
    initializeTransaction: vi.fn(async () => ({
      authorizationUrl: 'https://checkout.paystack.com/test',
      accessCode: 'access-code',
      reference: 'ref',
    })),
    verifyTransaction: vi.fn(async () => mocks.verifyResult),
  };
});

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)('Subscriptions integration (live dev DB)', () => {
  const runId = `${Date.now()}`;
  let referrerId = 0;
  let referredId = 0;
  let buyerId = 0;
  let exemptAdminId = 0;

  async function createUser(prefix: string, role: string = 'USER') {
    const passwordHash = await bcrypt.hash('TestPass123!', 4);
    const user = await prisma.user.create({
      data: { email: `sub-${prefix}-${runId}@test.local`, fullName: `Sub ${prefix}`, passwordHash, role: role as never },
    });
    return user;
  }

  beforeAll(async () => {
    await ensurePlansSeeded();
    const referrer = await createUser('referrer');
    const referred = await createUser('referred');
    const buyer = await createUser('buyer');
    const admin = await createUser('admin', 'ADMIN');
    referrerId = referrer.id;
    referredId = referred.id;
    buyerId = buyer.id;
    exemptAdminId = admin.id;
    await assignReferralCodeToUser(referrerId);
  });

  afterAll(async () => {
    const ids = [referrerId, referredId, buyerId, exemptAdminId];
    await prisma.subscription.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined);
    await prisma.premiumBenefitLedger.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined);
    const payments = await prisma.subscriptionPayment.findMany({ where: { userId: { in: ids } }, select: { id: true } });
    const paymentIds = payments.map((p) => p.id);
    await prisma.referral.deleteMany({ where: { OR: [{ referrerUserId: { in: ids } }, { referredUserId: { in: ids } }] } }).catch(() => undefined);
    await prisma.subscriptionPayment.deleteMany({ where: { id: { in: paymentIds } } }).catch(() => undefined);
    await prisma.promotionEngagement.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  it('serves a fixed server-side plan catalogue in GHS pesewas', async () => {
    const plans = await prisma.subscriptionPlan.findMany({ orderBy: { displayOrder: 'asc' } });
    const byCode = Object.fromEntries(plans.map((p) => [p.code, p]));
    expect(byCode.monthly?.pricePesewas).toBe(50_00);
    expect(byCode.six_months?.pricePesewas).toBe(250_00);
    expect(byCode.annual?.pricePesewas).toBe(500_00);
    expect(SUBSCRIPTION_PLANS.find((p) => p.code === 'annual')?.durationUnit).toBe('YEAR');
  });

  it('generates a unique non-sequential referral code per user', async () => {
    const code = await assignReferralCodeToUser(buyerId);
    expect(code).toMatch(/^YCKF-[A-Z0-9]{6}$/);
    const owner = await prisma.user.findUnique({ where: { id: buyerId } });
    expect(owner?.referralCode).toBe(code);
    const validation = await validateReferralCode(code!);
    expect(validation.valid).toBe(true);
    expect(await validateReferralCode('YCKF-000000')).toMatchObject({ valid: false });
    expect(await validateReferralCode('nonsense')).toMatchObject({ valid: false });
  });

  it('grants the 12h signup trial once and never to exempt roles', async () => {
    const first = await grantSignupTrial(referredId);
    expect(first.granted).toBe(true);
    const after = await prisma.user.findUnique({ where: { id: referredId } });
    const expected = new Date(Date.now() + 12 * 60 * 60 * 1000);
    expect(after!.premiumExpiresAt!.getTime()).toBeGreaterThan(expected.getTime() - 5000);
    expect(after!.premiumExpiresAt!.getTime()).toBeLessThan(expected.getTime() + 5000);

    const second = await grantSignupTrial(referredId);
    expect(second.granted).toBe(false);
    expect(second.reason).toBe('already_granted');

    const exempt = await grantSignupTrial(exemptAdminId);
    expect(exempt.granted).toBe(false);
    expect(exempt.reason).toBe('role_exempt');

    const ledger = await prisma.premiumBenefitLedger.findMany({
      where: { userId: referredId, benefitType: PremiumBenefitType.SIGNUP_TRIAL },
    });
    expect(ledger).toHaveLength(1);
  });

  it('performs calendar-aware month/year arithmetic', () => {
    const jan31 = new Date(2026, 0, 31);
    const feb = addMonths(jan31, 1);
    expect(feb.getMonth()).toBe(1);
    expect([28, 29]).toContain(feb.getDate());
    const leap = new Date(2024, 1, 29);
    const nextYear = addYears(leap, 1);
    expect(nextYear.getFullYear()).toBe(2025);
    expect(nextYear.getDate()).toBe(28);
  });

  it('extends existing premium rather than overwriting it', async () => {
    const base = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: buyerId },
      data: { premiumExpiresAt: base, premiumStartsAt: new Date(), subscriptionStatus: 'active' },
    });
    const grant = await grantSignupTrial(buyerId);
    expect(grant.granted).toBe(true);
    const after = await prisma.user.findUnique({ where: { id: buyerId } });
    expect(after!.premiumExpiresAt!.getTime()).toBe(base.getTime() + 12 * 60 * 60 * 1000);
  });

  it('rejects using your own referral code at checkout', async () => {
    const referrer = await prisma.user.findUnique({ where: { id: referrerId } });
    await expect(
      initializeSubscriptionPayment({ userId: referrerId, planCode: 'monthly', referralCode: referrer!.referralCode! })
    ).rejects.toMatchObject({ code: 'SELF_REFERRAL' });
  });

  it('initializes a payment, records the referral, and rewards the referrer once with a 1-year entitlement window', async () => {
    const referrer = await prisma.user.findUnique({ where: { id: referrerId } });
    const init = await initializeSubscriptionPayment({
      userId: referredId,
      planCode: 'monthly',
      referralCode: referrer!.referralCode!,
    });
    expect(init.authorizationUrl).toContain('checkout.paystack.com');
    expect(init.plan.pricePesewas).toBe(50_00);

    const payment = await prisma.subscriptionPayment.findUnique({
      where: { providerReference: init.reference },
    });
    expect(payment).not.toBeNull();
    expect(payment!.referredUserId).toBe(referrerId);
    expect(payment!.amountPesewas).toBe(50_00);
    expect(payment!.status).toBe(SUBSCRIPTION_PAYMENT_STATUS.PENDING);

    mocks.verifyResult = { status: 'success', amount: 50_00, currency: 'GHS', paidAt: new Date().toISOString(), channel: 'card' };

    const result = await handleSubscriptionChargeSuccess(init.reference);
    expect(result.status).toBe('processed');

    const paid = await prisma.subscriptionPayment.findUnique({
      where: { providerReference: init.reference },
    });
    expect(paid!.status).toBe(SUBSCRIPTION_PAYMENT_STATUS.PAID);

    const subscription = await prisma.subscription.findFirst({ where: { paymentId: paid!.id } });
    expect(subscription).not.toBeNull();
    expect(subscription!.expiresAt > new Date()).toBe(true);

    const referral = await prisma.referral.findUnique({
      where: { subscriptionPaymentId: paid!.id },
    });
    expect(referral).not.toBeNull();
    expect(referral!.status).toBe('REWARDED');
    expect(referral!.rewardExpiresAt!.getTime()).toBe(referral!.rewardGrantedAt!.getTime() + 365 * 24 * 60 * 60 * 1000);

    const referrerAfter = await prisma.user.findUnique({ where: { id: referrerId } });
    const expectedReward = new Date(Date.now() + 60 * 60 * 1000);
    expect(referrerAfter!.premiumExpiresAt!.getTime()).toBeGreaterThan(expectedReward.getTime() - 5000);
    expect(referrerAfter!.premiumExpiresAt!.getTime()).toBeLessThan(expectedReward.getTime() + 5000);

    // First verified purchase also granted the 12h bonus to the buyer.
    const bonusLedger = await prisma.premiumBenefitLedger.findMany({
      where: { userId: referredId, benefitType: PremiumBenefitType.FIRST_SUBSCRIPTION_BONUS },
    });
    expect(bonusLedger).toHaveLength(1);

    // Webhook reprocessing is idempotent.
    const duplicate = await handleSubscriptionChargeSuccess(init.reference);
    expect(duplicate.status).toBe('duplicate');
    const dupReferrals = await prisma.referral.count({ where: { referredUserId: referredId } });
    expect(dupReferrals).toBe(1);
  });

  it('rejects a payment whose verified amount/currency does not match', async () => {
    const init = await initializeSubscriptionPayment({ userId: buyerId, planCode: 'monthly' });
    mocks.verifyResult = { status: 'success', amount: 1, currency: 'GHS', channel: 'card' };
    const result = await handleSubscriptionChargeSuccess(init.reference);
    expect(result.status).toBe('ignored');
    const payment = await prisma.subscriptionPayment.findUnique({ where: { providerReference: init.reference } });
    expect(payment!.status).toBe(SUBSCRIPTION_PAYMENT_STATUS.FAILED);
    expect(payment!.rawProviderStatus).toContain('amount_mismatch');
  });

  it('does not reward an exempt-role referrer', async () => {
    // admin (exempt role) is the referrer; a fresh regular user is referred.
    const adminCode = await assignReferralCodeToUser(exemptAdminId);
    expect(adminCode).not.toBeNull();
    const freshUser = await createUser('fresh');
    try {
      const init = await initializeSubscriptionPayment({
        userId: freshUser.id,
        planCode: 'monthly',
        referralCode: adminCode!,
      });
      mocks.verifyResult = { status: 'success', amount: 50_00, currency: 'GHS', channel: 'card' };
      const result = await handleSubscriptionChargeSuccess(init.reference);
      expect(result.status).toBe('processed');
      const payment = await prisma.subscriptionPayment.findUnique({ where: { providerReference: init.reference } });
      const referral = await prisma.referral.findUnique({ where: { subscriptionPaymentId: payment!.id } });
      expect(referral).not.toBeNull();
      expect(referral!.status).toBe('REVERSED');
      const admin = await prisma.user.findUnique({ where: { id: exemptAdminId } });
      expect(admin!.premiumExpiresAt).toBeNull();
    } finally {
      await prisma.subscription.deleteMany({ where: { userId: freshUser.id } }).catch(() => undefined);
      await prisma.premiumBenefitLedger.deleteMany({ where: { userId: freshUser.id } }).catch(() => undefined);
      await prisma.subscriptionPayment.deleteMany({ where: { userId: freshUser.id } }).catch(() => undefined);
      await prisma.user.delete({ where: { id: freshUser.id } }).catch(() => undefined);
    }
  });

  it('serves server-driven promo eligibility and enforces once-per-day + already-used', async () => {
    const freshUser = await createUser('promo');
    try {
      // New user, no premium and no bonus yet → eligible on the subscriptions placement.
      const eligible = await getEligiblePromo({ placement: 'subscriptions', userId: freshUser.id });
      expect(eligible.show).toBe(true);

      // An exempt role is never offered the subscription promo (already premium).
      const adminEligible = await getEligiblePromo({ placement: 'subscriptions', userId: exemptAdminId });
      expect(adminEligible.show).toBe(false);

      // After an impression, the same promo is capped to once per day.
      await recordPromoEngagement({ userId: freshUser.id, promoKey: 'first_subscription_bonus', placement: 'subscriptions', action: 'impression' });
      const capped = await getEligiblePromo({ placement: 'subscriptions', userId: freshUser.id });
      expect(capped.show).toBe(false);
      expect(capped.reason).toBe('once_per_day');

      // A user who already received the bonus is never offered it again.
      const usedUser = await createUser('used');
      await prisma.premiumBenefitLedger.create({
        data: {
          userId: usedUser.id,
          benefitType: PremiumBenefitType.FIRST_SUBSCRIPTION_BONUS,
          durationMinutes: 12 * 60,
          sourceId: `test:${runId}`,
        },
      });
      const used = await getEligiblePromo({ placement: 'subscriptions', userId: usedUser.id });
      expect(used.show).toBe(false);
      expect(used.reason).toBe('already_used');
      await prisma.premiumBenefitLedger.delete({ where: { userId_benefitType_sourceId: { userId: usedUser.id, benefitType: PremiumBenefitType.FIRST_SUBSCRIPTION_BONUS, sourceId: `test:${runId}` } } }).catch(() => undefined);
      await prisma.user.delete({ where: { id: usedUser.id } }).catch(() => undefined);
    } finally {
      await prisma.promotionEngagement.deleteMany({ where: { userId: freshUser.id } }).catch(() => undefined);
      await prisma.user.delete({ where: { id: freshUser.id } }).catch(() => undefined);
    }
  });
});
