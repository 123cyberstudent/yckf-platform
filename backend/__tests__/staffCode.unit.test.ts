import { describe, it, expect, afterEach } from 'vitest';
import { staffCodeGateEnabled, verifyStaffCode } from '../src/auth/staffCode.js';

describe('staff access code gate', () => {
  const prev = process.env.STAFF_ACCESS_CODE;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.STAFF_ACCESS_CODE;
    } else {
      process.env.STAFF_ACCESS_CODE = prev;
    }
  });

  it('reports the gate as disabled when no code is configured', () => {
    delete process.env.STAFF_ACCESS_CODE;
    expect(staffCodeGateEnabled()).toBe(false);
    expect(verifyStaffCode('anything')).toBe(true);
  });

  it('accepts the correct code', () => {
    process.env.STAFF_ACCESS_CODE = 'YCKF-STAFF-2026';
    expect(staffCodeGateEnabled()).toBe(true);
    expect(verifyStaffCode('YCKF-STAFF-2026')).toBe(true);
  });

  it('rejects an incorrect code', () => {
    process.env.STAFF_ACCESS_CODE = 'YCKF-STAFF-2026';
    expect(verifyStaffCode('nope')).toBe(false);
    expect(verifyStaffCode('YCKF-STAFF-202')).toBe(false);
  });
});
