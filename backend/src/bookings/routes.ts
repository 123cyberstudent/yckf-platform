import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';
import { generateTicketNumber } from '../shared/tickets.js';
import { sendAdminNotification, sendSenderAcknowledgement } from '../email/service.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, specialist, preferredDate, preferredTime, caseDescription, paymentMethod, paymentReference } = req.body;

    if (!fullName || !email || !phone || !caseDescription) {
      return res.status(400).json({ error: 'fullName, email, phone, and caseDescription are required' });
    }

    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    if (caseDescription.length < 20) {
      return res.status(400).json({ error: 'Case description must be at least 20 characters' });
    }

    const ticketNumber = await generateTicketNumber('booking');

    const booking = await prisma.booking.create({
      data: {
        ticketNumber,
        fullName,
        email,
        phone,
        specialist: specialist || null,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        preferredTime: preferredTime || null,
        caseDescription,
        paymentMethod: paymentMethod || null,
        paymentReference: paymentReference || null,
      },
    });

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2563EB; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">📋 BOOKING REQUEST</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Ticket: ${ticketNumber}</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Ticket Number</td><td style="padding: 8px;">${ticketNumber}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Full Name</td><td style="padding: 8px;">${fullName}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Email</td><td style="padding: 8px;">${email}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Phone</td><td style="padding: 8px;">${phone}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Specialist</td><td style="padding: 8px;">${specialist || 'Any available'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Preferred Date</td><td style="padding: 8px;">${preferredDate || 'Flexible'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Preferred Time</td><td style="padding: 8px;">${preferredTime || 'Flexible'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Payment Method</td><td style="padding: 8px;">${paymentMethod || 'Not specified'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Case Description</td><td style="padding: 8px;">${caseDescription}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Submitted At</td><td style="padding: 8px;">${new Date().toISOString()}</td></tr>
          </table>
        </div>
      </div>
    `;

    sendAdminNotification({
      ticketNumber,
      reportType: 'booking',
      subject: `📋 BOOKING REQUEST - ${ticketNumber} - ${fullName}`,
      html: adminHtml,
    }).catch(() => {});

    sendSenderAcknowledgement({
      ticketNumber,
      reportType: 'booking',
      recipientEmail: email,
      recipientName: fullName,
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Booking submitted successfully',
      ticketNumber,
      bookingId: booking.id,
      status: 'new',
      createdAt: booking.createdAt,
    });
  } catch (err) {
    console.error('Failed to submit booking:', err);
    res.status(500).json({ error: 'Failed to submit booking' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    const skip = (Number(page) - 1) * Number(limit);
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
      prisma.booking.count({ where }),
    ]);
    res.json({ bookings, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('Failed to list bookings:', err);
    res.status(500).json({ error: 'Failed to list bookings' });
  }
});

router.get('/:ticketNumber', async (req: Request, res: Response) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { ticketNumber: req.params.ticketNumber } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get booking' });
  }
});

router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, adminNotes, assignedVolunteerId } = req.body;
    const valid = ['new', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });
    const data: any = { status };
    if (adminNotes !== undefined) data.adminNotes = adminNotes;
    if (assignedVolunteerId !== undefined) data.assignedVolunteerId = assignedVolunteerId ? Number(assignedVolunteerId) : null;
    const booking = await prisma.booking.update({ where: { id: Number(req.params.id) }, data });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

export default router;
