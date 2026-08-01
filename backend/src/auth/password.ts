import bcrypt from 'bcryptjs';
import argon2 from 'argon2';

const BCRYPT_ROUNDS = 12;

const ARGON2_OPTIONS = {
  type: argon2.argon2id as 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (storedHash.startsWith('$argon2')) {
    const valid = await argon2.verify(storedHash, password);
    return { valid, needsRehash: false };
  }
  // Legacy bcrypt hash (pre-argon2). Validate, then migrate to argon2id on success.
  const valid = await bcrypt.compare(password, storedHash);
  return { valid, needsRehash: valid };
}

export function isBcryptHash(storedHash: string): boolean {
  return storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$');
}

export { BCRYPT_ROUNDS };
