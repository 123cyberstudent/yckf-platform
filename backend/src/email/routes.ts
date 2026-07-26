import { Router, Request, Response } from 'express';
import { emailRateLimiter } from '../shared/rateLimiter.js';
import { prisma } from '../shared/db.js';
import { generateTicketNumber } from '../shared/tickets.js';
import { sendAdminNotification } from './service.js';

const router = Router();

router.use(emailRateLimiter);

router.post('/send', async (req: Request, res: Response) => {
  const { to, subject } = req.body;
  if (!to || !subject) {
    return res.status(400).json({ error: 'to and subject are required' });
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log('[email/send] Subject:', subject);
  }
  res.json({ success: true, message: 'Email queued for delivery.' });
});

router.post('/emergency-report', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, description, location, audioUri, audioDuration, stationName, stationPhone } = req.body;
    const ticketNumber = await generateTicketNumber('emergency');

    const report = await prisma.emergencyReport.create({
      data: {
        ticketNumber,
        reporterName: name || null,
        reporterPhone: phone || null,
        reporterEmail: email || null,
        description: description || null,
        audioDuration: audioDuration ? Number(audioDuration) : null,
        stationName: stationName || null,
        stationPhone: stationPhone || null,
      },
    });

    sendAdminNotification({
      ticketNumber,
      reportType: 'emergency',
      subject: `🚨 EMERGENCY REPORT - ${ticketNumber}`,
      html: `<p>Emergency report from ${name || 'Unknown'}</p><p>${description || 'No description'}</p><p>Ticket: ${ticketNumber}</p>`,
    }).catch(() => {});

    res.json({ success: true, message: 'Emergency report received.', ticketNumber, reportId: report.id });
  } catch (err) {
    console.error('[email/emergency-report] Error:', err);
    res.status(500).json({ error: 'Failed to process emergency report' });
  }
});

router.post('/contact-message', async (req: Request, res: Response) => {
  try {
    const { name, email, message, subject, phone } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'name, email, and message are required' });
    }
    const ticketNumber = await generateTicketNumber('enquiry');

    await prisma.enquiry.create({
      data: {
        ticketNumber,
        name,
        email,
        phone: phone || null,
        subject: subject || null,
        message,
        channel: 'form',
      },
    });

    sendAdminNotification({
      ticketNumber,
      reportType: 'enquiry',
      subject: `📩 ENQUIRY - ${ticketNumber} - ${name}`,
      html: `<p>From: ${name} (${email})</p><p>Subject: ${subject || 'N/A'}</p><p>${message}</p><p>Ticket: ${ticketNumber}</p>`,
    }).catch(() => {});

    res.json({ success: true, message: 'Contact message received.', ticketNumber });
  } catch (err) {
    console.error('[email/contact-message] Error:', err);
    res.status(500).json({ error: 'Failed to process contact message' });
  }
});

router.post('/cybercrime-report', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, incidentType, description, location } = req.body;
    const ticketNumber = await generateTicketNumber('cybercrime');

    let systemUser = await prisma.user.findFirst({ where: { email: 'system@yckf.internal' } });
    if (!systemUser) {
      const bcrypt = await import('bcryptjs');
      systemUser = await prisma.user.create({
        data: {
          email: 'system@yckf.internal',
          fullName: 'System',
          passwordHash: await bcrypt.hash('system-' + Date.now(), 10),
          role: 'USER',
        },
      });
    }

    await prisma.report.create({
      data: {
        ticketNumber,
        userId: systemUser.id,
        title: `[Public Report] ${incidentType || 'Cybercrime'}`,
        description: JSON.stringify({ name, email, phone, incidentType, description, location }),
        incidentType: incidentType || 'cybercrime',
        priority: 'high',
        status: 'new',
        location: location || '',
        reporterName: name || null,
        reporterEmail: email || null,
        reporterPhone: phone || null,
      },
    });

    sendAdminNotification({
      ticketNumber,
      reportType: 'cybercrime',
      subject: `🔍 CYBERCRIME REPORT - ${ticketNumber}`,
      html: `<p>From: ${name || 'Unknown'} (${email || 'N/A'})</p><p>Type: ${incidentType || 'N/A'}</p><p>${description || 'No description'}</p><p>Ticket: ${ticketNumber}</p>`,
    }).catch(() => {});

    res.json({ success: true, message: 'Cybercrime report received.', ticketNumber });
  } catch (err) {
    console.error('[email/cybercrime-report] Error:', err);
    res.status(500).json({ error: 'Failed to process cybercrime report' });
  }
});

router.post('/thief-detection', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[email/thief-detection] Alert received');
  }
  res.json({ success: true, message: 'Thief detection alert received.' });
});

router.post('/booking-submission', async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, specialist, date, time, caseDescription, paymentMethod, paymentReference } = req.body;
    if (!fullName || !email || !phone) {
      return res.status(400).json({ error: 'fullName, email, and phone are required' });
    }
    const ticketNumber = await generateTicketNumber('booking');

    await prisma.booking.create({
      data: {
        ticketNumber,
        fullName,
        email,
        phone,
        specialist: specialist || null,
        preferredDate: date ? new Date(date) : null,
        preferredTime: time || null,
        caseDescription: caseDescription || '',
        paymentMethod: paymentMethod || null,
        paymentReference: paymentReference || null,
      },
    });

    sendAdminNotification({
      ticketNumber,
      reportType: 'booking',
      subject: `📋 BOOKING REQUEST - ${ticketNumber} - ${fullName}`,
      html: `<p>From: ${fullName} (${email})</p><p>Phone: ${phone}</p><p>Specialist: ${specialist || 'Any'}</p><p>Date: ${date || 'Flexible'}</p><p>${caseDescription}</p><p>Ticket: ${ticketNumber}</p>`,
    }).catch(() => {});

    res.json({ success: true, message: 'Booking submission received.', ticketNumber });
  } catch (err) {
    console.error('[email/booking-submission] Error:', err);
    res.status(500).json({ error: 'Failed to process booking' });
  }
});

export default router;
