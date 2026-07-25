import { prisma } from './db.js';

export async function logAudit(userId: number | null, action: string, targetId: number | null, ipAddress: string) {
  return prisma.auditLog.create({
    data: {
      userId: userId ?? undefined,
      action,
      targetId: targetId ?? undefined,
      ipAddress,
    },
  });
}
