import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { Prisma, type User as PrismaUser } from '@prisma/client';
import { prisma } from '../shared/db.js';
import { createNotification } from '../notifications/service.js';
import {
  disableTwoFactor,
  enableTwoFactor,
  generateBackupCodes,
  generateTwoFactorSetup,
  getTwoFactorStatus,
  isRememberedDevice,
  rememberDevice,
  verifyBackupCode,
  verifyTwoFactorCode,
} from './twoFactor.js';

export async function logLoginAttempt(data: {
  email: string;
  userId?: number;
  success: boolean;
  ipAddress: string;
  userAgent?: string;
  deviceInfo?: string;
  failureReason?: string;
}) {
  try {
    await prisma.loginLog.create({
      data: {
        email: data.email,
        userId: data.userId,
        success: data.success,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        deviceInfo: data.deviceInfo,
        failureReason: data.failureReason,
      },
    });
  } catch (err) {
    console.error('Failed to log login attempt:', err);
  }
}

const isProd = process.env.NODE_ENV === 'production';

if (isProd && (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET)) {
  throw new Error('FATAL: JWT_SECRET and REFRESH_TOKEN_SECRET must be set in production');
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-do-not-use-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret-do-not-use-in-production';
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '1h';
const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '7d';
const SALT_ROUNDS = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const SUSPEND_LOGIN_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const SUSPENSION_DURATION_MS = 60 * 60 * 1000;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

async function applyLoginFailure(userId: number, attempts: number, email: string) {
  const now = new Date();
  const updates: Prisma.UserUpdateInput = { failedLoginAttempts: attempts };
  if (attempts >= SUSPEND_LOGIN_ATTEMPTS) {
    updates.suspendedUntil = new Date(now.getTime() + SUSPENSION_DURATION_MS);
    await prisma.user.update({ where: { id: userId }, data: updates });
    await prisma.auditLog.create({ data: { userId, action: 'account suspended', targetId: null, ipAddress: 'system' } });
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
    await Promise.all(
      admins.map((admin: { id: any; }) =>
        createNotification({
          recipientId: admin.id,
          senderId: null,
          type: 'account_suspension',
          title: 'User Account Suspended',
          body: `User ${email} has been temporarily suspended after repeated login failures.`,
          link: '/admin/users',
        })
      )
    );
  } else if (attempts >= MAX_LOGIN_ATTEMPTS) {
    updates.lockoutUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
    await prisma.user.update({ where: { id: userId }, data: updates });
  } else {
    await prisma.user.update({ where: { id: userId }, data: updates });
  }
}

function isPasswordStrong(password: string) {
  return PASSWORD_COMPLEXITY_REGEX.test(password);
}

export async function registerUser({ email, password, fullName }: { email: string; password: string; fullName: string }) {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('Email already in use');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      role: 'USER',
      twoFactorEnabled: false,
      twoFactorBackupCodes: [],
      fcmTokens: [],
    },
  });
}

export async function loginUser({
  email,
  password,
  twoFactorToken,
  backupCode,
  rememberDeviceToken,
  rememberDevice: rememberDeviceFlag,
  ipAddress,
  userAgent,
  deviceInfo,
}: {
  email: string;
  password: string;
  twoFactorToken?: string;
  backupCode?: string;
  rememberDeviceToken?: string;
  rememberDevice?: boolean;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
}) {
  const ip = ipAddress || 'unknown';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    await logLoginAttempt({ email, success: false, ipAddress: ip, userAgent, deviceInfo, failureReason: 'Invalid credentials' });
    throw new Error('Invalid credentials');
  }

  const now = new Date();
  if (user.suspendedUntil && user.suspendedUntil > now) {
    await logLoginAttempt({ email, userId: user.id, success: false, ipAddress: ip, userAgent, deviceInfo, failureReason: 'Account suspended' });
    throw new Error('Account temporarily suspended. Please contact support.');
  }

  if (user.lockoutUntil && user.lockoutUntil > now) {
    await logLoginAttempt({ email, userId: user.id, success: false, ipAddress: ip, userAgent, deviceInfo, failureReason: 'Account locked' });
    throw new Error('Account locked due to multiple failed login attempts. Try again later.');
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    await applyLoginFailure(user.id, user.failedLoginAttempts + 1, user.email);
    await logLoginAttempt({ email, userId: user.id, success: false, ipAddress: ip, userAgent, deviceInfo, failureReason: 'Invalid password' });
    throw new Error('Invalid credentials');
  }

  const has2FA = user.twoFactorEnabled;
  let bypass2FA = false;
  let deviceToken: string | undefined;

  if (has2FA) {
    if (rememberDeviceToken) {
      bypass2FA = await isRememberedDevice(user.id, rememberDeviceToken);
    }

    if (!bypass2FA) {
      if (!twoFactorToken && !backupCode) {
        return { requiresTwoFactor: true, user };
      }
      const totpValid = twoFactorToken ? await verifyTwoFactorCode(user.id, twoFactorToken) : false;
      const backupValid = backupCode ? await verifyBackupCode(user.id, backupCode) : false;
      if (!totpValid && !backupValid) {
        await applyLoginFailure(user.id, user.failedLoginAttempts + 1, user.email);
        await logLoginAttempt({ email, userId: user.id, success: false, ipAddress: ip, userAgent, deviceInfo, failureReason: 'Invalid 2FA code' });
        throw new Error('Invalid two-factor authentication code');
      }
      if (rememberDeviceFlag) {
        deviceToken = await rememberDevice(user.id);
      }
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLogin: new Date(),
      failedLoginAttempts: 0,
      lockoutUntil: null,
      suspendedUntil: null,
    },
  });

  const accessToken = generateAccessToken(user.id, user.role, user.email, has2FA);
  const refreshToken = await createRefreshToken(user.id);

  await logLoginAttempt({ email, userId: user.id, success: true, ipAddress: ip, userAgent, deviceInfo });

  return {
    user,
    accessToken,
    refreshToken,
    rememberDeviceToken: deviceToken,
    requiresTwoFactor: false,
  };
}

export async function logoutAllSessions(userId: number) {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  if (!isPasswordStrong(newPassword)) {
    throw new Error('Password must be at least 8 characters and include one number and one special character.');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!validPassword) {
    throw new Error('Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockoutUntil: null,
      suspendedUntil: null,
    },
  });
  await logoutAllSessions(userId);
  return true;
}

const passwordResetCodes = new Map<string, { code: string; expiresAt: number }>();

function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function requestPasswordReset(email: string): Promise<{ message: string; code?: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { message: 'If an account exists with that email, a reset code has been sent.' };
  }

  const code = generateResetCode();
  passwordResetCodes.set(email, { code, expiresAt: Date.now() + 15 * 60 * 1000 });

  if (process.env.NODE_ENV !== 'production') {
    return { message: 'Reset code generated.', code };
  }

  return { message: 'If an account exists with that email, a reset code has been sent.' };
}

export async function verifyResetCode(email: string, code: string): Promise<boolean> {
  const entry = passwordResetCodes.get(email);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    passwordResetCodes.delete(email);
    return false;
  }
  return entry.code === code;
}

export async function resetPasswordWithCode(email: string, code: string, newPassword: string): Promise<void> {
  const valid = await verifyResetCode(email, code);
  if (!valid) {
    throw new Error('Invalid or expired reset code');
  }

  if (!isPasswordStrong(newPassword)) {
    throw new Error('Password must be at least 8 characters and include one number and one special character.');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('User not found');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockoutUntil: null,
      suspendedUntil: null,
    },
  });

  await logoutAllSessions(user.id);
  passwordResetCodes.delete(email);
}

function generateAccessToken(userId: number, role: string, email: string, twoFactorEnabled: boolean) {
  return jwt.sign(
    {
      sub: userId,
      role,
      email,
      type: 'access',
      twoFactorVerified: true,
    },
    JWT_SECRET as Secret,
    { expiresIn: ACCESS_TOKEN_EXPIRES } as SignOptions
  );
}

async function createRefreshToken(userId: number) {
  const token = jwt.sign({ sub: userId, type: 'refresh' }, REFRESH_TOKEN_SECRET as Secret, { expiresIn: REFRESH_TOKEN_EXPIRES } as SignOptions);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
}

export async function logoutUser(refreshToken: string) {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}

export async function refreshTokens(refreshToken: string) {
  const savedToken = await prisma.refreshToken.findUnique({ where: { token: refreshToken }, include: { user: true } });
  if (!savedToken) {
    throw new Error('Invalid refresh token');
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET as Secret) as unknown as { sub: number; type: string };
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    const user = savedToken.user;
    if (!user || !user.isActive) {
      throw new Error('User not active');
    }

    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    const accessToken = generateAccessToken(user.id, user.role, user.email, user.twoFactorEnabled);
    const newRefreshToken = await createRefreshToken(user.id);

    return { accessToken, refreshToken: newRefreshToken };
  } catch (error) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => undefined);
    throw new Error('Invalid refresh token');
  }
}

export async function getCurrentUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLogin: true,
      twoFactorEnabled: true,
    },
  });
}

export async function getTwoFactorStatusForUser(userId: number) {
  return getTwoFactorStatus(userId);
}

export async function generateUserBackupCodes(userId: number) {
  return generateBackupCodes(userId);
}

export async function prepareTwoFactorSetup(userId: number) {
  return generateTwoFactorSetup(userId);
}

export async function confirmTwoFactorSetup(userId: number, token: string) {
  const valid = await verifyTwoFactorCode(userId, token);
  if (!valid) {
    throw new Error('Invalid verification code');
  }
  return enableTwoFactor(userId);
}

export async function disableUserTwoFactor(userId: number) {
  return disableTwoFactor(userId);
}
