-- DropForeignKey
ALTER TABLE "BroadcastRecipient" DROP CONSTRAINT "BroadcastRecipient_recipientId_fkey";

-- AlterTable
ALTER TABLE "BroadcastRecipient" ADD COLUMN     "recipientEmail" TEXT,
ALTER COLUMN "recipientId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "BroadcastRecipient" ADD CONSTRAINT "BroadcastRecipient_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
