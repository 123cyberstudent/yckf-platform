import { Request, Response, Router } from 'express';
import crypto from 'crypto';
import { body, param, query } from 'express-validator';
import { prisma } from '../shared/db.js';
import { hashPassword } from './password.js';
import { logAudit } from '../audit/service.js';
import { createNotification } from '../notifications/service.js';
import { sendStaffResetLinkEmail, sendTemporaryPasswordEmail, sendAdminNotification } from '../email/service.js';
import { validateRequest } from '../utils/validators.js';
import { verifyToken, isSuperAdmin, AuthRequest } from './middleware.js';
import { generalRateLimiter } from '../shared/rateLimiter.js';

const router = Router();

const RESET_LINK_TTL_MS = 24 * 60 * 60 * 1000;

function generateRequestNumber(): string {
  return `PRR-${Math.floor(100000 + Math.random() * 900000)}`;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateTemporaryPassword(): string {
  const random = crypto.randomBytes(9).toString('base64url');
  return `Tp!${random}A9`;
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const visible = name.length <= 2 ? name.slice(0, 1) : name.slice(0, 2);
  return `${visible}***@${domain}`;
}

const userInclude = {
  matchedUser: { select: { id: true, email: true, fullName: true, role: true, isActive: true } },
  handledBy: { select: { id: true, email: true, fullName: true, role: true } },
} as const;

export async function createStaffPasswordResetRequest(data: {
  fullName: string;
  email?: string;
  phone?: string;
  role?: string;
  reason?: string;
}) {
  let requestNumber = generateRequestNumber();
  while (await prisma.passwordResetRequest.findUnique({ where: { requestNumber } })) {
    requestNumber = generateRequestNumber();
  }

  const request = await prisma.passwordResetRequest.create({
    data: {
      requestNumber,
      fullName: data.fullName.trim(),
      email: data.email?.trim().toLowerCase() || null,
      phone: data.phone?.trim() || null,
      role: data.role?.trim() || null,
      reason: data.reason?.trim() || null,
      status: 'pending',
    },
  });

  // Alert super admins in-app.
  const superAdmins = await prisma.user.findMany({
    where: { isActive: true, role: 'SUPER_ADMIN' },
    select: { id: true },
  });
  await Promise.all(
    superAdmins.map((admin) =>
      createNotification({
        recipientId: admin.id,
        senderId: null,
        type: 'password_reset_request',
        title: 'New password reset request',
        body: `${request.fullName} requested a password reset. Review it in the dashboard.`,
        link: '/dashboard/password-reset-requests',
      }).catch(() => undefined)
    )
  );

  // Forward to the admin email inbox as well.
  await sendAdminNotification({
    ticketNumber: request.requestNumber,
    reportType: 'password_reset_request',
    subject: `New YCKF staff password reset request - ${request.requestNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2563EB; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Young Cyber Knights Foundation</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Staff password reset request</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 15px 0;">
            <p style="margin: 0; color: #64748b; font-size: 12px;">REQUEST NUMBER</p>
            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #2563EB;">${request.requestNumber}</p>
          </div>
          <p><strong>Full name:</strong> ${request.fullName}</p>
          <p><strong>Email:</strong> ${request.email || 'Not provided'}</p>
          <p><strong>Phone:</strong> ${request.phone || 'Not provided'}</p>
          <p><strong>Role:</strong> ${request.role || 'Not provided'}</p>
          <p><strong>Reason:</strong> ${request.reason || 'Not provided'}</p>
          <p>Sign in to the Super Admin dashboard and open <strong>Password Reset Requests</strong> to approve this request by sending a reset link or a temporary password.</p>
        </div>
      </div>
    `,
  }).catch((error) => console.error('[staffPasswordReset] Admin email failed:', error));

  return request;
}

router.post(
  '/staff/reset-request',
  generalRateLimiter,
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Enter a valid email address'),
    body('phone').optional({ values: 'falsy' }).isString().withMessage('Phone must be a string'),
    body('role').optional({ values: 'falsy' }).isString().withMessage('Role must be a string'),
    body('reason').optional({ values: 'falsy' }).isString().withMessage('Message must be a string'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const request = await createStaffPasswordResetRequest({
        fullName: req.body.fullName,
        email: req.body.email,
        phone: req.body.phone,
        role: req.body.role,
        reason: req.body.reason,
      });
      res.status(201).json({
        requestNumber: request.requestNumber,
        message: 'Your password reset request has been submitted and forwarded to the Super Admin for review. You will be contacted once it has been approved.',
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to submit request' });
    }
  }
);

router.get(
  '/staff/reset-requests',
  verifyToken,
  isSuperAdmin,
  [
    query('status')
      .optional()
      .isIn(['pending', 'approved', 'rejected', 'completed'])
      .withMessage('Invalid status filter'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const where: { status?: string } = {};
      if (status) where.status = String(status);
      const requests = await prisma.passwordResetRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: userInclude,
      });
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load requests' });
    }
  }
);

router.get(
  '/staff/reset-requests/:id',
  verifyToken,
  isSuperAdmin,
  [param('id').isInt().withMessage('Invalid request id')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const request = await prisma.passwordResetRequest.findUnique({
        where: { id: Number(req.params.id) },
        include: userInclude,
      });
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }
      res.json({ request });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load request' });
    }
  }
);

router.post(
  '/staff/reset-requests/:id/handle',
  verifyToken,
  isSuperAdmin,
  [
    param('id').isInt().withMessage('Invalid request id'),
    body('action').isIn(['reject', 'reset_link', 'temp_password']).withMessage('Invalid action'),
    body('userId').optional({ values: 'falsy' }).isInt().withMessage('User id must be an integer'),
    body('note').optional({ values: 'falsy' }).isString().withMessage('Note must be a string'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const requestId = Number(req.params.id);
      const { action, userId, note } = req.body;

      const request = await prisma.passwordResetRequest.findUnique({ where: { id: requestId } });
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }
      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'This request has already been handled' });
      }

      const adminId = req.user!.id;

      if (action === 'reject') {
        const updated = await prisma.passwordResetRequest.update({
          where: { id: requestId },
          data: { status: 'rejected', handledById: adminId, handledAt: new Date(), adminNote: note || null },
        });
        await logAudit(adminId, 'reject password reset request', requestId, String(req.ip));
        return res.json({ message: 'Request rejected', request: updated });
      }

      if (!userId) {
        return res.status(400).json({ error: 'Select the matching account for this request' });
      }
      const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
      if (!user) {
        return res.status(400).json({ error: 'Selected account no longer exists' });
      }
      if (!user.isActive) {
        return res.status(400).json({ error: 'Selected account is suspended. Reactivate it first.' });
      }

      if (action === 'temp_password') {
        const temporaryPassword = generateTemporaryPassword();
        const passwordHash = await hashPassword(temporaryPassword);
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
        await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

        const emailResult = await sendTemporaryPasswordEmail(user.email, user.fullName || 'there', temporaryPassword);

        const updated = await prisma.passwordResetRequest.update({
          where: { id: requestId },
          data: {
            status: 'approved',
            action: 'temp_password',
            matchedUserId: user.id,
            handledById: adminId,
            handledAt: new Date(),
            adminNote: note || null,
          },
        });
        await logAudit(adminId, 'generate temporary password', user.id, String(req.ip));
        await createNotification({
          recipientId: user.id,
          senderId: adminId,
          type: 'password_reset_approved',
          title: 'Password reset approved',
          body: 'Your password has been reset by the Super Admin. Check your email for a temporary password and change it after logging in.',
          link: '/dashboard/settings',
        }).catch(() => undefined);

        return res.json({
          message: `Temporary password generated${emailResult.success ? ' and emailed to the account holder' : ' (email delivery failed - relay it manually)'}`,
          temporaryPassword,
          emailed: emailResult.success,
          maskedEmail: maskEmail(user.email),
          request: updated,
        });
      }

      // action === 'reset_link'
      const token = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = sha256(token);
      const resetTokenExpiresAt = new Date(Date.now() + RESET_LINK_TTL_MS);
      const appUrl = (process.env.APP_URL || 'https://yckf-admin-dashboard-production.up.railway.app').replace(/\/$/, '');
      const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

      const emailResult = await sendStaffResetLinkEmail(user.email, user.fullName || 'there', link);

      const updated = await prisma.passwordResetRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          action: 'reset_link',
          matchedUserId: user.id,
          handledById: adminId,
          handledAt: new Date(),
          adminNote: note || null,
          resetTokenHash,
          resetTokenExpiresAt,
        },
      });
      await logAudit(adminId, 'send password reset link', user.id, String(req.ip));
      await createNotification({
        recipientId: user.id,
        senderId: adminId,
        type: 'password_reset_approved',
        title: 'Password reset approved',
        body: 'The Super Admin approved your password reset. Check your email for a secure link to set a new password.',
        link: '/reset-password',
      }).catch(() => undefined);

      return res.json({
        message: emailResult.success
          ? 'Reset link emailed to the account holder'
          : 'Reset link generated but email delivery failed - share the link securely.',
        emailed: emailResult.success,
        maskedEmail: maskEmail(user.email),
        resetLink: link,
        request: updated,
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to handle request' });
    }
  }
);

router.post(
  '/staff/reset-link/use',
  generalRateLimiter,
  [
    body('token').trim().notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[0-9])(?=.*[^A-Za-z0-9]).*$/)
      .withMessage('Password must contain at least one number and one special character'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      const tokenHash = sha256(String(token).trim());

      const request = await prisma.passwordResetRequest.findFirst({
        where: {
          resetTokenHash: tokenHash,
          status: 'approved',
          action: 'reset_link',
          matchedUserId: { not: null },
          resetTokenExpiresAt: { gt: new Date() },
        },
      });
      if (!request || !request.matchedUserId) {
        return res.status(400).json({ error: 'This reset link is invalid or has expired' });
      }

      const user = await prisma.user.findUnique({ where: { id: request.matchedUserId } });
      if (!user) {
        return res.status(400).json({ error: 'Account not found' });
      }

      const passwordHash = await hashPassword(newPassword);
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
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

      await prisma.passwordResetRequest.update({
        where: { id: request.id },
        data: { status: 'completed', handledAt: new Date(), resetTokenHash: null, resetTokenExpiresAt: null },
      });

      res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Password reset failed' });
    }
  }
);

export default router;
