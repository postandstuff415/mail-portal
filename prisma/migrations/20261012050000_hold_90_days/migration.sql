-- Owner policy (2026-10-12): mail is held 90 days, then returned to sender or shredded.
ALTER TABLE "Client" RENAME COLUMN "holdMonths" TO "holdDays";
ALTER TABLE "Client" ALTER COLUMN "holdDays" SET DEFAULT 90;
UPDATE "Client" SET "holdDays" = 90;

-- Mail still at the shop gets the new hold date: 90 days after it arrived.
UPDATE "MailItem"
SET "retainUntil" = "receivedAt" + INTERVAL '90 days'
WHERE "status" NOT IN ('PICKED_UP', 'RETURNED', 'SHREDDED');
