import CryptoJS from 'crypto-js';

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.FIELD_ENCRYPTION_KEY) {
  throw new Error('FATAL: FIELD_ENCRYPTION_KEY must be set in production');
}

const ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY || 'dev-encryption-key-do-not-use-in-production';

export function encryptField(value: string) {
  return CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
}

export function decryptField(ciphertext: string) {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    const result = bytes.toString(CryptoJS.enc.Utf8);
    return result || ciphertext;
  } catch {
    return ciphertext;
  }
}
