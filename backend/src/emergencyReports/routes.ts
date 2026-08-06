import fs from 'fs';
import multer from 'multer';
import { Router, Response } from 'express';
import { prisma } from '../shared/db.js';
import { generateTicketNumber } from '../shared/tickets.js';
import { sendAdminNotification, sendSenderAcknowledgement, sendEmail } from '../email/service.js';
import { computeHash, generateFilename, saveFile, getUploadPath } from '../shared/file.js';
import { verifyToken, isStaff, optionalAuth, AuthRequest } from '../auth/middleware.js';
import { notifyAdmins, createNotification } from '../notifications/service.js';
import { logAudit } from '../audit/service.js';
import { emitToStaff } from '../shared/socket.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const INCIDENT_TYPES = ['cyber_threat', 'physical_threat', 'data_breach', 'fraud', 'harassment', 'medical', 'fire', 'other'];

const ASSIGNABLE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'INVESTIGATOR', 'VOLUNTEER'];

export function buildMapsLink(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

const dashboardBase = () => process.env.DASHBOARD_URL || 'https://yckf-admin-dashboard-production.up.railway.app';

router.post('/', upload.single('audio'), optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      reporterName, reporterPhone, reporterEmail, description,
      incidentType, attachments,
      stationName, stationPhone, stationAddress, stationLatitude, stationLongitude,
      stationDistance, nearestStationId,
      gpsLatitude, gpsLongitude, gpsAccuracy, gpsAddress, mapsLink,
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

    const lat = gpsLatitude ? Number(gpsLatitude) : null;
    const lng = gpsLongitude ? Number(gpsLongitude) : null;
    const serverMapsLink = buildMapsLink(lat, lng);

    // Populate reporter identity from the authenticated account when available
    const authedUser = req.user?.id
      ? await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { fullName: true, email: true, phone: true },
        })
      : null;
    const finalReporterName = reporterName || authedUser?.fullName || null;
    const finalReporterPhone = reporterPhone || authedUser?.phone || null;
    const finalReporterEmail = reporterEmail || req.user?.email || authedUser?.email || null;

    const type = INCIDENT_TYPES.includes(String(incidentType || '')) ? incidentType : String(incidentType || '').trim() ? incidentType : 'other';
    let attachmentsJson: unknown = null;
    if (attachments) {
      try {
        attachmentsJson = typeof attachments === 'string' ? JSON.parse(attachments) : attachments;
      } catch {
        attachmentsJson = null;
      }
    }

    const report = await prisma.emergencyReport.create({
      data: {
        ticketNumber,
        userId: req.user?.id ?? null,
        incidentType: type || null,
        reporterName: finalReporterName,
        reporterPhone: finalReporterPhone,
        reporterEmail: finalReporterEmail,
        description: description || null,
        audioFileUrl,
        audioDuration,
        audioMimeType,
        attachments: attachmentsJson as object | undefined,
        stationName: stationName || null,
        stationPhone: stationPhone || null,
        stationAddress: stationAddress || null,
        stationLatitude: stationLatitude ? Number(stationLatitude) : null,
        stationLongitude: stationLongitude ? Number(stationLongitude) : null,
        stationDistance: stationDistance ? Number(stationDistance) : null,
        nearestStationId: nearestStationId ? Number(nearestStationId) : null,
        gpsLatitude: lat,
        gpsLongitude: lng,
        gpsAccuracy: gpsAccuracy ? Number(gpsAccuracy) : null,
        gpsAddress: gpsAddress || null,
        mapsLink: mapsLink || serverMapsLink,
      },
    });

    // In-app notification for all admins
    await notifyAdmins({
      type: 'alert',
      title: 'Emergency report',
      body: `${finalReporterName || 'Someone'} reported an emergency (${ticketNumber})`,
      link: `${dashboardBase()}/dashboard/emergencies`,
    }).catch(() => {});

    // Real-time push to staff dashboards so new reports appear immediately
    emitToStaff('emergency:new', {
      id: report.id,
      ticketNumber,
      status: 'new',
      incidentType: type || null,
      reporterName: finalReporterName || null,
      gpsLatitude: lat,
      gpsLongitude: lng,
      mapsLink: mapsLink || serverMapsLink,
      createdAt: report.createdAt,
    });

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">🚨 EMERGENCY REPORT</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Ticket: ${ticketNumber}</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Ticket Number</td><td style="padding: 8px;">${ticketNumber}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Incident Type</td><td style="padding: 8px;">${type || 'Not specified'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Reporter</td><td style="padding: 8px;">${finalReporterName || 'Not provided'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Phone</td><td style="padding: 8px;">${finalReporterPhone || 'Not provided'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Email</td><td style="padding: 8px;">${finalReporterEmail || 'Not provided'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Nearest Station</td><td style="padding: 8px;">${stationName || 'Not determined'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Station Phone</td><td style="padding: 8px;">${stationPhone || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">GPS Location</td><td style="padding: 8px;">${lat || 'N/A'}, ${lng || 'N/A'} (±${gpsAccuracy || '?'}m)</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Maps Link</td><td style="padding: 8px;">${serverMapsLink || 'Not available'}</td></tr>
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

    if (finalReporterEmail) {
      sendSenderAcknowledgement({
        ticketNumber,
        reportType: 'emergency',
        recipientEmail: finalReporterEmail,
        recipientName: finalReporterName || 'Reporter',
      }).catch(() => {});
    }

    await logAudit(req.user?.id ?? null, 'emergency_report.submit', report.id, String(req.ip), {
      entityType: 'emergency_report',
      entityId: report.id,
      newValue: { ticketNumber, incidentType: type },
      userAgent: req.get('user-agent') ?? undefined,
    }).catch(() => {});

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
      prisma.emergencyReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          assignedBy: { select: { id: true, fullName: true, email: true } },
          assignmentHistory: {
            orderBy: { assignedAt: 'desc' },
            include: { assignee: { select: { id: true, fullName: true, email: true, role: true } } },
          },
        },
      }),
      prisma.emergencyReport.count({ where }),
    ]);
    res.json({ reports, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('Failed to list emergency reports:', err);
    res.status(500).json({ error: 'Failed to list emergency reports' });
  }
});

// Staff/responder: reports currently assigned to me
router.get('/assigned-to-me', verifyToken, isStaff, async (req: AuthRequest, res: Response) => {
  try {
    const reports = await prisma.emergencyReport.findMany({
      where: { assignedVolunteerId: req.user!.id, unassignedAt: null },
      orderBy: { assignedAt: 'desc' },
      include: {
        assignedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
    res.json({ reports });
  } catch (err) {
    console.error('Failed to get assigned emergency reports:', err);
    res.status(500).json({ error: 'Failed to get assigned emergency reports' });
  }
});

// Staff: active users who can receive emergency assignments
router.get('/assignees', verifyToken, isStaff, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['VOLUNTEER', 'INVESTIGATOR', 'ADMIN', 'SUPER_ADMIN'] },
      },
      select: { id: true, fullName: true, email: true, role: true },
      orderBy: { fullName: 'asc' },
    });
    res.json({ assignees: users });
  } catch (err) {
    console.error('Failed to load assignees:', err);
    res.status(500).json({ error: 'Failed to load assignees' });
  }
});

// User: Get own emergency reports
router.get('/my', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const reports = await prisma.emergencyReport.findMany({
      where: { OR: [{ userId: user.id }, { reporterEmail: user.email }] },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ reports });
  } catch (err) {
    console.error('Failed to get user emergency reports:', err);
    res.status(500).json({ error: 'Failed to get user emergency reports' });
  }
});

router.get('/:ticketNumber', verifyToken, isStaff, async (req: AuthRequest, res: Response) => {
  try {
    const report = await prisma.emergencyReport.findUnique({
      where: { ticketNumber: req.params.ticketNumber },
      include: {
        assignedBy: { select: { id: true, fullName: true, email: true } },
        assignmentHistory: {
          orderBy: { assignedAt: 'desc' },
          include: { assignee: { select: { id: true, fullName: true, email: true, role: true } } },
        },
      },
    });
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

    // Responders (volunteers/investigators) may only move their OWN assigned
    // reports forward (in_progress -> resolved). Closing and administrative
    // states are reserved for admins.
    const role = req.user!.role;
    const isAdminRole = role === 'SUPER_ADMIN' || role === 'ADMIN';
    if (!isAdminRole) {
      const RESPONDER_ALLOWED = ['in_progress', 'resolved'];
      if (!RESPONDER_ALLOWED.includes(status)) {
        return res.status(403).json({ error: 'Only administrators can set this status' });
      }
      const existing = await prisma.emergencyReport.findUnique({ where: { id: Number(req.params.id) } });
      if (!existing) return res.status(404).json({ error: 'Report not found' });
      if (existing.assignedVolunteerId !== req.user!.id) {
        return res.status(403).json({ error: 'You can only update reports assigned to you' });
      }
    }

    const report = await prisma.emergencyReport.update({ where: { id: Number(req.params.id) }, data: { status } });
    await logAudit(req.user!.id, 'emergency_report.status', Number(req.params.id), String(req.ip), {
      entityType: 'emergency_report',
      entityId: Number(req.params.id),
      newValue: { status },
    }).catch(() => {});
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Assign an emergency report to a responder (volunteer/investigator/staff)
router.post('/:id/assign', verifyToken, isStaff, async (req: AuthRequest, res: Response) => {
  try {
    // Only administrators may (re)assign reports to responders.
    if (req.user!.role !== 'SUPER_ADMIN' && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only administrators can assign responders' });
    }
    const reportId = Number(req.params.id);
    const { assigneeId, assignmentNote, dueAt, priority } = req.body;

    const report = await prisma.emergencyReport.findUnique({ where: { id: reportId } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (!assigneeId) {
      return res.status(400).json({ error: 'assigneeId is required' });
    }

    const assignee = await prisma.user.findUnique({ where: { id: Number(assigneeId) } });
    if (!assignee || !assignee.isActive) {
      return res.status(400).json({ error: 'Assignee is not an active user' });
    }
    if (!ASSIGNABLE_ROLES.includes(assignee.role)) {
      return res.status(400).json({ error: 'Assignee must be a volunteer, investigator or admin' });
    }
    if (assignee.suspendedUntil && assignee.suspendedUntil > new Date()) {
      return res.status(400).json({ error: 'Assignee account is currently suspended' });
    }

    const now = new Date();
    let due: Date | null = null;
    if (dueAt) {
      due = new Date(dueAt);
      if (Number.isNaN(due.getTime())) return res.status(400).json({ error: 'dueAt must be a valid date' });
    }

    const assignment = await prisma.$transaction(async (tx) => {
      const row = await tx.emergencyReportAssignment.create({
        data: {
          reportId,
          assigneeId: assignee.id,
          assignedById: req.user!.id,
          note: assignmentNote || null,
          assignedAt: now,
          status: 'assigned',
        },
      });
      await tx.emergencyReport.update({
        where: { id: reportId },
        data: {
          assignedVolunteerId: assignee.id,
          assignedById: req.user!.id,
          assignmentNote: assignmentNote || null,
          dueAt: due,
          assignedAt: now,
          unassignedAt: null,
          status: 'assigned',
          priority: priority || report.priority || 'high',
        },
      });
      return row;
    });

    await createNotification({
      recipientId: assignee.id,
      senderId: req.user!.id,
      type: 'assignment',
      title: 'Emergency assigned to you',
      body: `${report.ticketNumber} — ${assignmentNote || 'Please respond to this emergency report'}`,
      link: `${dashboardBase()}/dashboard/emergencies`,
      priority: 'high',
      relatedEntityType: 'emergency_report',
      relatedEntityId: reportId,
    }).catch(() => {});

    // Email the assignee (in addition to the dashboard notification)
    if (assignee.email) {
      sendEmail({
        ticketNumber: report.ticketNumber,
        reportType: 'emergency_assignment',
        recipientEmail: assignee.email,
        subject: `Emergency Report Assigned to You - ${report.ticketNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #DC2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">Emergency Report Assigned to You</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">Ticket: ${report.ticketNumber}</p>
            </div>
            <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
              <p>Dear ${assignee.fullName},</p>
              <p>An administrator has assigned an emergency report to you. Please log in to your dashboard to review the details and respond.</p>
              <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 15px 0;">
                <p style="margin: 0; color: #64748b; font-size: 12px;">TICKET NUMBER</p>
                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #DC2626;">${report.ticketNumber}</p>
                ${assignmentNote ? `<p style="margin: 10px 0 0 0; color: #64748b; font-size: 12px;">NOTE</p><p style="margin: 5px 0 0 0;">${assignmentNote}</p>` : ''}
                ${due ? `<p style="margin: 10px 0 0 0; color: #64748b; font-size: 12px;">DUE</p><p style="margin: 5px 0 0 0;">${due.toLocaleString()}</p>` : ''}
              </div>
              <p><a href="${dashboardBase()}/dashboard/volunteer" style="display: inline-block; background: #DC2626; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Open My Assigned Cases</a></p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #94a3b8;">Young Cyber Knights Foundation | Cybersecurity &amp; Digital Safety</p>
            </div>
          </div>
        `,
      }).catch(() => {});
    }

    await logAudit(req.user!.id, 'emergency_report.assign', reportId, String(req.ip), {
      entityType: 'emergency_report',
      entityId: reportId,
      previousValue: { assignedVolunteerId: report.assignedVolunteerId },
      newValue: { assigneeId: assignee.id, assignmentNote: assignmentNote || null, dueAt: due ? due.toISOString() : null },
      userAgent: req.get('user-agent') ?? undefined,
    });

    res.json({ success: true, message: 'Emergency report assigned', assignment, assignee: { id: assignee.id, fullName: assignee.fullName, role: assignee.role } });
  } catch (err) {
    console.error('Failed to assign emergency report:', err);
    res.status(500).json({ error: 'Failed to assign emergency report' });
  }
});

// Unassign an emergency report from its current responder
router.post('/:id/unassign', verifyToken, isStaff, async (req: AuthRequest, res: Response) => {
  try {
    // Only administrators may unassign reports.
    if (req.user!.role !== 'SUPER_ADMIN' && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only administrators can unassign responders' });
    }
    const reportId = Number(req.params.id);
    const { reason } = req.body;

    const report = await prisma.emergencyReport.findUnique({ where: { id: reportId } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const now = new Date();
    const previousAssigneeId = report.assignedVolunteerId;

    await prisma.$transaction(async (tx) => {
      if (previousAssigneeId) {
        const latest = await tx.emergencyReportAssignment.findFirst({
          where: { reportId, assigneeId: previousAssigneeId, status: 'assigned' },
          orderBy: { assignedAt: 'desc' },
        });
        await tx.emergencyReportAssignment.updateMany({
          where: { reportId, assigneeId: previousAssigneeId, status: 'assigned' },
          data: { status: 'unassigned', unassignedAt: now, note: reason || latest?.note || undefined },
        });
      }
      await tx.emergencyReport.update({
        where: { id: reportId },
        data: { assignedVolunteerId: null, unassignedAt: now, status: report.status === 'resolved' ? report.status : 'new' },
      });
    });

    await notifyAdmins({
      type: 'assignment',
      title: 'Emergency report unassigned',
      body: `${report.ticketNumber} was unassigned${reason ? ` — ${reason}` : ''}`,
      link: `${dashboardBase()}/dashboard/emergencies`,
    }).catch(() => {});

    await logAudit(req.user!.id, 'emergency_report.unassign', reportId, String(req.ip), {
      entityType: 'emergency_report',
      entityId: reportId,
      previousValue: { assignedVolunteerId: previousAssigneeId },
      newValue: { reason: reason || null },
      userAgent: req.get('user-agent') ?? undefined,
    });

    res.json({ success: true, message: 'Emergency report unassigned' });
  } catch (err) {
    console.error('Failed to unassign emergency report:', err);
    res.status(500).json({ error: 'Failed to unassign emergency report' });
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
