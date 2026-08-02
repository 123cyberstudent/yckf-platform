import crypto from 'crypto';

export function staffCodeGateEnabled(): boolean {
  return !!process.env.STAFF_ACCESS_CODE;
}

export function verifyStaffCode(provided: string): boolean {
  const expected = process.env.STAFF_ACCESS_CODE;
  if (!expected) return true;
  const a = crypto.createHash('sha256').update(provided).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}
