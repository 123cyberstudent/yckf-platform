import fs from 'fs';
import multer from 'multer';
import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';
import { generateTicketNumber } from '../shared/tickets.js';
import { sendAdminNotification, sendSenderAcknowledgement } from '../email/service.js';
import { computeHash, generateFilename, saveFile, getUploadPath } from '../shared/file.js';
import { verifyToken, isStaff, AuthRequest } from '../auth/middleware.js';
import { notifyAdmins } from '../notifications/service.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.post('/', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const {
      reporterName, reporterPhone, reporterEmail, description,
      stationName, stationPhone, stationAddress, stationLatitude, stationLongitude,
      gpsLatitude, gpsLongitude, gpsAccuracy, gpsAddress,
    } = req.body;

    if (!description && !req.file) {
      return res.status(400).json({ error: 'Description or audio recording is required' });
    }

    const ticketNumber = await generateTicketNumber('emergency');

    let audioFileUrl: string | null = null;
    let audioDuration: number | null = null;
    let audioMimeType: string | null = null;

    if (req.file) {
      const ext = req.file.mimetype.split('/')[1] || 'm4a';
      const fileName = generateFilename(ext);
      await saveFile(fileName, req.file.buffer);
      audioFileUrl = fileName;
      audioMimeType = req.file.mimetype;
      audioDuration = req.body.audioDuration ? Number(req.body.audioDuration) : null;
    }

    const report = await prisma.emergencyReport.create({
      data: {
        ticketNumber,
        reporterName: reporterName || null,
        reporterPhone: reporterPhone || null,
        reporterEmail: reporterEmail || null,
        description: description || null,
        audioFileUrl,
        audioDuration,
        audioMimeType,
        stationName: stationName || null,
        stationPhone: stationPhone || null,
        stationAddress: stationAddress || null,
        stationLatitude: stationLatitude ? Number(stationLatitude) : null,
        stationLongitude: stationLongitude ? Number(stationLongitude) : null,
        gpsLatitude: gpsLatitude ? Number(gpsLatitude) : null,
        gpsLongitude: gpsLongitude ? Number(gpsLongitude) : null,
        gpsAccuracy: gpsAccuracy ? Number(gpsAccuracy) : null,
        gpsAddress: gpsAddress || null,
      },
    });

    // In-app notification for all admins
    await notifyAdmins({
      type: 'alert',
      title: 'Emergency report',
      body: `${reporterName || 'Someone'} reported an emergency (${ticketNumber})`,
      link: `${process.env.DASHBOARD_URL || 'https://yckf-admin-dashboard-production.up.railway.app'}/dashboard/emergencies`,
    }).catch(() => {});

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">🚨 EMERGENCY REPORT</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Ticket: ${ticketNumber}</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Ticket Number</td><td style="padding: 8px;">${ticketNumber}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Reporter</td><td style="padding: 8px;">${reporterName || 'Not provided'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Phone</td><td style="padding: 8px;">${reporterPhone || 'Not provided'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Email</td><td style="padding: 8px;">${reporterEmail || 'Not provided'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Nearest Station</td><td style="padding: 8px;">${stationName || 'Not determined'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Station Phone</td><td style="padding: 8px;">${stationPhone || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">GPS Location</td><td style="padding: 8px;">${gpsLatitude || 'N/A'}, ${gpsLongitude || 'N/A'} (±${gpsAccuracy || '?'}m)</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">GPS Address</td><td style="padding: 8px;">${gpsAddress || 'Not available'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Voice Recording</td><td style="padding: 8px;">${audioFileUrl ? 'Attached (' + (audioDuration || '?') + 's)' : 'None'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Description</td><td style="padding: 8px;">${description || 'No text description'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Submitted At</td><td style="padding: 8px;">${new Date().toISOString()}</td></tr>
          </table>
        </div>
      </div>
    `;

    sendAdminNotification({
      ticketNumber,
      reportType: 'emergency',
      subject: `🚨 EMERGENCY REPORT - ${ticketNumber}`,
      html: adminHtml,
    }).catch(() => {});

    if (reporterEmail) {
      sendSenderAcknowledgement({
        ticketNumber,
        reportType: 'emergency',
        recipientEmail: reporterEmail,
        recipientName: reporterName || 'Reporter',
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: 'Emergency report submitted successfully',
      ticketNumber,
      reportId: report.id,
      status: 'new',
      createdAt: report.createdAt,
    });
  } catch (err) {
    console.error('Failed to submit emergency report:', err);
    res.status(500).json({ error: 'Failed to submit emergency report' });
  }
});

router.get('/', verifyToken, isStaff, async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    const skip = (Number(page) - 1) * Number(limit);
    const [reports, total] = await Promise.all([
      prisma.emergencyReport.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
      prisma.emergencyReport.count({ where }),
    ]);
    res.json({ reports, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('Failed to list emergency reports:', err);
    res.status(500).json({ error: 'Failed to list emergency reports' });
  }
});

router.get('/:ticketNumber', verifyToken, isStaff, async (req: AuthRequest, res: Response) => {
  try {
    const report = await prisma.emergencyReport.findUnique({ where: { ticketNumber: req.params.ticketNumber } });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get emergency report' });
  }
});

router.put('/:id/status', verifyToken, isStaff, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const valid = ['new', 'under_review', 'assigned', 'in_progress', 'resolved', 'closed'];
    if (!valid.includes(status)) return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });
    const report = await prisma.emergencyReport.update({ where: { id: Number(req.params.id) }, data: { status } });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.get('/audio/:filename', verifyToken, isStaff, async (req: AuthRequest, res: Response) => {
  try {
    const filePath = getUploadPath(req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Audio file not found' });
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: 'Failed to serve audio' });
  }
});

export default router;
