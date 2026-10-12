import { db } from "@/lib/db";
import { FINAL_STATUSES } from "@/lib/requests";

// A client's mail for list pages: everything still at the shop, plus the last
// 30 days of mail that has left (so people can see it was picked up).
export async function mailForClient(clientId: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const items = await db.mailItem.findMany({
    where: {
      clientId,
      OR: [{ status: { notIn: FINAL_STATUSES } }, { receivedAt: { gte: since } }],
    },
    orderBy: { receivedAt: "desc" },
    include: { requests: { where: { status: "OPEN" }, select: { type: true } } },
    take: 200,
  });
  // Urgent mail still at the shop goes on top; everything else newest first.
  const rank = (i: (typeof items)[number]) => (i.urgent && !FINAL_STATUSES.includes(i.status) ? 0 : 1);
  return items.sort((a, b) => rank(a) - rank(b) || b.receivedAt.getTime() - a.receivedAt.getTime());
}
