// ============================================
// FILE: src/utils/money.ts
// Money formatting helpers for the mobile app
// ============================================

/** Convert integer minor units (pesewas) to a readable GHS string, e.g. GHS 5.00 */
export function formatMoney(minorUnits: number, currency: string = 'GHS'): string {
  const major = (minorUnits || 0) / 100;
  return `${currency} ${major.toFixed(2)}`;
}

/** Format a credit amount, e.g. 1,250 credits */
export function formatCredits(credits: number): string {
  return `${(credits || 0).toLocaleString()} credits`;
}
