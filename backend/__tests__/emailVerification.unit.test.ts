import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { createEmailVerificationToken, verifyEmailVerificationToken } from '../src/auth/emailVerification.js';

describe('email verification token', () => {
  const secret = 'dev-jwt-secret-do-not-use-in-production';

  it('round-trips a token for a user', () => {
    const token = createEmailVerificationToken(42, 'user@yckf.org');
    const result = verifyEmailVerificationToken(token);
    expect(result.userId).toBe(42);
    expect(result.email).toBe('user@yckf.org');
  });

  it('rejects a token signed for another purpose', () => {
    const token = jwt.sign({ sub: 1, email: 'a@b.c', purpose: 'something-else' }, secret);
    expect(() => verifyEmailVerificationToken(token)).toThrow();
  });

  it('rejects an expired token', () => {
    const token = jwt.sign({ sub: 1, email: 'a@b.c', purpose: 'email-verify' }, secret, { expiresIn: -1 });
    expect(() => verifyEmailVerificationToken(token)).toThrow();
  });

  it('rejects garbage', () => {
    expect(() => verifyEmailVerificationToken('not-a-token')).toThrow();
  });
});
