import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { prisma } from '../shared/db.js';

const SALT_ROUNDS = 10;
const TWO_FACTOR_REMEMBER_DAYS = Number(process.env.TWO_FACTOR_REMEMBER_DAYS ?? '30');

export async function generateTwoFactorSetup(userId: number) {
  const secret = speakeasy.generateSecret({ length: 20, name: `YCKF (${userId})` });
  await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret.base32 } });
  const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url || '');
  return { secret: secret.base32, otpauthUrl: secret.otpauth_url, qrCodeDataURL };
}

export async function verifyTwoFactorCode(userId: number, token: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorSecret) {
    throw new Error('Two-factor authentication is not configured for this account');
  }
  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 1,
  });
  return verified;
}

export async function enableTwoFactor(userId: number) {
  return prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
}

export async function disableTwoFactor(userId: number) {
  return prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [], twoFactorTrustedDevices: [] } });
}

export async function generateBackupCodes(userId: number) {
  const codes = Array.from({ length: 8 }, () => Math.random().toString(36).slice(2, 10).toUpperCase());
  const hashedCodes = await Promise.all(codes.map((code) => bcrypt.hash(code, SALT_ROUNDS)));
  await prisma.user.update({ where: { id: userId }, data: { twoFactorBackupCodes: hashedCodes } });
  return codes;
}

export async function verifyBackupCode(userId: number, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorBackupCodes?.length) {
    return false;
  }
  const codes = user.twoFactorBackupCodes;
  for (let index = 0; index < codes.length; index += 1) {
    const isMatch = await bcrypt.compare(code, codes[index]);
    if (isMatch) {
      const remaining = codes.filter((_: any, i: number) => i !== index);
      await prisma.user.update({ where: { id: userId }, data: { twoFactorBackupCodes: remaining } });
      return true;
    }
  }
  return false;
}

export async function rememberDevice(userId: number) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TWO_FACTOR_REMEMBER_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const existingDevices = Array.isArray(user?.twoFactorTrustedDevices) ? user.twoFactorTrustedDevices : [];
  const trustedDevices = [...existingDevices, { token, expiresAt }];
  await prisma.user.update({ where: { id: userId }, data: { twoFactorTrustedDevices: trustedDevices } });
  return token;
}

export async function isRememberedDevice(userId: number, deviceToken: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const devices = Array.isArray(user?.twoFactorTrustedDevices) ? user.twoFactorTrustedDevices : [];
  const now = new Date();
  const validDevices = devices.filter((item: any) => new Date(item.expiresAt) > now);
  const match = validDevices.some((item: any) => item.token === deviceToken);
  if (validDevices.length !== devices.length) {
    await prisma.user.update({ where: { id: userId }, data: { twoFactorTrustedDevices: validDevices } });
  }
  return match;
}

export async function getTwoFactorStatus(userId: number) {
  return prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true, twoFactorSecret: true, twoFactorBackupCodes: true, twoFactorTrustedDevices: true } });
}
