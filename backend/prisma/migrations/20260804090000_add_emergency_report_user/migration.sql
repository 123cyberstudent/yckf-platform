-- AlterTable
ALTER TABLE "EmergencyReport" ADD COLUMN "userId" INTEGER;

-- CreateIndex
CREATE INDEX "EmergencyReport_userId_idx" ON "EmergencyReport"("userId");

-- AddForeignKey
ALTER TABLE "EmergencyReport" ADD CONSTRAINT "EmergencyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
