import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/shared/db.js';
import { loginUser, verifyOtpLogin, resendOtpCode } from '../src/auth/service.js';
import { hashPassword } from '../src/auth/password.js';

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)('OTP login (live dev DB)', () => {
  const runId = `${Date.now()}`;
  const emails = {
    emailUser: `otp-email-${runId}@test.local`,
    phoneUser: `otp-phone-${runId}@test.local`,
  };
  let emailUserId = 0;
  let phoneUserId = 0;
  let phone: string | null = null;

  beforeAll(async () => {
    const passwordHash = await hashPassword('TestPass123!');
    const emailUser = await prisma.user.create({
      data: { email: emails.emailUser, fullName: 'OTP Email User', passwordHash, role: 'USER' },
    });
    const phoneUser = await prisma.user.create({
      data: { email: emails.phoneUser, fullName: 'OTP Phone User', passwordHash, role: 'USER' },
    });
    emailUserId = emailUser.id;
    phoneUserId = phoneUser.id;
    const normalized = await prisma.user.update({
      where: { id: phoneUserId },
      data: { phone: '+233244123456' },
      select: { phone: true },
    });
    phone = normalized.phone;
  });

  afterAll(async () => {
    await prisma.loginChallenge.deleteMany({ where: { userId: { in: [emailUserId, phoneUserId] } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: [emailUserId, phoneUserId] } } });
    await prisma.loginLog.deleteMany({ where: { userId: { in: [emailUserId, phoneUserId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [emailUserId, phoneUserId] } } });
  });

  it('issues an OTP challenge for an email login and verifies it', async () => {
    const result = await loginUser({ identifier: emails.emailUser, password: 'TestPass123!' });
    expect(result).toMatchObject({ requiresOtp: true });
    if (!('requiresOtp' in result) || !result.requiresOtp) throw new Error('expected OTP challenge');
    expect(result.challengeId).toBeTypeOf('number');
    expect(result.delivery).toContain('email');
    expect(result.maskedEmail).toContain('***');
    expect(result.devCode).toBeTruthy();

    const verified = await verifyOtpLogin({ challengeId: result.challengeId, code: result.devCode! });
    expect(verified.accessToken).toBeTruthy();
    expect(verified.refreshToken).toBeTruthy();
    expect(verified.user.id).toBe(emailUserId);
  });

  it('rejects a wrong code and consumes attempts', async () => {
    const result = await loginUser({ identifier: emails.emailUser, password: 'TestPass123!' });
    if (!('requiresOtp' in result) || !result.requiresOtp) throw new Error('expected OTP challenge');

    await expect(verifyOtpLogin({ challengeId: result.challengeId, code: '000000' })).rejects.toThrow('Invalid verification code');

    const challenge = await prisma.loginChallenge.findUnique({ where: { id: result.challengeId } });
    expect(challenge!.attemptCount).toBe(1);
  });

  it('rejects reusing a consumed challenge', async () => {
    const result = await loginUser({ identifier: emails.emailUser, password: 'TestPass123!' });
    if (!('requiresOtp' in result) || !result.requiresOtp) throw new Error('expected OTP challenge');

    await verifyOtpLogin({ challengeId: result.challengeId, code: result.devCode! });
    await expect(verifyOtpLogin({ challengeId: result.challengeId, code: result.devCode! })).rejects.toThrow('already been used');
  });

  it('resends a code for a pending challenge after the cooldown', async () => {
    const result = await loginUser({ identifier: emails.emailUser, password: 'TestPass123!' });
    if (!('requiresOtp' in result) || !result.requiresOtp) throw new Error('expected OTP challenge');

    await prisma.loginChallenge.update({
      where: { id: result.challengeId },
      data: { createdAt: new Date(Date.now() - 70 * 1000) },
    });

    const resend = await resendOtpCode(result.challengeId);
    expect(resend.devCode).toBeTruthy();

    const verified = await verifyOtpLogin({ challengeId: result.challengeId, code: resend.devCode! });
    expect(verified.user.id).toBe(emailUserId);
  });

  it('blocks a resend during the cooldown window', async () => {
    const result = await loginUser({ identifier: emails.emailUser, password: 'TestPass123!' });
    if (!('requiresOtp' in result) || !result.requiresOtp) throw new Error('expected OTP challenge');

    await expect(resendOtpCode(result.challengeId)).rejects.toThrow('wait');
  });

  it('logs in with a phone number as identifier', async () => {
    expect(phone).toBe('+233244123456');
    const result = await loginUser({ identifier: '+233 24 412 3456', password: 'TestPass123!' });
    expect(result).toMatchObject({ requiresOtp: true });
    if (!('requiresOtp' in result) || !result.requiresOtp) throw new Error('expected OTP challenge');
    expect(result.delivery).toContain('sms');
    expect(result.maskedPhone).toBe('+233****456');

    const verified = await verifyOtpLogin({ challengeId: result.challengeId, code: result.devCode! });
    expect(verified.user.id).toBe(phoneUserId);
  });

  it('does not reveal whether an account exists for a bad password', async () => {
    const missing = await loginUser({ identifier: 'nobody@test.local', password: 'WrongPass123!' }).catch((err) => err.message);
    const existing = await loginUser({ identifier: emails.emailUser, password: 'WrongPass123!' }).catch((err) => err.message);
    expect(missing).toBe('Invalid credentials');
    expect(existing).toBe('Invalid credentials');
  });

  it('keeps a usable challenge with an inline fallback code when the code cannot be delivered', async () => {
    const prev: Record<string, string | undefined> = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      SMS_PROVIDER: process.env.SMS_PROVIDER,
    };
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = '1';
    process.env.SMTP_USER = 'noreply@test.local';
    process.env.SMTP_PASS = 'not-a-real-password';
    process.env.SMS_PROVIDER = 'africastalking';

    try {
      const result = await loginUser({ identifier: emails.emailUser, password: 'TestPass123!' });
      expect(result.requiresOtp).toBe(true);
      if (result.requiresOtp) {
        expect(result.fallback).toBe(true);
        expect(result.devCode).toBeDefined();
      }

      const verified = await verifyOtpLogin({ challengeId: result.challengeId, code: result.devCode! });
      expect(verified.user.id).toBe(emailUserId);

      const pending = await prisma.loginChallenge.count({
        where: { userId: emailUserId, usedAt: null, expiresAt: { gt: new Date() } },
      });
      expect(pending).toBe(0);
    } finally {
      for (const key of Object.keys(prev)) {
        if (prev[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = prev[key];
        }
      }
    }
  });
});
