import jwt from 'jsonwebtoken';
import { prisma } from '../shared/db.js';
import { grantSignupTrial } from '../subscriptions/service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-do-not-use-in-production';
const VERIFY_EMAIL_EXPIRES = '1d';

export function createEmailVerificationToken(userId: number, email: string): string {
  return jwt.sign({ sub: userId, email, purpose: 'email-verify' }, JWT_SECRET, {
    expiresIn: VERIFY_EMAIL_EXPIRES,
  });
}

export function verifyEmailVerificationToken(token: string): { userId: number; email: string } {
  const payload = jwt.verify(token, JWT_SECRET) as { sub?: number; email?: string; purpose?: string };
  if (payload.purpose !== 'email-verify' || typeof payload.sub !== 'number' || !payload.email) {
    throw new Error('Invalid or expired confirmation link');
  }
  return { userId: payload.sub, email: payload.email };
}

export async function verifyUserEmail(token: string): Promise<void> {
  const { userId, email } = verifyEmailVerificationToken(token);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Account not found');
  if (user.email !== email) throw new Error('Invalid or expired confirmation link');
  await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
  // Grant the 12-hour signup trial once, after successful account verification.
  // Safe to call repeatedly: the benefit ledger makes it idempotent.
  await grantSignupTrial(userId);
}
