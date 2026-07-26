import { Response, Router } from 'express';
import { body, param } from 'express-validator';
import { verifyToken, isAdmin, isInvestigator, AuthRequest } from '../auth/middleware.js';
import { prisma } from '../shared/db.js';
import { validateRequest } from '../utils/validators.js';
import { logAudit } from '../audit/service.js';
import { createBroadcastNotification, createNotification, getNotificationsForUser, getUnreadCount, markAllNotificationsRead } from './service.js';

const router = Router();

router.post(
  '/broadcast',
  verifyToken,
  isAdmin,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('body').trim().notEmpty().withMessage('Body is required'),
    body('link').optional().isURL().withMessage('Link must be a valid URL'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const { title, body: message, link } = req.body;
      const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
      if (users.length === 0) {
        return res.status(400).json({ error: 'No active users available' });
      }

      const notifications = users.map((user: { id: any; }) => ({
        recipientId: user.id,
        senderId: req.user!.id,
        type: 'broadcast',
        title,
        body: message,
        link,
      }));

      await createBroadcastNotification(req.user!.id, title, message, link);
      await logAudit(req.user!.id, 'broadcast notification', null, String(req.ip));
      res.status(201).json({ message: 'Broadcast sent', recipients: users.length });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send broadcast' });
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

      const notification = await prisma.notification.create({
        data: {
          recipientId: caseItem.report.userId,
          senderId: req.user!.id,
          caseId,
          type: 'case_update',
          title: req.body.title,
          body: req.body.body,
          link: req.body.link,
        },
      });

      await logAudit(req.user!.id, 'case notification', caseId, String(req.ip));
      res.status(201).json(notification);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create case notification' });
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
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.recipientId !== req.user!.id) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
    await logAudit(req.user!.id, 'mark notification read', notificationId, String(req.ip));
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to mark notification read' });
  }
});

export default router;
