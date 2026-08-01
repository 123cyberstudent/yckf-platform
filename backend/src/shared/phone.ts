export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `233${digits.slice(1)}`;
  if (digits.startsWith('233') && digits.length === 12) {
    return `+${digits}`;
  }
  return null;
}

export function isValidPhone(raw: string): boolean {
  return normalizePhone(raw) !== null;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length < 6) return '***';
  return `+${digits.slice(0, 3)}****${digits.slice(-3)}`;
}

export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return '***@***';
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  const visible = local.length <= 2 ? '**' : `${local.slice(0, 2)}***`;
  return `${visible}@${domain}`;
}
