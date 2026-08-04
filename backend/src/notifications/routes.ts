import { Response, Router } from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken, isAdmin, isInvestigator, AuthRequest } from '../auth/middleware.js';
import { prisma } from '../shared/db.js';
import { validateRequest } from '../utils/validators.js';
import { logAudit } from '../audit/service.js';
import { createBroadcastNotification, createNotification, getNotificationsForUser, getUnreadCount, markAllNotificationsRead, markNotificationRead, BroadcastAudience } from './service.js';

const router = Router();

const AUDIENCES: BroadcastAudience[] = ['all_users', 'volunteers', 'investigators', 'volunteers_and_investigators'];

router.post(
  '/broadcast',
  verifyToken,
  isAdmin,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('body').trim().notEmpty().withMessage('Body is required'),
    body('link').optional().isURL().withMessage('Link must be a valid URL'),
    body('audience').optional().isIn(AUDIENCES).withMessage('Invalid audience'),
    body('recipientEmails').optional().isArray().withMessage('recipientEmails must be an array'),
    body('recipientEmails.*').optional().isEmail().withMessage('Invalid email in recipientEmails'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const { title, body: message, link } = req.body;
      const audience: BroadcastAudience = req.body.audience || 'all_users';
      const recipientEmails: string[] = Array.isArray(req.body.recipientEmails) ? req.body.recipientEmails : [];

      const result = await createBroadcastNotification(req.user!.id, title, message, link, audience, recipientEmails);
      await logAudit(req.user!.id, 'broadcast notification', null, String(req.ip), {
        entityType: 'broadcast',
        entityId: result.broadcastId,
        newValue: { title, audience, recipients: result.recipients, emailsQueued: result.emailsQueued },
        userAgent: req.get('user-agent') ?? undefined,
      });
      res.status(201).json({ message: 'Broadcast sent', ...result });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send broadcast' });
    }
  }
);

router.get('/broadcasts', verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const broadcasts = await prisma.broadcast.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        _count: { select: { recipients: true } },
      },
    });
    res.json({ broadcasts });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load broadcasts' });
  }
});

router.get(
  '/broadcasts/:id',
  verifyToken,
  isAdmin,
  [param('id').isInt().withMessage('Broadcast ID must be an integer')],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const broadcastId = Number(req.params.id);
      const broadcast = await prisma.broadcast.findUnique({
        where: { id: broadcastId },
        include: {
          createdBy: { select: { id: true, fullName: true, email: true } },
          recipients: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              recipientEmail: true,
              recipient: { select: { id: true, fullName: true, email: true, role: true } },
              emailStatus: true,
              emailError: true,
              sentAt: true,
              readAt: true,
              createdAt: true,
            },
          },
        },
      });
      if (!broadcast) {
        return res.status(404).json({ error: 'Broadcast not found' });
      }
      res.json({ broadcast });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load broadcast' });
    }
  }
);

router.get('/unread-count', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const count = await getUnreadCount(req.user!.id);
    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get unread count' });
  }
});

router.put('/mark-all-read', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await markAllNotificationsRead(req.user!.id);
    await logAudit(req.user!.id, 'mark all notifications read', null, String(req.ip));
    res.json({ updated });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to mark notifications read' });
  }
});

router.post(
  '/case/:caseId',
  verifyToken,
  isInvestigator,
  [
    param('caseId').isInt().withMessage('Case ID must be an integer'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('body').trim().notEmpty().withMessage('Body is required'),
    body('link').optional().isURL().withMessage('Link must be a valid URL'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const caseId = Number(req.params.caseId);
      const caseItem = await prisma.case.findUnique({ where: { id: caseId }, include: { report: true } });
      if (!caseItem) {
        return res.status(404).json({ error: 'Case not found' });
      }

      const notification = await createNotification({
        recipientId: caseItem.report.userId,
        senderId: req.user!.id,
        caseId,
        type: 'case_update',
        title: req.body.title,
        body: req.body.body,
        link: req.body.link,
      });

      await logAudit(req.user!.id, 'case notification', caseId, String(req.ip));
      res.status(201).json(notification);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create case notification' });
    }
  }
);

router.get(
  '/:id',
  verifyToken,
  [param('id').isInt().withMessage('Notification ID must be an integer')],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const notificationId = Number(req.params.id);
      const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
      if (!notification || notification.recipientId !== req.user!.id) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      res.json({ notification });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load notification' });
    }
  }
);

router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await getNotificationsForUser(req.user!.id);
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load notifications' });
  }
});

router.put('/:id/read', verifyToken, [param('id').isInt().withMessage('Notification ID must be an integer')], validateRequest, async (req: AuthRequest, res: Response) => {
  try {
    const notificationId = Number(req.params.id);
    const updated = await markNotificationRead(req.user!.id, notificationId);
    if (updated === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    await logAudit(req.user!.id, 'mark notification read', notificationId, String(req.ip));
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to mark notification read' });
  }
});

export default router;
