import { prisma } from '../shared/db.js';

const ADMIN_EMAIL = 'yckfadmin@youngcyberknightsfoundation.org';
const DEV_EMAIL = 'mypracticalworks@gmail.com';

export interface EmailPayload {
  ticketNumber: string;
  reportType: string;
  recipientEmail: string;
  subject: string;
  html: string;
}

export async function logEmail(payload: EmailPayload): Promise<number> {
  const log = await prisma.emailLog.create({
    data: {
      ticketNumber: payload.ticketNumber,
      reportType: payload.reportType,
      recipientEmail: payload.recipientEmail,
      subject: payload.subject,
      status: 'queued',
    },
  });
  return log.id;
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string }> {
  const logId = await logEmail(payload);

  try {
    let transporter: any = null;

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      const nodemailer = await import('nodemailer').catch(() => null);
      if (nodemailer) {
        const secureEnv = process.env.SMTP_SECURE;
        const secure = secureEnv !== undefined
          ? secureEnv === 'true' || secureEnv === '1'
          : smtpPort === 465;
        transporter = nodemailer.default.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure,
          auth: { user: smtpUser, pass: smtpPass },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 30000,
        });
      }
    }

    if (transporter) {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || `"YCKF" <${smtpUser}>`,
        to: payload.recipientEmail,
        subject: payload.subject,
        html: payload.html,
      });

      await prisma.emailLog.update({
        where: { id: logId },
        data: { status: 'sent', sentAt: new Date() },
      });

      return { success: true, messageId: info.messageId };
    }

    console.log(`[email] No SMTP configured. Email logged for ${payload.recipientEmail}: ${payload.subject}`);
    const isProduction = process.env.NODE_ENV === 'production';
    await prisma.emailLog.update({
      where: { id: logId },
      data: { status: isProduction ? 'failed' : 'sent', sentAt: new Date() },
    });

    return { success: !isProduction };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[email] Failed to send to ${payload.recipientEmail}:`, errMsg);
    await prisma.emailLog.update({
      where: { id: logId },
      data: { status: 'failed', errorMessage: errMsg },
    });
    return { success: false };
  }
}

export async function sendAdminNotification(options: {
  ticketNumber: string;
  reportType: string;
  subject: string;
  html: string;
}): Promise<void> {
  await sendEmail({
    ticketNumber: options.ticketNumber,
    reportType: options.reportType,
    recipientEmail: ADMIN_EMAIL,
    subject: options.subject,
    html: options.html,
  });
  await sendEmail({
    ticketNumber: options.ticketNumber,
    reportType: options.reportType,
    recipientEmail: DEV_EMAIL,
    subject: options.subject,
    html: options.html,
  });
}

export async function sendSenderAcknowledgement(options: {
  ticketNumber: string;
  reportType: string;
  recipientEmail: string;
  recipientName: string;
}): Promise<void> {
  const typeLabels: Record<string, string> = {
    cybercrime: 'Cybercrime Report',
    emergency: 'Emergency Report',
    booking: 'Booking Request',
    enquiry: 'General Enquiry',
  };
  const typeLabel = typeLabels[options.reportType] || 'Report';

  await sendEmail({
    ticketNumber: options.ticketNumber,
    reportType: options.reportType,
    recipientEmail: options.recipientEmail,
    subject: `Your ${typeLabel} has been received - ${options.ticketNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2563EB; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Young Cyber Knights Foundation</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">${typeLabel} Acknowledgement</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Dear ${options.recipientName},</p>
          <p>Your ${typeLabel.toLowerCase()} has been successfully received by the Young Cyber Knights Foundation.</p>
          <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 15px 0;">
            <p style="margin: 0; color: #64748b; font-size: 12px;">TICKET NUMBER</p>
            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #2563EB;">${options.ticketNumber}</p>
          </div>
          <p>Please keep this ticket number for future reference. You can use it to track the status of your report.</p>
          <p>If you have additional information, please reply to this email or contact us through the YCKF app.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Young Cyber Knights Foundation | Cybersecurity & Digital Safety</p>
        </div>
      </div>
    `,
  });
}

export async function sendOtpEmail(recipientEmail: string, code: string, purpose = 'login'): Promise<{ success: boolean }> {
  const subject = purpose === 'login' ? 'Your YCKF login code' : 'Your YCKF verification code';
  const result = await sendEmail({
    ticketNumber: `otp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    reportType: 'otp',
    recipientEmail,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2563EB; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Young Cyber Knights Foundation</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">${subject}</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Your security code is:</p>
          <div style="background: white; padding: 18px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 15px 0; text-align: center;">
            <span style="font-size: 30px; font-weight: bold; letter-spacing: 6px; color: #2563EB;">${code}</span>
          </div>
          <p>This code expires in <strong>10 minutes</strong>. If you did not attempt to ${purpose === 'login' ? 'log in' : 'verify your account'}, please ignore this email and secure your account.</p>
          <p style="font-size: 12px; color: #94a3b8;">Never share this code with anyone. YCKF will never ask for your password or codes by phone or email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Young Cyber Knights Foundation | Cybersecurity & Digital Safety</p>
        </div>
      </div>
    `,
  });
  return result;
}

export { ADMIN_EMAIL, DEV_EMAIL };
