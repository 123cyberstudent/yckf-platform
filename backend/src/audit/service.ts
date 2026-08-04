import { prisma } from '../shared/db.js';

export interface AuditOptions {
  entityType?: string;
  entityId?: number | null;
  previousValue?: unknown;
  newValue?: unknown;
  userAgent?: string;
}

export async function logAudit(
  userId: number | null,
  action: string,
  targetId: number | null,
  ipAddress: string,
  options: AuditOptions = {}
) {
  return prisma.auditLog.create({
    data: {
      userId: userId ?? undefined,
      action,
      targetId: targetId ?? undefined,
      ipAddress,
      entityType: options.entityType,
      entityId: options.entityId ?? undefined,
      previousValue: options.previousValue === undefined ? undefined : (options.previousValue as object),
      newValue: options.newValue === undefined ? undefined : (options.newValue as object),
      userAgent: options.userAgent,
    },
  });
}
