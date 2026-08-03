import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../shared/db.js';
import { verifyToken, isAdmin, isInvestigator, optionalAuth, AuthRequest } from '../auth/middleware.js';
import { generateTicketNumber } from '../shared/tickets.js';
import { sendAdminNotification, sendSenderAcknowledgement, sendEmail } from '../email/service.js';
import { logAudit } from '../audit/service.js';
import { notifyAdmins } from '../notifications/service.js';

const router = Router();

// Public: Submit a new cybercrime report (auth optional; ties to account when logged in)
router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, email, phone, address, incidentDate, incidentTime, incidentType, description, location, reporterLocation } = req.body;

    if (!fullName || !email || !incidentType || !description) {
      return res.status(400).json({ error: 'fullName, email, incidentType, and description are required' });
    }

    if (description.length > 5000) {
      return res.status(400).json({ error: 'Description too long (max 5000 characters)' });
    }

    let ownerUserId = req.user?.id;
    if (!ownerUserId) {
      let systemUser = await prisma.user.findFirst({ where: { email: 'system@yckf.internal' } });
      if (!systemUser) {
        systemUser = await prisma.user.create({
          data: {
            email: 'system@yckf.internal',
            fullName: 'System',
            passwordHash: await bcrypt.hash('system-' + Date.now(), 10),
            role: 'USER',
          },
        });
      }
      ownerUserId = systemUser.id;
    }

    const gpsAddress = reporterLocation?.gpsAddress || '';
    const resolvedLocation = location || gpsAddress || '';
    const ticketNumber = await generateTicketNumber('cybercrime');

    const report = await prisma.report.create({
      data: {
        ticketNumber,
        userId: ownerUserId,
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

    // Create the linked Case
    const caseRecord = await prisma.case.create({
      data: {
        reportId: report.id,
        status: 'new',
      },
    });

    // In-app notification for all admins
    await notifyAdmins({
      type: 'warning',
      title: 'New cybercrime report',
      body: `${fullName} submitted a ${incidentType} report (${ticketNumber})`,
      link: `${process.env.DASHBOARD_URL || 'https://yckf-admin-dashboard-production.up.railway.app'}/dashboard/reports`,
      caseId: caseRecord.id,
    }).catch(() => {});

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">CYBERCRIME REPORT</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Ticket: ${ticketNumber}</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Ticket Number</td><td style="padding: 8px;">${ticketNumber}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Reporter</td><td style="padding: 8px;">${fullName}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Email</td><td style="padding: 8px;">${email}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Phone</td><td style="padding: 8px;">${phone || 'Not provided'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Incident Type</td><td style="padding: 8px;">${incidentType}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Description</td><td style="padding: 8px;">${description}</td></tr>
          </table>
        </div>
      </div>
    `;

    // Notify admin + dev
    sendAdminNotification({
      ticketNumber,
      reportType: 'cybercrime',
      subject: `CYBERCRIME REPORT - ${ticketNumber}`,
      html: adminHtml,
    }).catch(() => {});

    // Notify ALL active volunteers
    const volunteers = await prisma.user.findMany({
      where: { role: 'VOLUNTEER', isActive: true },
    });
    for (const vol of volunteers) {
      sendEmail({
        ticketNumber,
        reportType: 'cybercrime',
        recipientEmail: vol.email,
        subject: `New Cybercrime Case Assigned - ${ticketNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #2563EB; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">New Cybercrime Case</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">Ticket: ${ticketNumber}</p>
            </div>
            <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
              <p>Dear ${vol.fullName},</p>
              <p>A new cybercrime report has been submitted and requires attention.</p>
              <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 15px 0;">
                <p style="margin: 0; color: #64748b; font-size: 12px;">TICKET NUMBER</p>
                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #2563EB;">${ticketNumber}</p>
              </div>
              <p><strong>Incident Type:</strong> ${incidentType}</p>
              <p><strong>Reporter:</strong> ${fullName}</p>
              <p>Please log in to your dashboard to view full details and accept this case.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #94a3b8;">Young Cyber Knights Foundation | Cybersecurity & Digital Safety</p>
            </div>
          </div>
        `,
      }).catch(() => {});
    }

    // Acknowledgement to reporter
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
    console.error('Failed to submit report', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// Admin + Volunteer: List all reports
router.get('/', verifyToken, isInvestigator, async (req: Request, res: Response) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        cases: {
          include: {
            assignedInvestigator: { select: { id: true, fullName: true, email: true } },
            responses: { include: { author: { select: { id: true, fullName: true, role: true } } } },
          },
        },
        evidence: true,
      },
    });
    res.json(reports);
  } catch (err) {
    console.error('Failed to list reports');
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

// User: Get own reports (cybercrime)
router.get('/my', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const reports = await prisma.report.findMany({
      where: { OR: [{ userId: user.id }, { reporterEmail: user.email }] },
      orderBy: { createdAt: 'desc' },
      include: {
        cases: {
          include: {
            assignedInvestigator: { select: { id: true, fullName: true } },
            responses: { include: { author: { select: { id: true, fullName: true, role: true } } } },
          },
        },
      },
    });
    res.json(reports);
  } catch (err) {
    console.error('Failed to get user reports');
    res.status(500).json({ error: 'Failed to get user reports' });
  }
});

// Get single report with full details
router.get('/:id', verifyToken, isInvestigator, async (req: Request, res: Response) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        cases: {
          include: {
            assignedInvestigator: { select: { id: true, fullName: true, email: true } },
            responses: { include: { author: { select: { id: true, fullName: true, role: true } } } },
            notes: true,
            history: true,
          },
        },
        evidence: true,
      },
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (err) {
    console.error('Failed to get report');
    res.status(500).json({ error: 'Failed to get report' });
  }
});

// Admin: Assign case to a volunteer
router.post('/:id/assign', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const reportId = Number(req.params.id);
    const { volunteerId } = req.body;

    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });

    const report = await prisma.report.findUnique({ where: { id: reportId }, include: { cases: true } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const volunteer = await prisma.user.findUnique({ where: { id: Number(volunteerId) } });
    if (!volunteer || (volunteer.role !== 'VOLUNTEER' && volunteer.role !== 'INVESTIGATOR')) {
      return res.status(400).json({ error: 'Invalid volunteer' });
    }

    const caseRecord = report.cases[0];
    if (!caseRecord) return res.status(400).json({ error: 'No case linked to this report' });

    await prisma.case.update({
      where: { id: caseRecord.id },
      data: {
        assignedInvestigatorId: Number(volunteerId),
        status: 'assigned',
      },
    });

    // Create notification for the volunteer
    await prisma.notification.create({
      data: {
        type: 'case_assigned',
        title: 'Case Assigned to You',
        body: `You have been assigned case ${report.ticketNumber}. Please review and respond.`,
        recipientId: Number(volunteerId),
        senderId: (req as any).user.id,
        caseId: caseRecord.id,
      },
    });

    // Email the volunteer
    sendEmail({
      ticketNumber: report.ticketNumber,
      reportType: 'cybercrime',
      recipientEmail: volunteer.email,
      subject: `Case Assigned to You - ${report.ticketNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2563EB; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">Case Assigned to You</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Ticket: ${report.ticketNumber}</p>
          </div>
          <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Dear ${volunteer.fullName},</p>
            <p>An admin has assigned a cybercrime case to you. Please log in to your dashboard to review the case details and respond to the complainant.</p>
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 15px 0;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">TICKET NUMBER</p>
              <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #2563EB;">${report.ticketNumber}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8;">Young Cyber Knights Foundation | Cybersecurity & Digital Safety</p>
          </div>
        </div>
      `,
    }).catch(() => {});

    await logAudit((req as any).user.id, 'assign case', reportId, String(req.ip || 'unknown'));

    res.json({ success: true, message: `Case assigned to ${volunteer.fullName}` });
  } catch (err) {
    console.error('Failed to assign case');
    res.status(500).json({ error: 'Failed to assign case' });
  }
});

// Admin/Volunteer: Accept a case
router.post('/:id/accept', verifyToken, isInvestigator, async (req: Request, res: Response) => {
  try {
    const reportId = Number(req.params.id);
    const report = await prisma.report.findUnique({ where: { id: reportId }, include: { cases: true } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const caseRecord = report.cases[0];
    if (!caseRecord) return res.status(400).json({ error: 'No case linked to this report' });

    await prisma.case.update({
      where: { id: caseRecord.id },
      data: {
        assignedInvestigatorId: (req as any).user.id,
        status: 'accepted',
      },
    });

    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'in_progress' },
    });

    await logAudit((req as any).user.id, 'accept case', reportId, String(req.ip || 'unknown'));

    res.json({ success: true, message: 'Case accepted' });
  } catch (err) {
    console.error('Failed to accept case');
    res.status(500).json({ error: 'Failed to accept case' });
  }
});

// Admin/Volunteer: Respond to complainant
router.post('/:id/respond', verifyToken, isInvestigator, async (req: Request, res: Response) => {
  try {
    const reportId = Number(req.params.id);
    const { responseText } = req.body;

    if (!responseText?.trim()) return res.status(400).json({ error: 'responseText is required' });

    const report = await prisma.report.findUnique({ where: { id: reportId }, include: { cases: true } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const caseRecord = report.cases[0];
    if (!caseRecord) return res.status(400).json({ error: 'No case linked to this report' });

    const author = await prisma.user.findUnique({ where: { id: (req as any).user.id } });

    // Save the response
    const caseResponse = await prisma.caseResponse.create({
      data: {
        caseId: caseRecord.id,
        authorId: (req as any).user.id,
        responseText: responseText.trim(),
      },
    });

    // Email the complainant
    if (report.reporterEmail) {
      sendEmail({
        ticketNumber: report.ticketNumber,
        reportType: 'cybercrime',
        recipientEmail: report.reporterEmail,
        subject: `Response to Your Cybercrime Report - ${report.ticketNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #2563EB; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">Case Update - ${report.ticketNumber}</h1>
            </div>
            <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
              <p>Dear ${report.reporterName || 'Valued Client'},</p>
              <p>Your cybercrime report (<strong>${report.ticketNumber}</strong>) has been reviewed. Here is the response from our team:</p>
              <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 15px 0;">
                <p style="margin: 0; color: #64748b; font-size: 12px;">RESPONSE FROM ${author?.fullName || 'YCKF Team'}</p>
                <p style="margin: 8px 0 0 0; white-space: pre-wrap;">${responseText}</p>
              </div>
              <p>If you need further assistance, please reply to this email or contact us through the YCKF app.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #94a3b8;">Young Cyber Knights Foundation | Cybersecurity & Digital Safety</p>
            </div>
          </div>
        `,
      }).catch(() => {});
    }

    await logAudit((req as any).user.id, 'respond to case', reportId, String(req.ip || 'unknown'));

    res.json({ success: true, response: caseResponse });
  } catch (err) {
    console.error('Failed to respond to case');
    res.status(500).json({ error: 'Failed to respond to case' });
  }
});

// Admin/Volunteer: Update report status
router.put('/:id/status', verifyToken, isInvestigator, async (req: Request, res: Response) => {
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

    // Also update the linked case status
    const caseRecord = await prisma.case.findFirst({ where: { reportId: report.id } });
    if (caseRecord) {
      await prisma.case.update({
        where: { id: caseRecord.id },
        data: { status },
      });
    }

    res.json(report);
  } catch (err) {
    console.error('Failed to update report status');
    res.status(500).json({ error: 'Failed to update report status' });
  }
});

// Admin: Delete report
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
