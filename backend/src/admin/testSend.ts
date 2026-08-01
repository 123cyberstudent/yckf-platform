import { Router, Response } from 'express';
import { verifyToken, isSuperAdmin, AuthRequest } from '../auth/middleware.js';
import { sendOtpEmail } from '../email/service.js';
import { sendSms } from '../shared/sms.js';
import { generalRateLimiter } from '../shared/rateLimiter.js';
import { prisma } from '../shared/db.js';

const router = Router();

function smtpStatus() {
  const configured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  return {
    configured,
    host: process.env.SMTP_HOST || null,
    port: process.env.SMTP_PORT || null,
    secure: process.env.SMTP_SECURE || (process.env.SMTP_PORT === '465' ? 'true' : 'false'),
  };
}

function smsStatus() {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();
  let configured = false;
  if (provider === 'africastalking') {
    configured = Boolean(process.env.AFRICASTALKING_API_KEY && process.env.AFRICASTALKING_USERNAME);
  } else if (provider === 'twilio') {
    configured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
  }
  return {
    provider: provider || null,
    configured,
    from: process.env.AFRICASTALKING_FROM || process.env.TWILIO_FROM_NUMBER || null,
  };
}

router.post('/', verifyToken, isSuperAdmin, generalRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const channel = req.body.channel === 'sms' ? 'sms' : 'email';
    const requestedTo = (req.body.to || '').trim();
    const admin = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { email: true, phone: true },
    });

    if (channel === 'sms') {
      const to = requestedTo || admin?.phone;
      if (!to) {
        return res.status(400).json({ error: 'No SMS number on this account. Pass a "to" phone number.' });
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const result = await sendSms({
        to,
        message: `Your YCKF test code is ${code}. It expires in 10 minutes. Never share this code with anyone.`,
      });
      return res.json({
        channel,
        to,
        config: { sms: smsStatus() },
        result,
        note: result.sent
          ? 'Message dispatched to provider.'
          : 'Message not sent. Check config status above (provider credentials missing or request rejected).',
      });
    }

    const to = requestedTo || admin?.email;
    if (!to) {
      return res.status(400).json({ error: 'No email on this account. Pass a "to" email address.' });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const result = await sendOtpEmail(to, code, 'login');
    return res.json({
      channel: 'email',
      to,
      config: { smtp: smtpStatus() },
      result,
      note: result.success
        ? 'Email accepted for delivery.'
        : 'Email delivery failed. Check config status above (SMTP not configured or rejected).',
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Test send failed' });
  }
});

export default router;
