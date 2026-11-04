import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isStaff, type Viewer } from "@/lib/permissions";

// Nonprofit billing (owner decision, option A):
// - $rate per client for every calendar month the client was enrolled on any day.
// - 90-day minimum: each enrollment is billed for at least 3 calendar months,
//   starting with the enrollment month, billed month by month (no lump sum).
// - Never twice for the same client and month.
// Months are Pacific-time calendar months, written "YYYY-MM".

export class BillingError extends Error {}

export const MINIMUM_MONTHS = 3;

export function monthKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}-${m}`;
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export type Enrollment = { enrolledAt: Date; endedAt: Date | null };

// Is this client billed for this month, and only because of the minimum?
export function billingFor(client: Enrollment, month: string): { billed: boolean; minimumOnly: boolean } {
  const start = monthKey(client.enrolledAt);
  if (month < start) return { billed: false, minimumOnly: false };
  const active = client.endedAt === null || month <= monthKey(client.endedAt);
  const withinMinimum = month <= addMonths(start, MINIMUM_MONTHS - 1);
  return { billed: active || withinMinimum, minimumOnly: !active && withinMinimum };
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Make one organization's invoice for a month. Safe to run twice: an existing
// invoice is returned unchanged. No invoice if nobody is billable.
export async function generateInvoice(orgId: string, month: string, now = new Date()) {
  const [y, m] = month.split("-").map(Number);
  const periodStart = new Date(Date.UTC(y, m - 1, 1));
  const existing = await db.invoice.findUnique({ where: { orgId_periodStart: { orgId, periodStart } } });
  if (existing) return existing;

  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  const clients = await db.client.findMany({ where: { orgId }, orderBy: { lastName: "asc" } });
  const lines = clients
    .map((c) => ({ c, ...billingFor(c, month) }))
    .filter((x) => x.billed)
    .map(({ c, minimumOnly }) => ({
      clientId: c.id,
      clientName: `${c.firstName} ${c.lastName}`,
      pmbNumber: c.pmbNumber,
      amount: org.monthlyRate,
      minimumOnly,
    }));
  if (lines.length === 0) return null;

  const termDays = org.billingTerms === "NET60" ? 60 : 30;
  try {
    return await db.invoice.create({
      data: {
        orgId,
        month,
        periodStart,
        periodEnd: new Date(Date.UTC(y, m, 1) - 1),
        activeClients: lines.length,
        amount: org.monthlyRate.mul(lines.length),
        dueDate: new Date(now.getTime() + termDays * DAY_MS),
        lines: { create: lines },
      },
    });
  } catch (error) {
    // Two runs at once: the other one won; use its invoice.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return db.invoice.findUniqueOrThrow({ where: { orgId_periodStart: { orgId, periodStart } } });
    }
    throw error;
  }
}

// Invoices for every nonprofit for last month (run on the 1st by cron).
export async function generateMonthlyInvoices(now = new Date()) {
  const month = addMonths(monthKey(now), -1);
  const orgs = await db.organization.findMany({ select: { id: true } });
  let created = 0;
  for (const org of orgs) if (await generateInvoice(org.id, month, now)) created++;
  return { month, invoices: created };
}

export async function setInvoiceStatus(viewer: Viewer | null | undefined, invoiceId: string, status: "SENT" | "PAID") {
  if (!isStaff(viewer)) throw new BillingError("Staff only.");
  await db.invoice.update({ where: { id: invoiceId }, data: { status } });
}

export function isOverdue(invoice: { status: string; dueDate: Date }, now = new Date()) {
  return invoice.status !== "PAID" && invoice.dueDate < now;
}

// Staff end a client's enrollment (billing continues to the 90-day minimum).
export async function endEnrollment(viewer: Viewer | null | undefined, clientId: string, now = new Date()) {
  if (!isStaff(viewer)) throw new BillingError("Staff only.");
  await db.client.update({ where: { id: clientId }, data: { status: "CLOSED", endedAt: now } });
}

// A returning client starts a new enrollment (and a new 90-day minimum).
export async function reenroll(viewer: Viewer | null | undefined, clientId: string, now = new Date()) {
  if (!isStaff(viewer)) throw new BillingError("Staff only.");
  // A new enrollment never brings back "Lucky 6" free months.
  await db.client.update({
    where: { id: clientId },
    data: { status: "ACTIVE", enrolledAt: now, endedAt: null, freeMonths: 0 },
  });
}

// Who may see an invoice: staff, or that nonprofit's admin accounts.
export function canViewInvoice(viewer: Viewer | null | undefined, invoice: { orgId: string }) {
  if (!viewer) return false;
  if (isStaff(viewer)) return true;
  return viewer.role === "ORG_ADMIN" && !!viewer.orgId && viewer.orgId === invoice.orgId;
}
