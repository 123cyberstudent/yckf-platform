import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';
import { verifyToken, isAdmin } from '../auth/middleware.js';
import { generateTicketNumber } from '../shared/tickets.js';
import { sendAdminNotification, sendSenderAcknowledgement } from '../email/service.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, address, incidentDate, incidentTime, incidentType, description, location, reporterLocation } = req.body;

    if (!fullName || !email || !incidentType || !description) {
      return res.status(400).json({ error: 'fullName, email, incidentType, and description are required' });
    }

    if (description.length > 5000) {
      return res.status(400).json({ error: 'Description too long (max 5000 characters)' });
    }

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

    const gpsAddress = reporterLocation?.gpsAddress || '';
    const resolvedLocation = location || gpsAddress || '';
    const ticketNumber = await generateTicketNumber('cybercrime');

    const report = await prisma.report.create({
      data: {
        ticketNumber,
        userId: systemUser.id,
        title: `[Public Report] ${incidentType}`,
        description: JSON.stringify({
          fullName,
          email,
          phone: phone || '',
          address: address || '',
          incidentDate: incidentDate || '',
          incidentTime: incidentTime || '',
          location: location || '',
          description,
          submittedAt: new Date().toISOString(),
        }),
        incidentType,
        priority: 'high',
        status: 'new',
        location: resolvedLocation,
        reporterName: fullName,
        reporterEmail: email,
        reporterPhone: phone || null,
        gpsLatitude: reporterLocation?.latitude || null,
        gpsLongitude: reporterLocation?.longitude || null,
        gpsAccuracy: reporterLocation?.accuracy || null,
        gpsAddress: gpsAddress || null,
      },
    });

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">🔍 CYBERCRIME REPORT</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Ticket: ${ticketNumber}</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Ticket Number</td><td style="padding: 8px;">${ticketNumber}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Reporter</td><td style="padding: 8px;">${fullName}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Email</td><td style="padding: 8px;">${email}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Phone</td><td style="padding: 8px;">${phone || 'Not provided'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Incident Type</td><td style="padding: 8px;">${incidentType}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Incident Date</td><td style="padding: 8px;">${incidentDate || 'Not specified'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">GPS Location</td><td style="padding: 8px;">${reporterLocation?.latitude || 'N/A'}, ${reporterLocation?.longitude || 'N/A'}${reporterLocation?.accuracy ? ' (±' + reporterLocation.accuracy + 'm)' : ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">GPS Address</td><td style="padding: 8px;">${gpsAddress || 'Not available'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Description</td><td style="padding: 8px;">${description}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Submitted At</td><td style="padding: 8px;">${new Date().toISOString()}</td></tr>
          </table>
        </div>
      </div>
    `;

    sendAdminNotification({
      ticketNumber,
      reportType: 'cybercrime',
      subject: `🔍 CYBERCRIME REPORT - ${ticketNumber}`,
      html: adminHtml,
    }).catch(() => {});

    sendSenderAcknowledgement({
      ticketNumber,
      reportType: 'cybercrime',
      recipientEmail: email,
      recipientName: fullName,
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      ticketNumber,
      reportId: report.id,
      status: 'new',
      createdAt: report.createdAt,
      emailQueued: true,
    });
  } catch (err) {
    console.error('Failed to submit report');
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

router.get('/', verifyToken, isAdmin, async (_req: Request, res: Response) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: { cases: true, evidence: true },
    });
    res.json(reports);
  } catch (err) {
    console.error('Failed to list reports');
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

router.get('/:id', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: Number(req.params.id) },
      include: { cases: true, evidence: true },
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (err) {
    console.error('Failed to get report');
    res.status(500).json({ error: 'Failed to get report' });
  }
});

router.put('/:id/status', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const valid = ['new', 'under_review', 'in_progress', 'resolved', 'closed', 'rejected'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });
    }
    const report = await prisma.report.update({
      where: { id: Number(req.params.id) },
      data: { status },
    });
    res.json(report);
  } catch (err) {
    console.error('Failed to update report status');
    res.status(500).json({ error: 'Failed to update report status' });
  }
});

router.delete('/:id', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.report.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete report');
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

export default router;
