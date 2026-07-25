import { Router } from 'express';
import { verifyToken, isInvestigator } from '../auth/middleware.js';
import { prisma } from '../shared/db.js';
import PDFDocument from 'pdfkit';
import { getCache, setCache } from '../shared/cache.js';

const router = Router();

router.get('/stats', verifyToken, isInvestigator, async (req, res) => {
  try {
    const cacheKey = 'dashboard:stats';
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const totalUsers = await prisma.user.count();

    const activeCases = await prisma.case.count({
      where: { status: { in: ['open', 'investigating', 'pending_evidence'] } },
    });
    const pendingCases = await prisma.case.count({ where: { status: 'open' } });
    const resolvedCases = await prisma.case.count({ where: { status: 'resolved' } });

    const casesWithReports = await prisma.case.findMany({
      include: {
        report: { select: { createdAt: true } },
      },
    });
    const responseTimes = casesWithReports
      .filter((item: { report: { createdAt: any; }; }) => item.report?.createdAt)
      .map((item: { createdAt: { getTime: () => number; }; report: { createdAt: { getTime: () => number; }; }; }) => (item.createdAt.getTime() - item.report.createdAt.getTime()) / 1000);

    const avgResponseTimeSeconds = responseTimes.length > 0 ? responseTimes.reduce((sum: any, time: any) => sum + time, 0) / responseTimes.length : 0;

    const payload = {
      active_cases: activeCases,
      pending_cases: pendingCases,
      resolved_cases: resolvedCases,
      total_users: totalUsers,
      avg_response_time_seconds: Math.round(avgResponseTimeSeconds),
    };

    await setCache(cacheKey, payload, 300);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load dashboard stats' });
  }
});

router.get('/data', verifyToken, isInvestigator, async (req, res) => {
  try {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 5);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const reports = await prisma.report.findMany({
      where: { createdAt: { gte: startDate } },
      select: { incidentType: true, createdAt: true },
    });

    const months = Array.from({ length: 6 }, (_, index) => {
      const month = new Date(startDate.getFullYear(), startDate.getMonth() + index, 1);
      return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    });

    const incidentsPerMonth = months.map((monthLabel) => ({ month: monthLabel, count: 0 }));
    const incidentsByCategory: Record<string, number> = {};
    const heatmapByDay: Record<string, number> = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    };
    const incidentTypeCounts: Record<string, number> = {};

    reports.forEach((report: { createdAt: any; incidentType: string | number; }) => {
      const createdAt = report.createdAt;
      const label = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      const monthBucket = incidentsPerMonth.find((item) => item.month === label);
      if (monthBucket) monthBucket.count += 1;

      incidentsByCategory[report.incidentType] = (incidentsByCategory[report.incidentType] ?? 0) + 1;
      incidentTypeCounts[report.incidentType] = (incidentTypeCounts[report.incidentType] ?? 0) + 1;
      heatmapByDay[createdAt.toLocaleDateString('en-US', { weekday: 'long' })] += 1;
    });

    const cases = await prisma.case.findMany({
      include: {
        assignedInvestigator: { select: { id: true, fullName: true } },
        report: { select: { createdAt: true } },
      },
    });

    const investigatorCounts: Record<string, number> = {};
    const caseResolutionTimes: number[] = [];
    cases.forEach((caseItem: { assignedInvestigator: { fullName: any; }; report: { createdAt: { getTime: () => number; }; }; createdAt: { getTime: () => number; }; }) => {
      if (caseItem.assignedInvestigator) {
        const name = caseItem.assignedInvestigator.fullName;
        investigatorCounts[name] = (investigatorCounts[name] ?? 0) + 1;
      }
      if (caseItem.report?.createdAt) {
        caseResolutionTimes.push((caseItem.createdAt.getTime() - caseItem.report.createdAt.getTime()) / (1000 * 60 * 60));
      }
    });

    const totalCases = await prisma.case.count();
    const resolvedCases = await prisma.case.count({ where: { status: 'resolved' } });
    const closureRate = totalCases > 0 ? (resolvedCases / totalCases) * 100 : 0;
    const averageResponseTimeHours = caseResolutionTimes.length > 0 ? caseResolutionTimes.reduce((sum, time) => sum + time, 0) / caseResolutionTimes.length : 0;
    const mostCommonIncidentType = Object.entries(incidentTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const activeInvestigators = await prisma.user.count({ where: { role: 'INVESTIGATOR', isActive: true } });

    res.json({
      incidentsPerMonth,
      incidentsByCategory,
      casesByInvestigator: Object.entries(investigatorCounts).map(([name, count]) => ({ investigator: name, count })),
      heatmapByDay,
      caseClosureRate: Number(closureRate.toFixed(2)),
      averageResponseTimeHours: Number(averageResponseTimeHours.toFixed(2)),
      mostCommonIncidentType,
      activeInvestigators,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load analytics data' });
  }
});

router.get('/reports/export', verifyToken, isInvestigator, async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const reports = await prisma.report.findMany({
      where: { createdAt: { gte: since } },
      include: { user: { select: { email: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const rows = reports.map((report: { id: any; title: any; incidentType: any; priority: any; status: any; location: any; user: { fullName: any; email: any; }; createdAt: { toISOString: () => any; }; }) => [
      report.id,
      report.title,
      report.incidentType,
      report.priority,
      report.status,
      report.location,
      report.user.fullName,
      report.user.email,
      report.createdAt.toISOString(),
    ]);

    const header = ['id', 'title', 'incident_type', 'priority', 'status', 'location', 'reporter_name', 'reporter_email', 'created_at'];
    const csv = [header.join(','), ...rows.map((row: any[]) => row.map((value) => String(value).replace(/"/g, '""')).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=reports-last-30-days.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to export reports' });
  }
});

router.get('/cases/export', verifyToken, isInvestigator, async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const cases = await prisma.case.findMany({
      where: { createdAt: { gte: since } },
      include: {
        report: { select: { title: true } },
        assignedInvestigator: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=case-summary.pdf');
    doc.pipe(res);

    doc.fontSize(18).text('Case Summary (Last 30 Days)', { align: 'center' });
    doc.moveDown();

    cases.forEach((caseItem: { id: any; status: any; report: { title: any; }; assignedInvestigator: { fullName: any; }; createdAt: { toISOString: () => any; }; }, index: number) => {
      doc.fontSize(12).font('Helvetica-Bold').text(`Case #${caseItem.id}  —  Status: ${caseItem.status}`);
      doc.font('Helvetica').text(`Report: ${caseItem.report.title}`);
      doc.text(`Assigned investigator: ${caseItem.assignedInvestigator?.fullName ?? 'Unassigned'}`);
      doc.text(`Created at: ${caseItem.createdAt.toISOString()}`);
      doc.moveDown(0.5);
      if (index < cases.length - 1) {
        doc.moveDown();
      }
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to export case summary' });
  }
});

export default router;
