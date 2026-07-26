import { Router } from 'express';
import { verifyToken, isAdmin } from '../auth/middleware.js';
import { prisma } from '../shared/db.js';
import { logAudit } from '../audit/service.js';

const router = Router();

router.get('/platform-report', verifyToken, isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const seventyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      mobileUsers,
      webUsers,
      activeUsers,
      totalVolunteers,
      totalAdmins,
      totalInvestigators,
      totalIncidents,
      openIncidents,
      investigatingIncidents,
      pendingIncidents,
      resolvedIncidents,
      closedIncidents,
      criticalIncidents,
      totalEmergencyReports,
      pendingEmergencyReports,
      resolvedEmergencyReports,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      totalEnquiries,
      newEnquiries,
      openEnquiries,
      resolvedEnquiries,
      totalEvidence,
      totalCases,
      activeCases,
      usersLast30Days,
      incidentsLast30Days,
      reportsLast30Days,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { platform: 'MOBILE' } }),
      prisma.user.count({ where: { platform: 'WEB' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'VOLUNTEER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'INVESTIGATOR' } }),
      prisma.report.count(),
      prisma.report.count({ where: { status: 'open' } }),
      prisma.report.count({ where: { status: 'investigating' } }),
      prisma.report.count({ where: { status: 'pending_evidence' } }),
      prisma.report.count({ where: { status: 'resolved' } }),
      prisma.report.count({ where: { status: 'closed' } }),
      prisma.report.count({ where: { priority: 'critical' } }),
      prisma.emergencyReport.count(),
      prisma.emergencyReport.count({ where: { status: 'pending' } }),
      prisma.emergencyReport.count({ where: { status: 'resolved' } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'pending' } }),
      prisma.booking.count({ where: { status: 'confirmed' } }),
      prisma.booking.count({ where: { status: 'completed' } }),
      prisma.enquiry.count(),
      prisma.enquiry.count({ where: { status: 'new' } }),
      prisma.enquiry.count({ where: { status: 'open' } }),
      prisma.enquiry.count({ where: { status: 'resolved' } }),
      prisma.evidence.count(),
      prisma.case.count(),
      prisma.case.count({ where: { status: { in: ['open', 'investigating', 'pending_evidence'] } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.report.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.report.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    const caseClosureRate = totalIncidents > 0
      ? Math.round(((resolvedIncidents + closedIncidents) / totalIncidents) * 100)
      : 0;

    const avgResponseTimeSeconds = await prisma.case.findMany({
      include: { report: { select: { createdAt: true } } },
    }).then((cases) => {
      const times = cases
        .filter((c: any) => c.report?.createdAt)
        .map((c: any) => (c.createdAt.getTime() - c.report.createdAt.getTime()) / 1000);
      return times.length > 0 ? Math.round(times.reduce((s: number, t: number) => s + t, 0) / times.length) : 0;
    });

    const avgResponseTimeHours = (avgResponseTimeSeconds / 3600).toFixed(1);

    await logAudit(
      (req as any).user?.id ?? null,
      'export_pdf:platform-report:1',
      null,
      String(req.ip || 'unknown')
    );

    res.json({
      generatedAt: now.toISOString(),
      period: 'Platform Lifetime Report',
      organisation: {
        name: 'Young Cyber Knights Foundation',
        mission: 'Empowering young people through cybersecurity education, digital safety awareness, and incident response capabilities.',
        founder: 'Bright Peter Kwaku Boateng',
      },
      users: {
        total: totalUsers,
        mobile: mobileUsers,
        web: webUsers,
        active: activeUsers,
        volunteers: totalVolunteers,
        investigators: totalInvestigators,
        admins: totalAdmins,
        newLast30Days: usersLast30Days,
      },
      incidents: {
        total: totalIncidents,
        open: openIncidents,
        investigating: investigatingIncidents,
        pendingEvidence: pendingIncidents,
        resolved: resolvedIncidents,
        closed: closedIncidents,
        critical: criticalIncidents,
        caseClosureRate,
        avgResponseTimeHours,
        newLast30Days: incidentsLast30Days,
      },
      emergencyReports: {
        total: totalEmergencyReports,
        pending: pendingEmergencyReports,
        resolved: resolvedEmergencyReports,
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        completed: completedBookings,
      },
      enquiries: {
        total: totalEnquiries,
        new: newEnquiries,
        open: openEnquiries,
        resolved: resolvedEnquiries,
      },
      evidence: {
        total: totalEvidence,
      },
      cases: {
        total: totalCases,
        active: activeCases,
      },
    });
  } catch (error) {
    console.error('Platform report error:', error);
    res.status(500).json({ error: 'Failed to generate platform report' });
  }
});

export default router;
