import { db } from "@/lib/db";
import { FINAL_STATUSES } from "@/lib/requests";

const DAY_MS = 24 * 60 * 60 * 1000;

// USPS CMRA rule: certify the Customer Registration Database every quarter.
const CRD_DATES = [
  [1, 15],
  [4, 15],
  [7, 15],
  [10, 15],
] as const;

// Dates are compared as Oakland calendar days (the server clock runs on UTC).
export function nextCrdCertification(now = new Date()): { date: Date; daysLeft: number } {
  const [y, mo, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" })
    .format(now)
    .split("-")
    .map(Number);
  const today = Date.UTC(y, mo - 1, d);
  for (let year = y; year <= y + 1; year++) {
    for (const [m, day] of CRD_DATES) {
      const due = Date.UTC(year, m - 1, day);
      // Noon UTC keeps the date on the same calendar day when shown in Pacific time.
      if (due >= today) return { date: new Date(due + 12 * 3600 * 1000), daysLeft: Math.round((due - today) / DAY_MS) };
    }
  }
  throw new Error("unreachable");
}

// Everything staff should act on, counted for the staff home page.
export async function staffTodo(now = new Date()) {
  const soon = new Date(now.getTime() + 7 * DAY_MS);
  const idSoon = new Date(now.getTime() + 30 * DAY_MS);
  const atShop = { status: { notIn: FINAL_STATUSES } };
  const [signups, openRequests, readyForPickup, pastHold, holdEndingSoon, idsExpired, idsExpiring, no1583, overdueInvoices] =
    await Promise.all([
      db.application.count({ where: { status: "PENDING" } }),
      db.request.count({ where: { status: "OPEN" } }),
      db.mailItem.count({ where: { status: "READY_FOR_PICKUP" } }),
      db.mailItem.count({ where: { ...atShop, retainUntil: { lt: now } } }),
      db.mailItem.count({ where: { ...atShop, retainUntil: { gte: now, lt: soon } } }),
      db.client.count({ where: { status: "ACTIVE", idExpiresAt: { lt: now } } }),
      db.client.count({ where: { status: "ACTIVE", idExpiresAt: { gte: now, lt: idSoon } } }),
      db.client.count({ where: { status: "ACTIVE", form1583OnFile: false } }),
      db.invoice.count({ where: { status: { not: "PAID" }, dueDate: { lt: now } } }),
    ]);
  return {
    signups,
    openRequests,
    readyForPickup,
    pastHold,
    holdEndingSoon,
    idsExpired,
    idsExpiring,
    no1583,
    overdueInvoices,
    crd: nextCrdCertification(now),
  };
}
