import { Request, Response, Router } from 'express';
import { body, param } from 'express-validator';
import {
  changePassword,
  confirmTwoFactorSetup,
  disableUserTwoFactor,
  generateUserBackupCodes,
  getCurrentUser,
  getTwoFactorStatusForUser,
  loginUser,
  logoutAllSessions,
  logoutUser,
  prepareTwoFactorSetup,
  refreshTokens,
  registerUser,
  requestPasswordReset,
  resendOtpCode,
  resetPasswordWithCode,
  verifyOtpLogin,
  verifyResetCode,
} from './service.js';
import { validateRequest } from '../utils/validators.js';
import { OtpDeliveryError } from './otpService.js';
import { staffCodeGateEnabled, verifyStaffCode } from './staffCode.js';
import { loginRateLimiter, generalRateLimiter, otpVerifyLimiter, otpResendLimiter, staffCodeLimiter } from '../shared/rateLimiter.js';
import { verifyToken, AuthRequest } from './middleware.js';
import type { LoginResult } from './service.js';

const router = Router();

function isTwoFactorRequired(result: LoginResult): result is Extract<LoginResult, { requiresTwoFactor: true }> {
  return 'requiresTwoFactor' in result && result.requiresTwoFactor === true;
}

function isOtpRequired(result: LoginResult): result is Extract<LoginResult, { requiresOtp: true }> {
  return 'requiresOtp' in result && result.requiresOtp === true;
}

router.post(
  '/register',
  generalRateLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[0-9])(?=.*[^A-Za-z0-9]).*$/)
      .withMessage('Password must contain at least one number and one special character'),
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { email, password, fullName, phone, platform } = req.body;
      const user = await registerUser({ email, password, fullName, phone, platform });
      res.status(201).json({ id: user.id, email: user.email, phone: user.phone, fullName: user.fullName, role: user.role, createdAt: user.createdAt });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Registration failed' });
    }
  }
);

router.post(
  '/staff/verify',
  staffCodeLimiter,
  [body('code').trim().notEmpty().withMessage('Staff access code is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    const disabled = !staffCodeGateEnabled();
    const valid = disabled || verifyStaffCode(String(req.body.code || '').trim());
    res.json({ valid, disabled });
  }
);

router.get('/staff/status', generalRateLimiter, (_req: Request, res: Response) => {
  res.json({ enabled: staffCodeGateEnabled() });
});

router.post(
  '/login',
  loginRateLimiter,
  [
    body('identifier').optional().isString().withMessage('Identifier must be a string'),
    body('email').optional().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    body('twoFactorToken').optional().isString(),
    body('backupCode').optional().isString(),
    body('rememberDeviceToken').optional().isString(),
    body('rememberDevice').optional().isBoolean(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { identifier, email, password, twoFactorToken, backupCode, rememberDeviceToken, rememberDevice, platform } = req.body;
      if (!identifier && !email) {
        return res.status(400).json({ error: 'An email or phone number is required' });
      }
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || undefined;
      const result = await loginUser({ identifier, email, password, twoFactorToken, backupCode, rememberDeviceToken, rememberDevice, ipAddress, userAgent, platform });
      if (isTwoFactorRequired(result)) {
        return res.json({ requiresTwoFactor: true, user: { id: result.user.id, email: result.user.email, fullName: result.user.fullName, role: result.user.role } });
      }
      if (isOtpRequired(result)) {
        return res.json({
          requiresOtp: true,
          challengeId: result.challengeId,
          delivery: result.delivery,
          maskedEmail: result.maskedEmail,
          maskedPhone: result.maskedPhone,
          resendAfter: result.resendAfter,
          message: result.message,
          ...(result.devCode ? { devCode: result.devCode } : {}),
        });
      }
      res.json({
        user: {
          id: result.user.id,
          email: result.user.email,
          phone: result.user.phone,
          fullName: result.user.fullName,
          role: result.user.role,
          isActive: result.user.isActive,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        rememberDeviceToken: result.rememberDeviceToken,
      });
    } catch (error) {
      if (error instanceof OtpDeliveryError) {
        return res.status(503).json({ error: error.message });
      }
      res.status(401).json({ error: error instanceof Error ? error.message : 'Login failed' });
    }
  }
);

router.post(
  '/otp/verify',
  otpVerifyLimiter,
  [
    body('challengeId').isInt().toInt().withMessage('A valid challengeId is required'),
    body('code').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('A 6-digit code is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { challengeId, code, platform } = req.body;
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || undefined;
      const result = await verifyOtpLogin({ challengeId, code, ipAddress, userAgent, platform });
      res.json({
        user: {
          id: result.user.id,
          email: result.user.email,
          phone: result.user.phone,
          fullName: result.user.fullName,
          role: result.user.role,
          isActive: result.user.isActive,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      res.status(401).json({ error: error instanceof Error ? error.message : 'Verification failed' });
    }
  }
);

router.post(
  '/otp/resend',
  otpResendLimiter,
  [body('challengeId').isInt().toInt().withMessage('A valid challengeId is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const result = await resendOtpCode(req.body.challengeId);
      res.json(result);
    } catch (error) {
      if (error instanceof OtpDeliveryError) {
        return res.status(503).json({ error: error.message });
      }
      res.status(400).json({ error: error instanceof Error ? error.message : 'Resend failed' });
    }
  }
);

router.post(
  '/logout',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      await logoutUser(req.body.refreshToken);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Logout failed' });
    }
  }
);

router.post('/logout-all', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    await logoutAllSessions(req.user!.id);
    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Logout all devices failed' });
  }
});

router.post(
  '/change-password',
  verifyToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[0-9])(?=.*[^A-Za-z0-9]).*$/)
      .withMessage('New password must contain at least one number and one special character'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      await changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
      res.json({ message: 'Password changed and all sessions invalidated' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Password change failed' });
    }
  }
);

router.post(
  '/forgot-password',
  generalRateLimiter,
  [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const result = await requestPasswordReset(req.body.email);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Password reset request failed' });
    }
  }
);

router.post(
  '/verify-reset-code',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('code').trim().notEmpty().withMessage('Reset code is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const valid = await verifyResetCode(req.body.email, req.body.code);
      if (!valid) {
        return res.status(400).json({ error: 'Invalid or expired reset code' });
      }
      res.json({ message: 'Code verified successfully' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Code verification failed' });
    }
  }
);

router.post(
  '/reset-password',
  generalRateLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('code').trim().notEmpty().withMessage('Reset code is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[0-9])(?=.*[^A-Za-z0-9]).*$/)
      .withMessage('Password must contain at least one number and one special character'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      await resetPasswordWithCode(req.body.email, req.body.code, req.body.newPassword);
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Password reset failed' });
    }
  }
);

router.get('/me', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await getCurrentUser(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load user' });
  }
});

router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const tokens = await refreshTokens(req.body.refreshToken);
      res.json(tokens);
    } catch (error) {
      res.status(401).json({ error: error instanceof Error ? error.message : 'Refresh failed' });
    }
  }
);

router.get('/2fa/status', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role === 'USER') {
      return res.status(403).json({ error: '2FA status is only available for admin or investigator accounts' });
    }
    const status = await getTwoFactorStatusForUser(req.user.id);
    res.json({ twoFactorEnabled: status?.twoFactorEnabled ?? false, hasBackupCodes: Array.isArray(status?.twoFactorBackupCodes) && status.twoFactorBackupCodes.length > 0 });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load 2FA status' });
  }
});

router.post('/2fa/setup', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role === 'USER') {
      return res.status(403).json({ error: '2FA setup is only available for admin or investigator accounts' });
    }
    const setup = await prepareTwoFactorSetup(req.user.id);
    res.json(setup);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to prepare 2FA setup' });
  }
});

router.post('/2fa/verify', verifyToken, [body('token').trim().notEmpty().withMessage('Verification code is required')], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role === 'USER') {
      return res.status(403).json({ error: '2FA verification is only available for admin or investigator accounts' });
    }
    const result = await confirmTwoFactorSetup(req.user.id, req.body.token);
    res.json({ message: 'Two-factor authentication enabled', twoFactorEnabled: result.twoFactorEnabled });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to verify 2FA code' });
  }
});

router.post('/2fa/disable', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role === 'USER') {
      return res.status(403).json({ error: '2FA disable is only available for admin or investigator accounts' });
    }
    const result = await disableUserTwoFactor(req.user.id);
    res.json({ message: 'Two-factor authentication disabled', twoFactorEnabled: result.twoFactorEnabled });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to disable 2FA' });
  }
});

router.post('/2fa/backup-codes', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role === 'USER') {
      return res.status(403).json({ error: 'Backup codes are only available for admin or investigator accounts' });
    }
    const codes = await generateUserBackupCodes(req.user.id);
    res.json({ backupCodes: codes });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate backup codes' });
  }
});

export default router;
