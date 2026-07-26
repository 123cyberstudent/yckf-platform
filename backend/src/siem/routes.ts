import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';
import { verifyToken, isAdmin } from '../auth/middleware.js';

const router = Router();

router.get('/events', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { type, hours = '24', page = '1', limit = '50' } = req.query;
    const since = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);
    const skip = (Number(page) - 1) * Number(limit);

    const auditWhere: any = { timestamp: { gte: since } };
    const loginWhere: any = { createdAt: { gte: since } };

    if (type === 'failed_login') loginWhere.success = false;
    if (type === 'successful_login') loginWhere.success = true;

    const [auditLogs, loginLogs] = await Promise.all([
      prisma.auditLog.findMany({
        where: auditWhere,
        include: { user: { select: { id: true, email: true, fullName: true } } },
        orderBy: { timestamp: 'desc' },
        take: 200,
      }),
      prisma.loginLog.findMany({
        where: loginWhere,
        include: { user: { select: { id: true, email: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    const events = [
      ...auditLogs.map((log) => ({
        id: log.id,
        category: 'audit',
        type: classifyAuditAction(log.action),
        severity: classifyAuditSeverity(log.action),
        action: log.action,
        userId: log.userId,
        userEmail: log.user?.email || 'system',
        userName: log.user?.fullName || 'System',
        targetId: log.targetId,
        ipAddress: log.ipAddress,
        timestamp: log.timestamp,
      })),
      ...loginLogs.map((log) => ({
        id: log.id + 100000,
        category: 'auth',
        type: log.success ? 'successful_login' : 'failed_login',
        severity: log.success ? 'low' : 'high',
        action: log.success ? 'Login successful' : 'Login failed',
        userId: log.userId,
        userEmail: log.email,
        userName: log.user?.fullName || 'Unknown',
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        failureReason: log.failureReason,
        timestamp: log.createdAt,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = events.length;
    const paginated = events.slice(skip, skip + Number(limit));

    res.json({ events: paginated, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('SIEM events error:', err);
    res.status(500).json({ error: 'Failed to load SIEM events' });
  }
});

router.get('/alerts', verifyToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since1h = new Date(Date.now() - 60 * 60 * 1000);

    const [failedLogins24h, failedLogins1h, totalUsers, activeCases, recentEvidence, recentAudit] = await Promise.all([
      prisma.loginLog.count({ where: { createdAt: { gte: since24h }, success: false } }),
      prisma.loginLog.count({ where: { createdAt: { gte: since1h }, success: false } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.case.count({ where: { status: { notIn: ['resolved', 'closed'] } } }),
      prisma.evidence.count({ where: { uploadedAt: { gte: since24h } } }),
      prisma.auditLog.count({ where: { timestamp: { gte: since24h } } }),
    ]);

    const topFailedIPs = await prisma.loginLog.groupBy({
      by: ['ipAddress'],
      where: { createdAt: { gte: since24h }, success: false },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const topFailedEmails = await prisma.loginLog.groupBy({
      by: ['email'],
      where: { createdAt: { gte: since24h }, success: false },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const alerts: any[] = [];

    if (failedLogins1h >= 5) {
      alerts.push({
        id: 'brute-force-1h',
        severity: 'critical',
        title: 'Possible Brute Force Attack',
        description: `${failedLogins1h} failed login attempts in the last hour`,
        timestamp: new Date().toISOString(),
      });
    }

    if (failedLogins24h >= 20) {
      alerts.push({
        id: 'brute-force-24h',
        severity: 'high',
        title: 'High Failed Login Volume',
        description: `${failedLogins24h} failed login attempts in the last 24 hours`,
        timestamp: new Date().toISOString(),
      });
    }

    topFailedIPs.forEach((ip) => {
      if (ip._count.id >= 3) {
        alerts.push({
          id: `suspicious-ip-${ip.ipAddress}`,
          severity: 'high',
          title: 'Suspicious IP Address',
          description: `${ip._count.id} failed attempts from ${ip.ipAddress}`,
          timestamp: new Date().toISOString(),
        });
      }
    });

    topFailedEmails.forEach((e) => {
      if (e._count.id >= 3) {
        alerts.push({
          id: `targeted-account-${e.email}`,
          severity: 'medium',
          title: 'Targeted Account',
          description: `${e._count.id} failed attempts for ${e.email}`,
          timestamp: new Date().toISOString(),
        });
      }
    });

    if (activeCases > 0) {
      alerts.push({
        id: 'active-cases',
        severity: 'info',
        title: 'Active Cases',
        description: `${activeCases} case(s) currently under investigation`,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      summary: {
        failedLogins24h,
        failedLogins1h,
        totalUsers,
        activeCases,
        recentEvidence,
        recentAudit,
      },
      alerts,
    });
  } catch (err) {
    console.error('SIEM alerts error:', err);
    res.status(500).json({ error: 'Failed to load SIEM alerts' });
  }
});

router.get('/status', verifyToken, isAdmin, async (_req: Request, res: Response) => {
  try {
    const auditCount = await prisma.auditLog.count();
    const loginCount = await prisma.loginLog.count();
    const emailLogCount = await prisma.emailLog.count();

    res.json({
      connected: true,
      status: 'operational',
      uptime: process.uptime(),
      dataSources: {
        auditLogs: auditCount,
        loginLogs: loginCount,
        emailLogs: emailLogCount,
      },
      version: '1.0.0',
      lastSync: new Date().toISOString(),
    });
  } catch (err) {
    res.json({ connected: false, status: 'error', error: String(err) });
  }
});

function classifyAuditAction(action: string): string {
  if (action.includes('login')) return 'authentication';
  if (action.includes('upload') || action.includes('evidence')) return 'evidence';
  if (action.includes('create') || action.includes('update') || action.includes('delete')) return 'data_modification';
  if (action.includes('view') || action.includes('download') || action.includes('export')) return 'data_access';
  return 'system';
}

function classifyAuditSeverity(action: string): string {
  if (action.includes('delete')) return 'high';
  if (action.includes('export') || action.includes('download')) return 'medium';
  if (action.includes('create') || action.includes('update')) return 'low';
  return 'info';
}

export default router;
