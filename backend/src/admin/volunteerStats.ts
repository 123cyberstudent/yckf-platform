import { Router, Response } from 'express';
import { verifyToken, AuthRequest } from '../auth/middleware.js';
import { prisma } from '../shared/db.js';

const router = Router();

router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user!.role;
    if (role !== 'ADMIN' && role !== 'VOLUNTEER') {
      return res.status(403).json({ error: 'Admin or volunteer access required' });
    }

    const volunteerId = req.query.volunteerId ? Number(req.query.volunteerId) : req.user!.id;

    if (role !== 'ADMIN' && volunteerId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const allCases = await prisma.case.findMany({
      where: { assignedInvestigatorId: volunteerId },
      include: {
        history: { orderBy: { changedAt: 'desc' } },
      },
    });

    const totalAssigned = allCases.length;

    const casesByStatus: Record<string, number> = { open: 0, investigating: 0, pending_evidence: 0, resolved: 0, closed: 0 };
    for (const c of allCases) {
      if (casesByStatus[c.status] !== undefined) {
        casesByStatus[c.status]++;
      }
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let resolvedThisMonth = 0;
    let resolvedThisYear = 0;
    let totalResolutionTimeMs = 0;
    let resolvedCount = 0;

    for (const c of allCases) {
      const resolvedEntry = c.history.find(
        (h) => h.newStatus === 'resolved' || h.newStatus === 'closed'
      );
      if (resolvedEntry) {
        const resolvedAt = resolvedEntry.changedAt;
        if (resolvedAt >= startOfMonth) resolvedThisMonth++;
        if (resolvedAt >= startOfYear) resolvedThisYear++;
        totalResolutionTimeMs += resolvedAt.getTime() - c.createdAt.getTime();
        resolvedCount++;
      }
    }

    const avgResolutionTimeMs = resolvedCount > 0 ? totalResolutionTimeMs / resolvedCount : 0;
    const avgResolutionTimeHours = avgResolutionTimeMs / (1000 * 60 * 60);

    const recentActivity = await prisma.caseHistory.findMany({
      where: { changedById: volunteerId },
      include: {
        case: { select: { id: true, status: true, report: { select: { title: true } } } },
      },
      orderBy: { changedAt: 'desc' },
      take: 10,
    });

    res.json({
      totalAssigned,
      casesByStatus,
      resolvedThisMonth,
      resolvedThisYear,
      avgResolutionTimeHours: Math.round(avgResolutionTimeHours * 10) / 10,
      recentActivity,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load volunteer stats' });
  }
});

export default router;
