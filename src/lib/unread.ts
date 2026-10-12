import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { FINAL_STATUSES } from "@/lib/requests";
import type { Viewer } from "@/lib/permissions";

// "New" = mail still at the shop that this person hasn't opened yet. It comes
// from the audit log's VIEW rows, so each person has their own new/seen state:
// a client's own views are logged without a userId, everyone else's with theirs.

export function notSeenBy(viewer: Viewer): Prisma.MailItemWhereInput {
  const seen: Prisma.AuditLogWhereInput =
    viewer.role === "CLIENT"
      ? { action: "VIEW", userId: null, clientId: viewer.clientId }
      : { action: "VIEW", userId: viewer.id };
  return { auditLogs: { none: seen } };
}

export async function newMailCounts(viewer: Viewer, clientIds: string[]) {
  if (clientIds.length === 0) return new Map<string, { total: number; urgent: number }>();
  const items = await db.mailItem.findMany({
    where: { clientId: { in: clientIds }, status: { notIn: FINAL_STATUSES }, ...notSeenBy(viewer) },
    select: { clientId: true, urgent: true },
  });
  const counts = new Map<string, { total: number; urgent: number }>();
  for (const item of items) {
    const c = counts.get(item.clientId) ?? { total: 0, urgent: 0 };
    c.total++;
    if (item.urgent) c.urgent++;
    counts.set(item.clientId, c);
  }
  return counts;
}

// IDs (from a given list) that this viewer hasn't opened yet.
export async function unseenIds(viewer: Viewer, mailItemIds: string[]): Promise<Set<string>> {
  if (mailItemIds.length === 0) return new Set();
  const rows = await db.mailItem.findMany({
    where: { id: { in: mailItemIds }, ...notSeenBy(viewer) },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}
