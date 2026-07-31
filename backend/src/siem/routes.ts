import { Router, Request, Response } from 'express';
import { prisma } from '../shared/db.js';
import { verifyToken, isAdmin } from '../auth/middleware.js';

const router = Router();

router.get(
  '/events',
  verifyToken,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const {
        type,
        hours = '24',
        page = '1',
        limit = '50',
      } = req.query;

      const hoursNumber = Number(hours);
      const pageNumber = Number(page);
      const limitNumber = Number(limit);

      const safeHours =
        Number.isFinite(hoursNumber) && hoursNumber > 0
          ? hoursNumber
          : 24;

      const safePage =
        Number.isFinite(pageNumber) && pageNumber > 0
          ? pageNumber
          : 1;

      const safeLimit =
        Number.isFinite(limitNumber) && limitNumber > 0
          ? Math.min(limitNumber, 200)
          : 50;

      const since = new Date(
        Date.now() - safeHours * 60 * 60 * 1000,
      );

      const skip = (safePage - 1) * safeLimit;

      const auditWhere: {
        timestamp: {
          gte: Date;
        };
      } = {
        timestamp: {
          gte: since,
        },
      };

      const loginWhere: {
        createdAt: {
          gte: Date;
        };
        success?: boolean;
      } = {
        createdAt: {
          gte: since,
        },
      };

      if (type === 'failed_login') {
        loginWhere.success = false;
      }

      if (type === 'successful_login') {
        loginWhere.success = true;
      }

      const [auditLogs, loginLogs] = await Promise.all([
        prisma.auditLog.findMany({
          where: auditWhere,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
          take: 200,
        }),

        prisma.loginLog.findMany({
          where: loginWhere,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 200,
        }),
      ]);

      const auditEvents = auditLogs.map(
        (log: (typeof auditLogs)[number]) => ({
          id: String(log.id),
          category: 'audit',
          type: classifyAuditAction(log.action),
          severity: classifyAuditSeverity(log.action),
          action: log.action,
          userId: log.userId,
          userEmail: log.user?.email ?? 'system',
          userName: log.user?.fullName ?? 'System',
          targetId: log.targetId,
          ipAddress: log.ipAddress,
          timestamp: log.timestamp,
        }),
      );

      const loginEvents = loginLogs.map(
        (log: (typeof loginLogs)[number]) => ({
          id: `login-${log.id}`,
          category: 'auth',
          type: log.success
            ? 'successful_login'
            : 'failed_login',
          severity: log.success ? 'low' : 'high',
          action: log.success
            ? 'Login successful'
            : 'Login failed',
          userId: log.userId,
          userEmail: log.email,
          userName: log.user?.fullName ?? 'Unknown',
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          failureReason: log.failureReason,
          timestamp: log.createdAt,
        }),
      );

      const events = [...auditEvents, ...loginEvents].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime(),
      );

      const total = events.length;
      const paginated = events.slice(
        skip,
        skip + safeLimit,
      );

      res.json({
        events: paginated,
        total,
        page: safePage,
        pages: Math.ceil(total / safeLimit),
      });
    } catch (err: unknown) {
      console.error('SIEM events error:', err);

      res.status(500).json({
        error: 'Failed to load SIEM events',
      });
    }
  },
);

router.get(
  '/alerts',
  verifyToken,
  isAdmin,
  async (_req: Request, res: Response) => {
    try {
      const since24h = new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      );

      const since1h = new Date(
        Date.now() - 60 * 60 * 1000,
      );

      const [
        failedLogins24h,
        failedLogins1h,
        totalUsers,
        activeCases,
        recentEvidence,
        recentAudit,
      ] = await Promise.all([
        prisma.loginLog.count({
          where: {
            createdAt: {
              gte: since24h,
            },
            success: false,
          },
        }),

        prisma.loginLog.count({
          where: {
            createdAt: {
              gte: since1h,
            },
            success: false,
          },
        }),

        prisma.user.count({
          where: {
            isActive: true,
          },
        }),

        prisma.case.count({
          where: {
            status: {
              notIn: ['resolved', 'closed'],
            },
          },
        }),

        prisma.evidence.count({
          where: {
            uploadedAt: {
              gte: since24h,
            },
          },
        }),

        prisma.auditLog.count({
          where: {
            timestamp: {
              gte: since24h,
            },
          },
        }),
      ]);

      const topFailedIPs =
        await prisma.loginLog.groupBy({
          by: ['ipAddress'],
          where: {
            createdAt: {
              gte: since24h,
            },
            success: false,
          },
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
          take: 5,
        });

      const topFailedEmails =
        await prisma.loginLog.groupBy({
          by: ['email'],
          where: {
            createdAt: {
              gte: since24h,
            },
            success: false,
          },
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
          take: 5,
        });

      const alerts: Array<{
        id: string;
        severity:
          | 'critical'
          | 'high'
          | 'medium'
          | 'low'
          | 'info';
        title: string;
        description: string;
        timestamp: string;
      }> = [];

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

      topFailedIPs.forEach(
        (ip: (typeof topFailedIPs)[number]) => {
          if (ip._count.id >= 3) {
            alerts.push({
              id: `suspicious-ip-${ip.ipAddress ?? 'unknown'}`,
              severity: 'high',
              title: 'Suspicious IP Address',
              description: `${ip._count.id} failed attempts from ${
                ip.ipAddress ?? 'unknown IP'
              }`,
              timestamp: new Date().toISOString(),
            });
          }
        },
      );

      topFailedEmails.forEach(
        (entry: (typeof topFailedEmails)[number]) => {
          if (entry._count.id >= 3) {
            alerts.push({
              id: `targeted-account-${entry.email}`,
              severity: 'medium',
              title: 'Targeted Account',
              description: `${entry._count.id} failed attempts for ${entry.email}`,
              timestamp: new Date().toISOString(),
            });
          }
        },
      );

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
    } catch (err: unknown) {
      console.error('SIEM alerts error:', err);

      res.status(500).json({
        error: 'Failed to load SIEM alerts',
      });
    }
  },
);

router.get(
  '/status',
  verifyToken,
  isAdmin,
  async (_req: Request, res: Response) => {
    try {
      const [auditCount, loginCount, emailLogCount] =
        await Promise.all([
          prisma.auditLog.count(),
          prisma.loginLog.count(),
          prisma.emailLog.count(),
        ]);

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
    } catch (err: unknown) {
      console.error('SIEM status error:', err);

      res.status(500).json({
        connected: false,
        status: 'error',
        error:
          err instanceof Error
            ? err.message
            : String(err),
      });
    }
  },
);

function classifyAuditAction(action: string): string {
  const normalizedAction = action.toLowerCase();

  if (normalizedAction.includes('login')) {
    return 'authentication';
  }

  if (
    normalizedAction.includes('upload') ||
    normalizedAction.includes('evidence')
  ) {
    return 'evidence';
  }

  if (
    normalizedAction.includes('create') ||
    normalizedAction.includes('update') ||
    normalizedAction.includes('delete')
  ) {
    return 'data_modification';
  }

  if (
    normalizedAction.includes('view') ||
    normalizedAction.includes('download') ||
    normalizedAction.includes('export')
  ) {
    return 'data_access';
  }

  return 'system';
}

function classifyAuditSeverity(action: string): string {
  const normalizedAction = action.toLowerCase();

  if (normalizedAction.includes('delete')) {
    return 'high';
  }

  if (
    normalizedAction.includes('export') ||
    normalizedAction.includes('download')
  ) {
    return 'medium';
  }

  if (
    normalizedAction.includes('create') ||
    normalizedAction.includes('update')
  ) {
    return 'low';
  }

  return 'info';
}

export default router;