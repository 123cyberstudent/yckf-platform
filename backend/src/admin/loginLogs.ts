import { Router, Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../shared/db.js';

const router = Router();

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [total, successful, failed, uniqueUsers] = await Promise.all([
      prisma.loginLog.count(),
      prisma.loginLog.count({ where: { success: true } }),
      prisma.loginLog.count({ where: { success: false } }),
      prisma.loginLog.groupBy({ by: ['userId'], where: { userId: { not: null } } }).then((rows) => rows.length),
    ]);
    res.json({ total, successful, failed, uniqueUsers });
  } catch (err) {
    console.error('Failed to get login log stats:', err);
    res.status(500).json({ error: 'Failed to get login log stats' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.LoginLogWhereInput = {};
    if (req.query.email) {
      where.email = { contains: String(req.query.email), mode: 'insensitive' };
    }
    if (req.query.success !== undefined) {
      where.success = req.query.success === 'true';
    }

    const [logs, total] = await Promise.all([
      prisma.loginLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { id: true, fullName: true } } },
      }),
      prisma.loginLog.count({ where }),
    ]);

    res.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Failed to list login logs:', err);
    res.status(500).json({ error: 'Failed to list login logs' });
  }
});

export default router;
