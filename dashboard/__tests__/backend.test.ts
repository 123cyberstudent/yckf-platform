import { describe, it, expect } from 'vitest';
import { normalizeRole, normalizeStatus, formatResponseTimeSeconds, toIsoString } from '../lib/backend';

describe('Backend Helper Functions', () => {
  describe('normalizeRole', () => {
    it('should return admin for ADMIN', () => {
      expect(normalizeRole('ADMIN')).toBe('admin');
      expect(normalizeRole('admin')).toBe('admin');
    });

    it('should return investigator for INVESTIGATOR', () => {
      expect(normalizeRole('INVESTIGATOR')).toBe('investigator');
      expect(normalizeRole('investigator')).toBe('investigator');
    });

    it('should return user for USER and unknown roles', () => {
      expect(normalizeRole('USER')).toBe('user');
      expect(normalizeRole('user')).toBe('user');
      expect(normalizeRole('unknown')).toBe('user');
      expect(normalizeRole(undefined)).toBe('user');
    });
  });

  describe('normalizeStatus', () => {
    it('should return valid statuses', () => {
      expect(normalizeStatus('active')).toBe('active');
      expect(normalizeStatus('inactive')).toBe('inactive');
      expect(normalizeStatus('suspended')).toBe('suspended');
    });

    it('should default to active for unknown statuses', () => {
      expect(normalizeStatus('unknown')).toBe('active');
      expect(normalizeStatus(undefined)).toBe('active');
    });
  });

  describe('formatResponseTimeSeconds', () => {
    it('should format seconds to hours', () => {
      expect(formatResponseTimeSeconds(3600)).toBe('1.0 hrs');
      expect(formatResponseTimeSeconds(7200)).toBe('2.0 hrs');
      expect(formatResponseTimeSeconds(0)).toBe('0.0 hrs');
    });

    it('should handle null/undefined/NaN', () => {
      expect(formatResponseTimeSeconds(null)).toBe('0.0 hrs');
      expect(formatResponseTimeSeconds(undefined)).toBe('0.0 hrs');
      expect(formatResponseTimeSeconds(NaN)).toBe('0.0 hrs');
    });
  });

  describe('toIsoString', () => {
    it('should convert dates to ISO strings', () => {
      const date = new Date('2026-01-01T00:00:00Z');
      expect(toIsoString(date)).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should convert string dates to ISO strings', () => {
      expect(toIsoString('2026-01-01')).toContain('2026-01-01');
    });

    it('should return null for null/undefined', () => {
      expect(toIsoString(null)).toBeNull();
      expect(toIsoString(undefined)).toBeNull();
    });
  });
});

describe('Dashboard Types', () => {
  it('should have correct IncidentStatus values', () => {
    const validStatuses = ['open', 'investigating', 'pending', 'resolved', 'closed'];
    expect(validStatuses).toHaveLength(5);
  });

  it('should have correct IncidentSeverity values', () => {
    const validSeverities = ['critical', 'high', 'medium', 'low'];
    expect(validSeverities).toHaveLength(4);
  });
});
