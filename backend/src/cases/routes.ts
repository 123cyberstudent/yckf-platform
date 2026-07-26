import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';
import { verifyToken, isInvestigator, isAdmin } from '../auth/middleware.js';

const router = Router();

// List cases for the current user (if volunteer/admin, show assigned cases; if user, show own reports' cases)
router.get('/my', verifyToken, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: (req as any).user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let whereClause: any = {};
    if (user.role === 'ADMIN' || user.role === 'INVESTIGATOR') {
      whereClause = { assignedInvestigatorId: user.id };
    } else if (user.role === 'VOLUNTEER') {
      whereClause = { assignedInvestigatorId: user.id };
    } else {
      // Regular user: show cases from reports they submitted
      const userReports = await prisma.report.findMany({
        where: { reporterEmail: user.email },
        select: { id: true },
      });
      whereClause = { reportId: { in: userReports.map(r => r.id) } };
    }

    const cases = await prisma.case.findMany({
      where: whereClause,
      include: {
        report: { select: { id: true, ticketNumber: true, title: true, incidentType: true, reporterName: true, reporterEmail: true, status: true, createdAt: true } },
        assignedInvestigator: { select: { id: true, fullName: true } },
        responses: { include: { author: { select: { id: true, fullName: true, role: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ cases });
  } catch (err) {
    console.error('Failed to list cases');
    res.status(500).json({ error: 'Failed to list cases' });
  }
});

export default router;
