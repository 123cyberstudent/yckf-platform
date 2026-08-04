-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "entityId" INTEGER,
ADD COLUMN     "entityType" TEXT,
ADD COLUMN     "newValue" JSONB,
ADD COLUMN     "previousValue" JSONB,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "accessDurationUnit" TEXT NOT NULL DEFAULT 'hours',
ADD COLUMN     "accessDurationValue" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "perUserLimit" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "validFrom" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CouponRedemption" ADD COLUMN     "accessStartsAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "EmergencyReport" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedById" INTEGER,
ADD COLUMN     "assignmentNote" TEXT,
ADD COLUMN     "attachments" JSONB,
ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "incidentType" TEXT,
ADD COLUMN     "mapsLink" TEXT,
ADD COLUMN     "nearestStationId" INTEGER,
ADD COLUMN     "stationDistance" DOUBLE PRECISION,
ADD COLUMN     "unassignedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "relatedEntityId" INTEGER,
ADD COLUMN     "relatedEntityType" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'paystack';

-- CreateTable
CREATE TABLE "EmergencyReportAssignment" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "assigneeId" INTEGER NOT NULL,
    "assignedById" INTEGER,
    "note" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'assigned',

    CONSTRAINT "EmergencyReportAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "audience" TEXT NOT NULL DEFAULT 'all_users',
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastRecipient" (
    "id" SERIAL NOT NULL,
    "broadcastId" INTEGER NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "notificationId" INTEGER,
    "emailStatus" TEXT NOT NULL DEFAULT 'queued',
    "emailError" TEXT,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmergencyReportAssignment_reportId_idx" ON "EmergencyReportAssignment"("reportId");

-- CreateIndex
CREATE INDEX "EmergencyReportAssignment_assigneeId_idx" ON "EmergencyReportAssignment"("assigneeId");

-- CreateIndex
CREATE INDEX "EmergencyReportAssignment_status_idx" ON "EmergencyReportAssignment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BroadcastRecipient_notificationId_key" ON "BroadcastRecipient"("notificationId");

-- CreateIndex
CREATE INDEX "BroadcastRecipient_recipientId_idx" ON "BroadcastRecipient"("recipientId");

-- CreateIndex
CREATE INDEX "BroadcastRecipient_emailStatus_idx" ON "BroadcastRecipient"("emailStatus");

-- CreateIndex
CREATE UNIQUE INDEX "BroadcastRecipient_broadcastId_recipientId_key" ON "BroadcastRecipient"("broadcastId", "recipientId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "Notification_relatedEntityType_relatedEntityId_idx" ON "Notification"("relatedEntityType", "relatedEntityId");

-- AddForeignKey
ALTER TABLE "EmergencyReport" ADD CONSTRAINT "EmergencyReport_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyReportAssignment" ADD CONSTRAINT "EmergencyReportAssignment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "EmergencyReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyReportAssignment" ADD CONSTRAINT "EmergencyReportAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyReportAssignment" ADD CONSTRAINT "EmergencyReportAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastRecipient" ADD CONSTRAINT "BroadcastRecipient_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastRecipient" ADD CONSTRAINT "BroadcastRecipient_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data backfill: preserve existing coupon durations (all legacy coupons are hour-based)
UPDATE "Coupon" SET "accessDurationValue" = COALESCE("durationHours", 24), "accessDurationUnit" = 'hours';

-- Data backfill: existing redemptions started at their recorded redemption time
UPDATE "CouponRedemption" SET "accessStartsAt" = "redeemedAt";
