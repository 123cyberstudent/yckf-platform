import { Response, Router } from 'express';
import { verifyToken, isAdmin, isInvestigator, AuthRequest } from '../auth/middleware.js';
import { prisma } from '../shared/db.js';

const router = Router();

// Get all investigators
router.get(
  '/',
  verifyToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const investigators = await prisma.user.findMany({
        where: { role: 'INVESTIGATOR' },
        select: {
          id: true,
          email: true,
          fullName: true,
          isActive: true,
          createdAt: true,
          lastLogin: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ investigators });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load investigators' });
    }
  }
);

// Get investigator performance metrics
router.get(
  '/metrics/performance',
  verifyToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const investigators = await prisma.user.findMany({
        where: { role: 'INVESTIGATOR' },
        include: {
          casesAssigned: {
            include: {
              report: { select: { createdAt: true } },
            },
          },
        },
      });

      const metrics = investigators.map((inv: { casesAssigned: never[]; id: any; fullName: any; email: any; }) => {
        const assignedCases = inv.casesAssigned ?? [];
        const casesAssigned = assignedCases.length;
        const casesClosed = assignedCases.filter((caseItem: { status: string }) => caseItem.status === 'closed' || caseItem.status === 'resolved').length;
        const avgResolutionTime =
          assignedCases
            .filter((caseItem: { report?: { createdAt?: Date }; createdAt: Date }) => caseItem.report?.createdAt)
            .map((caseItem: { createdAt: Date; report: { createdAt: Date } }) => (caseItem.createdAt.getTime() - caseItem.report.createdAt.getTime()) / (1000 * 60 * 60))
            .reduce((sum: number, time: number) => sum + time, 0) / (casesAssigned || 1);

        return {
          id: inv.id,
          name: inv.fullName,
          email: inv.email,
          casesAssigned,
          casesClosed,
          closureRate: casesAssigned > 0 ? ((casesClosed / casesAssigned) * 100).toFixed(2) : '0',
          avgResolutionTimeHours: avgResolutionTime.toFixed(2),
          performanceScore: Math.min(100, Math.max(0, 70 + (casesAssigned > 0 ? (casesClosed / casesAssigned) * 30 : 0))),
        };
      });

      res.json({ metrics });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load metrics' });
    }
  }
);

// Get investigator by ID with assigned cases
router.get(
  '/:id',
  verifyToken,
  isInvestigator,
  async (req: AuthRequest, res: Response) => {
    try {
      const investigatorId = Number(req.params.id);
      // Only allow admins or the investigator themselves to view details
      if (req.user!.role !== 'ADMIN' && req.user!.id !== investigatorId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const investigator = await prisma.user.findUnique({
        where: { id: investigatorId },
        include: {
          casesAssigned: {
            include: {
              report: { select: { id: true, title: true } },
            },
          },
        },
      });

      if (!investigator || investigator.role !== 'INVESTIGATOR') {
        return res.status(404).json({ error: 'Investigator not found' });
      }

      res.json(investigator);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load investigator' });
    }
  }
);

export default router;
