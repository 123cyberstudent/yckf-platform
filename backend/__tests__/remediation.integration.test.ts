import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/shared/db.js';
import { parseAccessDuration, computeExpiry } from '../src/coupons/duration.js';
import { validateCoupon, redeemCoupon } from '../src/coupons/service.js';
import { createBroadcastNotification } from '../src/notifications/service.js';
import { buildMapsLink } from '../src/emergencyReports/routes.js';

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)('Remediation (live dev DB)', () => {
  const runId = `${Date.now()}`;
  const users: number[] = [];
  const coupons: number[] = [];
  const broadcasts: number[] = [];

  async function createUser(prefix: string, role: string = 'USER') {
    const passwordHash = await bcrypt.hash('TestPass123!', 4);
    const user = await prisma.user.create({
      data: { email: `rem-${prefix}-${runId}@test.local`, fullName: `Rem ${prefix}`, passwordHash, role: role as never },
    });
    users.push(user.id);
    return user;
  }

  async function createCoupon(data: Record<string, unknown>) {
    const coupon = await prisma.coupon.create({
      data: { code: `REM${runId}${Math.floor(Math.random() * 1e6)}`, ...data },
    });
    coupons.push(coupon.id);
    return coupon;
  }

  afterAll(async () => {
    await prisma.couponRedemption.deleteMany({ where: { couponId: { in: coupons } } }).catch(() => undefined);
    await prisma.subscription.deleteMany({ where: { userId: { in: users } } }).catch(() => undefined);
    await prisma.broadcastRecipient.deleteMany({ where: { broadcastId: { in: broadcasts } } }).catch(() => undefined);
    await prisma.notification.deleteMany({ where: { recipientId: { in: users } } }).catch(() => undefined);
    await prisma.broadcast.deleteMany({ where: { id: { in: broadcasts } } }).catch(() => undefined);
    await prisma.coupon.deleteMany({ where: { id: { in: coupons } } }).catch(() => undefined);
    await prisma.auditLog.deleteMany({ where: { userId: { in: users } } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  describe('duration parsing', () => {
    it('parses explicit value+unit', () => {
      expect(parseAccessDuration({ accessDurationValue: 12, accessDurationUnit: 'months' })).toEqual({ value: 12, unit: 'months', hours: 12 * 30 * 24 });
      expect(parseAccessDuration({ accessDurationValue: 3, accessDurationUnit: 'days' })).toEqual({ value: 3, unit: 'days', hours: 72 });
    });

    it('parses the mobile admin durationType shorthand', () => {
      expect(parseAccessDuration({ durationType: '12h' })).toEqual({ value: 12, unit: 'hours', hours: 12 });
      expect(parseAccessDuration({ durationType: '24h' })).toEqual({ value: 24, unit: 'hours', hours: 24 });
      expect(parseAccessDuration({ durationType: '12months' })).toEqual({ value: 12, unit: 'months', hours: 12 * 30 * 24 });
    });

    it('falls back to legacy durationHours then 24h default', () => {
      expect(parseAccessDuration({ durationHours: 6 })).toEqual({ value: 6, unit: 'hours', hours: 6 });
      expect(parseAccessDuration({})).toEqual({ value: 24, unit: 'hours', hours: 24 });
    });

    it('rejects invalid units', () => {
      expect('error' in parseAccessDuration({ accessDurationValue: 5, accessDurationUnit: 'years' })).toBe(true);
      expect('error' in parseAccessDuration({ accessDurationValue: 0 })).toBe(true);
    });
  });

  describe('computeExpiry', () => {
    it('adds months calendar-aware (month-end clamping)', () => {
      const base = new Date(2026, 0, 31);
      const result = computeExpiry(base, 1, 'months');
      expect(result.getMonth()).toBe(1);
      expect([28, 29]).toContain(result.getDate());
    });
  });

  describe('coupon validate + redeem', () => {
    it('returns structured codes for each invalidation reason', async () => {
      const user = await createUser('validate');
      const inactive = await createCoupon({ isActive: false });
      expect((await validateCoupon(inactive.code, user.id)).code).toBe('COUPON_INACTIVE');

      const expired = await createCoupon({ expiresAt: new Date(Date.now() - 1000) });
      expect((await validateCoupon(expired.code, user.id)).code).toBe('COUPON_EXPIRED');

      const notYet = await createCoupon({ validFrom: new Date(Date.now() + 100000) });
      expect((await validateCoupon(notYet.code, user.id)).code).toBe('COUPON_NOT_ACTIVE_YET');

      const limit = await createCoupon({ maxUses: 1, usedCount: 1 });
      expect((await validateCoupon(limit.code, user.id)).code).toBe('COUPON_USAGE_LIMIT_REACHED');

      expect((await validateCoupon('DOES-NOT-EXIST', user.id)).code).toBe('COUPON_INVALID');
    });

    it('redeems a 12-month coupon, grants the premium window and records a coupon-source subscription', async () => {
      const user = await createUser('redeem');
      const coupon = await createCoupon({
        accessDurationValue: 12,
        accessDurationUnit: 'months',
        durationHours: 12 * 30 * 24,
      });

      const result = await redeemCoupon(coupon.code, user.id);
      expect(result.success).toBe(true);
      expect(result.redemption!.accessDurationUnit).toBe('months');

      const after = await prisma.user.findUnique({ where: { id: user.id } });
      const expected = computeExpiry(new Date(), 12, 'months');
      expect(after!.premiumExpiresAt!.getTime()).toBeGreaterThan(expected.getTime() - 5000);
      expect(after!.premiumExpiresAt!.getTime()).toBeLessThan(expected.getTime() + 5000);
      expect(after!.subscriptionStatus).toBe('active');

      const subscription = await prisma.subscription.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
      expect(subscription).not.toBeNull();
      expect(subscription!.source).toBe('coupon');
      expect(subscription!.planId).toBeNull();

      const updatedCoupon = await prisma.coupon.findUnique({ where: { id: coupon.id } });
      expect(updatedCoupon!.usedCount).toBe(1);

      // Double redemption is rejected
      const again = await redeemCoupon(coupon.code, user.id);
      expect(again.success).toBe(false);
      expect(again.message).toBe('COUPON_ALREADY_USED');
    });

    it('honors a 24h duration coupon', async () => {
      const user = await createUser('short');
      const coupon = await createCoupon({ durationHours: 24, accessDurationValue: 24, accessDurationUnit: 'hours' });
      const result = await redeemCoupon(coupon.code, user.id);
      expect(result.success).toBe(true);
      expect(result.redemption!.accessDuration).toBe(24);
      const after = await prisma.user.findUnique({ where: { id: user.id } });
      const expected = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expect(after!.premiumExpiresAt!.getTime()).toBeGreaterThan(expected.getTime() - 5000);
      expect(after!.premiumExpiresAt!.getTime()).toBeLessThan(expected.getTime() + 5000);
    });
  });

  describe('broadcast', () => {
    it('persists a Broadcast with per-recipient rows and in-app notifications, and marks email-only addresses', async () => {
      const sender = await createUser('sender', 'ADMIN');
      const volunteer = await createUser('vol', 'VOLUNTEER');
      const investigator = await createUser('inv', 'INVESTIGATOR');
      const user = await createUser('plain');

      const result = await createBroadcastNotification(sender.id, 'Test broadcast', 'Hello everyone', undefined, 'volunteers_and_investigators', [`extra-${runId}@test.local`]);

      const broadcast = await prisma.broadcast.findUnique({
        where: { id: result.broadcastId },
        include: { recipients: true },
      });
      expect(broadcast).not.toBeNull();
      expect(broadcast!.audience).toBe('volunteers_and_investigators');
      expect(broadcast!.createdById).toBe(sender.id);
      broadcasts.push(broadcast!.id);

      const recipientUserIds = broadcast!.recipients.map((r) => r.recipientId);
      expect(recipientUserIds).toContain(volunteer.id);
      expect(recipientUserIds).toContain(investigator.id);
      expect(recipientUserIds).not.toContain(user.id);

      const notificationCount = await prisma.notification.count({
        where: { recipientId: { in: [volunteer.id, investigator.id] }, relatedEntityType: 'broadcast', relatedEntityId: broadcast!.id },
      });
      expect(notificationCount).toBe(2);

      const emailOnly = broadcast!.recipients.find((r) => r.recipientId === null);
      expect(emailOnly).toBeDefined();
      expect(emailOnly!.recipientEmail).toBe(`extra-${runId}@test.local`);
      expect(['queued', 'sent', 'failed']).toContain(emailOnly!.emailStatus);
    });
  });

  describe('emergency maps link', () => {
    it('builds a google maps search link from GPS coordinates', () => {
      expect(buildMapsLink(5.6037, -0.187)).toBe('https://www.google.com/maps/search/?api=1&query=5.6037,-0.187');
      expect(buildMapsLink(null, -0.187)).toBeNull();
      expect(buildMapsLink(undefined, undefined)).toBeNull();
    });
  });
});
