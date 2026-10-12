import { addMonths, billingFor, monthKey } from "@/lib/billing";
import { db } from "@/lib/db";
import { isStaff, type Viewer } from "@/lib/permissions";

// Monthly numbers a nonprofit can give its grant funders. Counts only, never
// mail contents or client names.

export type MonthReport = {
  month: string;
  activeClients: number;
  newEnrollments: number;
  piecesReceived: number;
  urgentReceived: number;
  pickups: number;
  avgDaysToPickup: number | null;
  requests: number;
};

// The instant a Pacific-time calendar month starts ("2026-10" -> 2026-10-01 00:00 PT).
export function monthStart(key: string): Date {
  const [y, m] = key.split("-").map(Number);
  // Midnight PT is 07:00 or 08:00 UTC; pick whichever lands in the right month at hour 0.
  for (const utcHour of [7, 8]) {
    const d = new Date(Date.UTC(y, m - 1, 1, utcHour));
    const hour = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hourCycle: "h23" }).format(d),
    );
    if (hour === 0 && monthKey(d) === key) return d;
  }
  throw new Error(`Could not find the start of ${key}`);
}

export function canViewReports(viewer: Viewer | null | undefined, orgId: string) {
  if (!viewer) return false;
  if (isStaff(viewer)) return true;
  return viewer.role === "ORG_ADMIN" && viewer.orgId === orgId;
}

export async function orgMonthReport(orgId: string, month: string): Promise<MonthReport> {
  const start = monthStart(month);
  const end = monthStart(addMonths(month, 1));
  const inMonth = { gte: start, lt: end };
  const forOrg = { client: { orgId } };

  const [clients, piecesReceived, urgentReceived, pickups, requests] = await Promise.all([
    db.client.findMany({ where: { orgId }, select: { enrolledAt: true, endedAt: true } }),
    db.mailItem.count({ where: { ...forOrg, receivedAt: inMonth } }),
    db.mailItem.count({ where: { ...forOrg, receivedAt: inMonth, urgent: true } }),
    db.pickup.findMany({
      where: { pickedUpAt: inMonth, mailItem: forOrg },
      select: { pickedUpAt: true, mailItem: { select: { receivedAt: true } } },
    }),
    db.request.count({ where: { createdAt: inMonth, mailItem: forOrg } }),
  ]);

  const active = clients.filter((c) => {
    const b = billingFor(c, month);
    return b.billed && !b.minimumOnly;
  }).length;
  const waits = pickups.map((p) => (p.pickedUpAt.getTime() - p.mailItem.receivedAt.getTime()) / 86400000);

  return {
    month,
    activeClients: active,
    newEnrollments: clients.filter((c) => monthKey(c.enrolledAt) === month).length,
    piecesReceived,
    urgentReceived,
    pickups: pickups.length,
    avgDaysToPickup: waits.length ? Math.round((waits.reduce((a, b) => a + b, 0) / waits.length) * 10) / 10 : null,
    requests,
  };
}

// The last `count` months, newest first, ending with the current month.
export async function orgReport(orgId: string, count = 12, now = new Date()) {
  const current = monthKey(now);
  const months = Array.from({ length: count }, (_, i) => addMonths(current, -i));
  return Promise.all(months.map((m) => orgMonthReport(orgId, m)));
}

export function reportCsv(orgName: string, rows: MonthReport[]): string {
  const header = [
    "Organization",
    "Month",
    "Active clients",
    "New enrollments",
    "Pieces received",
    "Urgent pieces",
    "Pickups",
    "Avg days to pickup",
    "Client requests",
  ];
  const esc = (v: string | number | null) => {
    let s = v === null ? "" : String(v);
    // Stop spreadsheet apps from treating a name like "=SUM(...)" as a formula.
    if (typeof v === "string" && /^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [orgName, r.month, r.activeClients, r.newEnrollments, r.piecesReceived, r.urgentReceived, r.pickups, r.avgDaysToPickup, r.requests]
      .map(esc)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n") + "\n";
}
