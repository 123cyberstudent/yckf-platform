-- CreateTable
CREATE TABLE "PromotionEngagement" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "promoKey" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "platform" TEXT,
    "seenCount" INTEGER NOT NULL DEFAULT 1,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),
    "dismissCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "lastClickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromotionEngagement_userId_promoKey_placement_key" ON "PromotionEngagement"("userId", "promoKey", "placement");

-- AddForeignKey
ALTER TABLE "PromotionEngagement" ADD CONSTRAINT "PromotionEngagement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
