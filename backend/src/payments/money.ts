export const CURRENCY_DECIMALS = 2;
export const DEFAULT_CURRENCY = 'GHS';

/** Convert a major-unit (GHS) number into integer minor units (pesewas). */
export function toMinorUnits(ghsAmount: number): number {
  if (!Number.isFinite(ghsAmount)) {
    throw new Error('Amount must be a finite number');
  }
  return Math.round(ghsAmount * 100);
}

/** Convert integer minor units into a major-unit number. */
export function toMajorUnits(minorUnits: number): number {
  return minorUnits / 100;
}

/** Format minor units as a readable money string, e.g. GHS 100.00 */
export function formatMinorUnits(minorUnits: number, currency: string = DEFAULT_CURRENCY): string {
  return `${currency} ${toMajorUnits(minorUnits).toFixed(CURRENCY_DECIMALS)}`;
}

/** Round a percentage discount value to a safe integer percent (0..100). */
export function clampDiscountPercent(percent: number): number {
  return Math.min(100, Math.max(0, Math.round(percent)));
}

/** Integer division-safe helper: percent of a minor-unit amount. */
export function percentOf(amount: number, percent: number): number {
  return Math.round((amount * percent) / 100);
}
