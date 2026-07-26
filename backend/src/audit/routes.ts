import { Response, Router } from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken, isAdmin, AuthRequest } from '../auth/middleware.js';
import { prisma } from '../shared/db.js';
import { validateRequest } from '../utils/validators.js';

const router = Router();
const ROLES = ['ADMIN', 'INVESTIGATOR', 'VOLUNTEER', 'USER'];
const STATUS_OPTIONS = ['active', 'inactive'];

router.get(
  '/audit-logs',
  verifyToken,
  isAdmin,
  [
    query('start_date').optional().isISO8601().withMessage('Invalid start_date'),
    query('end_date').optional().isISO8601().withMessage('Invalid end_date'),
    query('userId').optional().isInt().withMessage('Invalid userId'),
    query('action').optional().trim().notEmpty().withMessage('Action filter must be a string'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const { start_date, end_date, userId, action } = req.query;
      const where: any = {};
      if (start_date || end_date) {
        where.timestamp = {};
        if (start_date) where.timestamp.gte = new Date(String(start_date));
        if (end_date) {
          const endDate = new Date(String(end_date));
          endDate.setUTCHours(23, 59, 59, 999);
          where.timestamp.lte = endDate;
        }
      }
      if (userId) where.userId = Number(userId);
      if (action) where.action = { contains: String(action), mode: 'insensitive' };

      const auditLogs = await prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
        },
        orderBy: { timestamp: 'desc' },
      });

      res.json({ auditLogs });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load audit logs' });
    }
  }
);

router.get(
  '/audit-logs/export',
  verifyToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      const logs = await prisma.auditLog.findMany({
        where: { timestamp: { gte: start } },
        include: { user: { select: { email: true, fullName: true } } },
        orderBy: { timestamp: 'desc' },
      });

      const csvHeader = 'timestamp,user_email,user_name,action,target_id,ip_address';
      const csvRows = logs.map((log) => {
        const userEmail = log.user?.email ?? 'system';
        const userName = log.user?.fullName ?? 'system';
        return [
          log.timestamp.toISOString(),
          userEmail,
          JSON.stringify(userName),
          log.action,
          log.targetId ?? '',
          log.ipAddress,
        ].join(',');
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
      res.send([csvHeader, ...csvRows].join('\n'));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to export audit logs' });
    }
  }
);

export default router;
