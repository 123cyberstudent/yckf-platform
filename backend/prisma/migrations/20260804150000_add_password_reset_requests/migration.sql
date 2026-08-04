-- CreateTable
CREATE TABLE "PasswordResetRequest" (
    "id" SERIAL NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "action" TEXT,
    "matchedUserId" INTEGER,
    "handledById" INTEGER,
    "handledAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "resetTokenHash" TEXT,
    "resetTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetRequest_requestNumber_key" ON "PasswordResetRequest"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetRequest_resetTokenHash_key" ON "PasswordResetRequest"("resetTokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_status_idx" ON "PasswordResetRequest"("status");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_createdAt_idx" ON "PasswordResetRequest"("createdAt");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_matchedUserId_idx" ON "PasswordResetRequest"("matchedUserId");

-- AddForeignKey
ALTER TABLE "PasswordResetRequest" ADD CONSTRAINT "PasswordResetRequest_matchedUserId_fkey" FOREIGN KEY ("matchedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetRequest" ADD CONSTRAINT "PasswordResetRequest_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
