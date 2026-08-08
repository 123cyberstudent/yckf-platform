-- CreateTable
CREATE TABLE "Device" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "internalDeviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'ANDROID',
    "deviceModel" TEXT,
    "osVersion" TEXT,
    "appVersion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "protectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sendLocationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "stealMode" TEXT NOT NULL DEFAULT 'silent',
    "notifyDashboard" BOOLEAN NOT NULL DEFAULT true,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "suspiciousThreshold" INTEGER NOT NULL DEFAULT 3,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskSignals" JSONB,
    "markedStolenAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "lastLatitude" DOUBLE PRECISION,
    "lastLongitude" DOUBLE PRECISION,
    "lastAddress" TEXT,
    "lastAccuracy" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceHeartbeat" (
    "id" SERIAL NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "address" TEXT,
    "battery" DOUBLE PRECISION,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StolenDeviceReport" (
    "id" SERIAL NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "description" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'HIGH',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "reportedByUserId" INTEGER,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StolenDeviceReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Device_userId_idx" ON "Device"("userId");

-- CreateIndex
CREATE INDEX "Device_status_idx" ON "Device"("status");

-- CreateIndex
CREATE INDEX "Device_lastSeenAt_idx" ON "Device"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "Device_userId_internalDeviceId_key" ON "Device"("userId", "internalDeviceId");

-- CreateIndex
CREATE INDEX "DeviceHeartbeat_deviceId_idx" ON "DeviceHeartbeat"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceHeartbeat_receivedAt_idx" ON "DeviceHeartbeat"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StolenDeviceReport_ticketNumber_key" ON "StolenDeviceReport"("ticketNumber");

-- CreateIndex
CREATE INDEX "StolenDeviceReport_userId_idx" ON "StolenDeviceReport"("userId");

-- CreateIndex
CREATE INDEX "StolenDeviceReport_deviceId_idx" ON "StolenDeviceReport"("deviceId");

-- CreateIndex
CREATE INDEX "StolenDeviceReport_ticketNumber_idx" ON "StolenDeviceReport"("ticketNumber");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceHeartbeat" ADD CONSTRAINT "DeviceHeartbeat_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StolenDeviceReport" ADD CONSTRAINT "StolenDeviceReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StolenDeviceReport" ADD CONSTRAINT "StolenDeviceReport_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
