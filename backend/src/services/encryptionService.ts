import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY || 'change_me_encryption_key';

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
