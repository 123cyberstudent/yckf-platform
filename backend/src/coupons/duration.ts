// ============================================
// Coupon access-duration helpers.
// Supports explicit units (hours | days | months) so admin-selected durations
// are never lost or misinterpreted (the old mobile admin sent `durationType`
// which the backend ignored, silently defaulting every coupon to 24h).
// ============================================

export type DurationUnit = 'hours' | 'days' | 'months';

export const DURATION_UNITS: DurationUnit[] = ['hours', 'days', 'months'];

export function computeExpiry(base: Date, value: number, unit: DurationUnit): Date {
  const d = new Date(base.getTime());
  switch (unit) {
    case 'hours':
      d.setTime(d.getTime() + value * 60 * 60 * 1000);
      break;
    case 'days':
      d.setTime(d.getTime() + value * 24 * 60 * 60 * 1000);
      break;
    case 'months': {
      const day = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + value);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, lastDay));
      break;
    }
  }
  return d;
}

export interface ParsedAccessDuration {
  value: number;
  unit: DurationUnit;
  hours: number;
}

/**
 * Parse the access duration from an admin create/update payload.
 * Accepted shapes (in priority order):
 *  1. { accessDurationValue, accessDurationUnit: hours|days|months }
 *  2. { durationType: '12h' | '24h' | '12months' | '<n>h' | '<n>d' | '<n>months' } (mobile admin)
 *  3. { durationHours: <n> } (legacy dashboard)
 * Defaults to 24 hours when nothing is supplied.
 */
export function parseAccessDuration(body: Record<string, unknown>): ParsedAccessDuration | { error: string } {
  const explicitValue = body.accessDurationValue;
  const explicitUnit = body.accessDurationUnit;

  if (explicitValue !== undefined && explicitValue !== null && explicitValue !== '') {
    const value = Number(explicitValue);
    const unit = String(explicitUnit ?? 'hours').toLowerCase();
    if (!Number.isInteger(value) || value < 1) {
      return { error: 'accessDurationValue must be a positive integer' };
    }
    if (!DURATION_UNITS.includes(unit as DurationUnit)) {
      return { error: 'accessDurationUnit must be one of: hours, days, months' };
    }
    const u = unit as DurationUnit;
    const hours = u === 'months' ? value * 30 * 24 : u === 'days' ? value * 24 : value;
    return { value, unit: u, hours };
  }

  const durationType = String(body.durationType ?? '').toLowerCase();
  if (durationType) {
    const monthMatch = /^(\d+)months$/.exec(durationType);
    if (monthMatch) {
      const v = Number(monthMatch[1]);
      if (Number.isInteger(v) && v > 0) return { value: v, unit: 'months', hours: v * 30 * 24 };
      return { error: 'Unsupported durationType' };
    }
    const hMatch = /^(\d+)h$/.exec(durationType);
    if (hMatch) {
      const v = Number(hMatch[1]);
      if (Number.isInteger(v) && v > 0) return { value: v, unit: 'hours', hours: v };
      return { error: 'Unsupported durationType' };
    }
    const dMatch = /^(\d+)d$/.exec(durationType);
    if (dMatch) {
      const v = Number(dMatch[1]);
      if (Number.isInteger(v) && v > 0) return { value: v, unit: 'days', hours: v * 24 };
      return { error: 'Unsupported durationType' };
    }
    return { error: 'Unsupported durationType' };
  }

  const durationHours = body.durationHours;
  if (durationHours !== undefined && durationHours !== null && durationHours !== '') {
    const h = Number(durationHours);
    if (!Number.isInteger(h) || h < 1) {
      return { error: 'durationHours must be a positive integer' };
    }
    return { value: h, unit: 'hours', hours: h };
  }

  return { value: 24, unit: 'hours', hours: 24 };
}
