import { prisma } from '../shared/db.js';
import { emitToAll, emitToUser } from '../shared/socket.js';

interface NotificationPayload {
  recipientId: number | null;
  senderId: number | null;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  caseId?: number | null;
}

export async function createNotification(payload: NotificationPayload) {
  const notification = await prisma.notification.create({ data: {
    recipientId: payload.recipientId ?? undefined,
    senderId: payload.senderId ?? undefined,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    link: payload.link ?? null,
    caseId: payload.caseId ?? undefined,
  }});

  if (notification.recipientId) {
    emitToUser(notification.recipientId, 'notification:new', notification);
    emitToUser(notification.recipientId, 'notification:unreadCount', { unreadCount: await getUnreadCount(notification.recipientId) });
  }

  return notification;
}

export async function createBroadcastNotification(senderId: number, title: string, body: string, link?: string) {
  const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
  const notifications = users.map((user: { id: any; }) => ({
    recipientId: user.id,
    senderId,
    type: 'broadcast',
    title,
    body,
    link: link ?? null,
  }));
  await prisma.notification.createMany({ data: notifications });
  emitToAll('notification:broadcast', { title, body, link });
  return users.length;
}

export async function getUnreadCount(userId: number) {
  return prisma.notification.count({ where: { recipientId: userId, isRead: false } });
}

export async function markAllNotificationsRead(userId: number) {
  const result = await prisma.notification.updateMany({ where: { recipientId: userId, isRead: false }, data: { isRead: true } });
  emitToUser(userId, 'notification:markAllRead', { count: result.count });
  return result.count;
}

export async function getNotificationsForUser(userId: number) {
  return prisma.notification.findMany({ where: { recipientId: userId }, orderBy: { createdAt: 'desc' } });
}
