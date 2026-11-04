-- "Lucky 6" promo: every 6th new self-pay mailbox gets its first 6 months free.
-- Existing clients get no number (the count starts when this goes live).

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "luckyNumber" INTEGER,
ADD COLUMN     "freeMonths" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Client_luckyNumber_key" ON "Client"("luckyNumber");
