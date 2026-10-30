-- Self-pay clients: no sponsoring nonprofit, a monthly price, and monthly bills.

-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('NONPROFIT', 'SELF_PAY');

-- AlterTable: existing clients stay NONPROFIT (the default), nothing else changes for them.
ALTER TABLE "Client" ALTER COLUMN "orgId" DROP NOT NULL,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "billingType" "BillingType" NOT NULL DEFAULT 'NONPROFIT',
ADD COLUMN     "monthlyPrice" DECIMAL(10,2),
ADD COLUMN     "billSmsConsentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "selfPay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "billSmsConsent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ClientInvoice" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "emailedAt" TIMESTAMP(3),
    "textedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientInvoice_status_idx" ON "ClientInvoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClientInvoice_clientId_month_key" ON "ClientInvoice"("clientId", "month");

-- AddForeignKey
ALTER TABLE "ClientInvoice" ADD CONSTRAINT "ClientInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
