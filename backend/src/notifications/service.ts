import { prisma } from '../shared/db.js';
import { emitToAll, emitToUser } from '../shared/socket.js';
import { sendEmail } from '../email/service.js';

interface NotificationPayload {
  recipientId: number | null;
  senderId: number | null;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  caseId?: number | null;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
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
    priority: payload.priority ?? undefined,
    relatedEntityType: payload.relatedEntityType ?? undefined,
    relatedEntityId: payload.relatedEntityId ?? undefined,
  }});

  if (notification.recipientId) {
    emitToUser(notification.recipientId, 'notification:new', notification);
    emitToUser(notification.recipientId, 'notification:unreadCount', { unreadCount: await getUnreadCount(notification.recipientId) });
  }

  return notification;
}

export async function notifyAdmins(
  payload: Omit<NotificationPayload, 'recipientId' | 'senderId'>,
  senderId: number | null = null
) {
  const admins = await prisma.user.findMany({
    where: { isActive: true, role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
    select: { id: true },
  });
  for (const admin of admins) {
    await createNotification({ ...payload, senderId, recipientId: admin.id });
  }
  return admins.length;
}

export type BroadcastAudience = 'all_users' | 'volunteers' | 'investigators' | 'volunteers_and_investigators';

export function resolveAudience(users: { id: number; role: string; email: string }[], audience: BroadcastAudience) {
  switch (audience) {
    case 'volunteers':
      return users.filter((u) => u.role === 'VOLUNTEER');
    case 'investigators':
      return users.filter((u) => u.role === 'INVESTIGATOR');
    case 'volunteers_and_investigators':
      return users.filter((u) => u.role === 'VOLUNTEER' || u.role === 'INVESTIGATOR');
    default:
      return users;
  }
}

/**
 * Create a Broadcast record with per-recipient delivery tracking, in-app
 * notifications for registered users, and fire-and-forget individual emails.
 * Emails to addresses that don't map to a user are still queued/tracked.
 */
export async function createBroadcastNotification(
  senderId: number,
  title: string,
  body: string,
  link: string | undefined,
  audience: BroadcastAudience = 'all_users',
  recipientEmails: string[] = []
) {
  const broadcast = await prisma.broadcast.create({
    data: { title, body, link: link ?? null, audience, createdById: senderId },
  });

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, role: true, email: true },
  });
  const targets = resolveAudience(users, audience);

  const emailSet = new Set(recipientEmails.map((e) => e.trim().toLowerCase()).filter(Boolean));
  const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

  let recipientsCreated = 0;
  const emailJobs: { recipientId: number | null; recipientEmail: string }[] = [];

  // In-app notifications go to every audience member; emails are restricted to
  // the explicit email list when one is supplied, otherwise to the whole audience.
  for (const user of targets) {
    const email = user.email?.toLowerCase();
    const wantsEmail = emailSet.size === 0 || (email ? emailSet.has(email) : false);

    const notification = await prisma.notification.create({
      data: {
        recipientId: user.id,
        senderId,
        type: 'broadcast',
        title,
        body,
        link: link ?? null,
        relatedEntityType: 'broadcast',
        relatedEntityId: broadcast.id,
      },
    });
    emitToUser(user.id, 'notification:new', notification);
    emitToUser(user.id, 'notification:unreadCount', { unreadCount: await getUnreadCount(user.id) });

    await prisma.broadcastRecipient.create({
      data: {
        broadcastId: broadcast.id,
        recipientId: user.id,
        recipientEmail: user.email,
        notificationId: notification.id,
        emailStatus: wantsEmail ? 'queued' : 'skipped',
      },
    });
    recipientsCreated += 1;
    if (wantsEmail && email) {
      emailJobs.push({ recipientId: user.id, recipientEmail: email });
    }
  }

  // Email-only addresses that aren't registered users
  for (const email of emailSet) {
    if (userByEmail.has(email)) continue;
    const recipient = await prisma.broadcastRecipient.create({
      data: {
        broadcastId: broadcast.id,
        recipientId: null,
        recipientEmail: email,
        emailStatus: 'queued',
      },
    });
    recipientsCreated += 1;
    emailJobs.push({ recipientId: null, recipientEmail: email });
  }

  // Fire-and-forget individual emails (queued/tracked per recipient, no double-send)
  if (emailJobs.length > 0) {
    const html = buildBroadcastEmailHtml(title, body, link);
    void Promise.allSettled(
      emailJobs.map((job) =>
        (async () => {
          const recipientRow = await prisma.broadcastRecipient.findFirst({
            where: {
              broadcastId: broadcast.id,
              ...(job.recipientId ? { recipientId: job.recipientId } : { recipientEmail: job.recipientEmail }),
            },
            orderBy: { id: 'desc' },
          });
          const result = await sendEmail({
            ticketNumber: `broadcast-${broadcast.id}`,
            reportType: 'broadcast',
            recipientEmail: job.recipientEmail,
            subject: title,
            html,
          });
          if (recipientRow) {
            await prisma.broadcastRecipient.update({
              where: { id: recipientRow.id },
              data: {
                emailStatus: result.success ? 'sent' : 'failed',
                sentAt: result.success ? new Date() : null,
                emailError: result.success ? null : 'Email delivery failed',
              },
            });
          }
        })()
      )
    );
  }

  emitToAll('notification:broadcast', { title, body, link, audience, broadcastId: broadcast.id });
  return { broadcastId: broadcast.id, recipients: recipientsCreated, emailsQueued: emailJobs.length };
}

function buildBroadcastEmailHtml(title: string, body: string, link?: string) {
  const safeBody = String(body || '').replace(/\n/g, '<br />');
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #2563EB; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Young Cyber Knights Foundation</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Announcement</p>
      </div>
      <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="margin: 0 0 12px 0; color: #0f172a;">${title}</h2>
        <p style="color: #334155;">${safeBody}</p>
        ${link ? `<p style="text-align: center; margin: 24px 0;"><a href="${link}" style="display: inline-block; background: #2563EB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open in app</a></p>` : ''}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">You are receiving this because you are part of the Young Cyber Knights Foundation community.</p>
      </div>
    </div>
  `;
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const updated = await prisma.notification.updateMany({
    where: { id: notificationId, recipientId: userId },
    data: { isRead: true, readAt: new Date() },
  });
  return updated.count;
}

export async function getUnreadCount(userId: number) {
  return prisma.notification.count({ where: { recipientId: userId, isRead: false } });
}

export async function markAllNotificationsRead(userId: number) {
  const result = await prisma.notification.updateMany({ where: { recipientId: userId, isRead: false }, data: { isRead: true, readAt: new Date() } });
  emitToUser(userId, 'notification:markAllRead', { count: result.count });
  return result.count;
}

export async function getNotificationsForUser(userId: number) {
  return prisma.notification.findMany({ where: { recipientId: userId }, orderBy: { createdAt: 'desc' } });
}
