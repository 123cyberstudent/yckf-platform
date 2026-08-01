import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../shared/db.js';
import { sendOtpEmail } from '../email/service.js';
import { sendSms } from '../shared/sms.js';
import { maskEmail, maskPhone } from '../shared/phone.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 4;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_BCRYPT_ROUNDS = 10;

export class OtpDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OtpDeliveryError';
  }
}

type UserWithPhone = { id: number; email: string; phone: string | null };

function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function isDev(): boolean {
  return process.env.NODE_ENV !== 'production';
}

async function invalidatePendingChallenges(userId: number): Promise<void> {
  await prisma.loginChallenge.updateMany({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date() },
  });
}

async function deliverOtpCode(
  user: UserWithPhone,
  code: string
): Promise<{ emailSent: boolean; smsSent: boolean }> {
  const message = `Your YCKF login code is ${code}. It expires in 10 minutes. Never share this code with anyone.`;
  const emailResult = await sendOtpEmail(user.email, code, 'login');
  const smsResult = user.phone ? await sendSms({ to: user.phone, message }) : { sent: false as const };
  return { emailSent: emailResult.success, smsSent: smsResult.sent };
}

export async function createLoginChallenge(
  user: UserWithPhone,
  ipAddress?: string
): Promise<{
  challengeId: number;
  channels: string[];
  maskedEmail: string;
  maskedPhone: string | null;
  resendAfter: number;
  devCode?: string;
}> {
  await invalidatePendingChallenges(user.id);

  const code = generateOtp();
  const otpHash = await bcrypt.hash(code, OTP_BCRYPT_ROUNDS);

  const channels: string[] = ['EMAIL'];
  if (user.phone) channels.push('SMS');

  const challenge = await prisma.loginChallenge.create({
    data: {
      userId: user.id,
      otpHash,
      channel: channels.join('_'),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      ipAddress: ipAddress || null,
    },
  });

  const { emailSent, smsSent } = await deliverOtpCode(user, code);
  const delivered = user.phone ? emailSent || smsSent : emailSent;

  if (!delivered) {
    await prisma.loginChallenge.delete({ where: { id: challenge.id } });
    throw new OtpDeliveryError('Unable to deliver the verification code. Please try again.');
  }

  return {
    challengeId: challenge.id,
    channels,
    maskedEmail: maskEmail(user.email),
    maskedPhone: user.phone ? maskPhone(user.phone) : null,
    resendAfter: Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000),
    ...(isDev() ? { devCode: code } : {}),
  };
}

export async function verifyLoginOtp(
  challengeId: number,
  code: string
): Promise<
  | { valid: true; user: UserWithPhone; challenge: { id: number } }
  | { valid: false; reason: 'not_found' | 'expired' | 'used' | 'too_many_attempts' | 'invalid_code'; userId?: number }
> {
  const challenge = await prisma.loginChallenge.findUnique({
    where: { id: challengeId },
    include: { user: { select: { id: true, email: true, phone: true } } },
  });

  if (!challenge || !challenge.user) {
    return { valid: false, reason: 'not_found' };
  }

  const userId = challenge.user.id;
  const now = new Date();
  if (challenge.usedAt) {
    return { valid: false, reason: 'used', userId };
  }
  if (challenge.expiresAt <= now) {
    return { valid: false, reason: 'expired', userId };
  }
  if (challenge.attemptCount >= OTP_MAX_ATTEMPTS) {
    return { valid: false, reason: 'too_many_attempts', userId };
  }

  const codeMatches = await bcrypt.compare(code, challenge.otpHash);
  if (!codeMatches) {
    const newAttempts = challenge.attemptCount + 1;
    await prisma.loginChallenge.update({
      where: { id: challenge.id },
      data: { attemptCount: newAttempts, expiresAt: newAttempts >= OTP_MAX_ATTEMPTS ? now : challenge.expiresAt },
    });
    return { valid: false, reason: 'invalid_code', userId };
  }

  await prisma.loginChallenge.update({
    where: { id: challenge.id },
    data: { usedAt: now },
  });

  return { valid: true, user: challenge.user, challenge: { id: challenge.id } };
}

export async function resendLoginOtp(
  challengeId: number
): Promise<
  | { ok: true; resendAfter: number; devCode?: string }
  | { ok: false; reason: 'not_found' | 'used' | 'expired' | 'cooldown' | 'delivery_failed'; retryAfter?: number }
> {
  const challenge = await prisma.loginChallenge.findUnique({
    where: { id: challengeId },
    include: { user: { select: { id: true, email: true, phone: true } } },
  });

  if (!challenge || !challenge.user) {
    return { ok: false, reason: 'not_found' };
  }
  if (challenge.usedAt) {
    return { ok: false, reason: 'used' };
  }
  if (challenge.expiresAt <= new Date()) {
    return { ok: false, reason: 'expired' };
  }

  const elapsed = Date.now() - challenge.createdAt.getTime();
  if (elapsed < OTP_RESEND_COOLDOWN_MS) {
    return { ok: false, reason: 'cooldown', retryAfter: Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000) };
  }

  const code = generateOtp();
  const otpHash = await bcrypt.hash(code, OTP_BCRYPT_ROUNDS);
  await prisma.loginChallenge.update({
    where: { id: challenge.id },
    data: { otpHash, expiresAt: new Date(Date.now() + OTP_TTL_MS), attemptCount: 0, createdAt: new Date() },
  });

  const { emailSent, smsSent } = await deliverOtpCode(challenge.user, code);
  const delivered = challenge.user.phone ? emailSent || smsSent : emailSent;

  if (!delivered) {
    await prisma.loginChallenge.update({
      where: { id: challenge.id },
      data: { expiresAt: new Date() },
    });
    return { ok: false, reason: 'delivery_failed' };
  }

  return {
    ok: true,
    resendAfter: Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000),
    ...(isDev() ? { devCode: code } : {}),
  };
}
