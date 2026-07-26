import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';
import { generateTicketNumber } from '../shared/tickets.js';
import { sendAdminNotification, sendSenderAcknowledgement } from '../email/service.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, subject, message, channel } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'name, email, and message are required' });
    }

    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const ticketNumber = await generateTicketNumber('enquiry');

    const enquiry = await prisma.enquiry.create({
      data: {
        ticketNumber,
        name,
        email,
        phone: phone || null,
        subject: subject || null,
        message,
        channel: channel || 'form',
      },
    });

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #06292D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">📩 GENERAL ENQUIRY</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Ticket: ${ticketNumber}</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Ticket Number</td><td style="padding: 8px;">${ticketNumber}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Name</td><td style="padding: 8px;">${name}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Email</td><td style="padding: 8px;">${email}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Phone</td><td style="padding: 8px;">${phone || 'Not provided'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Subject</td><td style="padding: 8px;">${subject || 'No subject'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Channel</td><td style="padding: 8px;">${channel || 'form'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Message</td><td style="padding: 8px;">${message}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Submitted At</td><td style="padding: 8px;">${new Date().toISOString()}</td></tr>
          </table>
        </div>
      </div>
    `;

    sendAdminNotification({
      ticketNumber,
      reportType: 'enquiry',
      subject: `📩 ENQUIRY - ${ticketNumber} - ${name}`,
      html: adminHtml,
    }).catch(() => {});

    sendSenderAcknowledgement({
      ticketNumber,
      reportType: 'enquiry',
      recipientEmail: email,
      recipientName: name,
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully',
      ticketNumber,
      enquiryId: enquiry.id,
      status: 'new',
      createdAt: enquiry.createdAt,
    });
  } catch (err) {
    console.error('Failed to submit enquiry:', err);
    res.status(500).json({ error: 'Failed to submit enquiry' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    const skip = (Number(page) - 1) * Number(limit);
    const [enquiries, total] = await Promise.all([
      prisma.enquiry.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
      prisma.enquiry.count({ where }),
    ]);
    res.json({ enquiries, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('Failed to list enquiries:', err);
    res.status(500).json({ error: 'Failed to list enquiries' });
  }
});

router.get('/:ticketNumber', async (req: Request, res: Response) => {
  try {
    const enquiry = await prisma.enquiry.findUnique({ where: { ticketNumber: req.params.ticketNumber } });
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });
    res.json(enquiry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get enquiry' });
  }
});

router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, adminNotes } = req.body;
    const valid = ['new', 'in_progress', 'replied', 'closed'];
    if (!valid.includes(status)) return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });
    const data: any = { status };
    if (adminNotes !== undefined) data.adminNotes = adminNotes;
    const enquiry = await prisma.enquiry.update({ where: { id: Number(req.params.id) }, data });
    res.json(enquiry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update enquiry' });
  }
});

export default router;
