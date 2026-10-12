import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { isOverdue, monthLabel } from "@/lib/billing";
import { db } from "@/lib/db";
import { isStaff, viewableClientIds } from "@/lib/permissions";
import { requireViewer } from "@/lib/session";
import { newMailCounts } from "@/lib/unread";

// Case managers: the clients who approved them, with new and urgent mail.
// Nonprofit admins: their organization's client list (names only, never mail).
export default async function ClientsPage() {
  const viewer = await requireViewer();
  if (viewer.role === "CLIENT") redirect("/mail");
  if (isStaff(viewer)) redirect("/staff");

  if (viewer.role === "ORG_ADMIN") {
    const [clients, invoices] = viewer.orgId
      ? await Promise.all([
          db.client.findMany({ where: { orgId: viewer.orgId }, orderBy: { lastName: "asc" } }),
          db.invoice.findMany({ where: { orgId: viewer.orgId }, orderBy: { periodStart: "desc" }, take: 24 }),
        ])
      : [[], []];
    return (
      <AppShell name={viewer.name}>
        {invoices.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-lg font-semibold">Invoices</h2>
            <ul className="flex flex-col gap-1">
              {invoices.map((inv) => (
                <li key={inv.id}>
                  <Link href={`/invoices/${inv.id}`} className="text-[#ffd166] underline">
                    {monthLabel(inv.month)} · ${inv.amount.toFixed(2)} ·{" "}
                    {isOverdue(inv) ? "overdue" : inv.status.toLowerCase()}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <h1 className="mb-4 text-2xl font-bold">Your organization&apos;s clients</h1>
        <p className="mb-4 opacity-80">{clients.filter((c) => c.status === "ACTIVE").length} active</p>
        <ul className="flex flex-col gap-2 text-lg">
          {clients.map((c) => (
            <li key={c.id} className="rounded-xl border border-[#7fe3d4]/50 p-4">
              {c.firstName} {c.lastName} <span className="opacity-70">· {c.pmbNumber}</span>
              {c.status !== "ACTIVE" && <span className="ml-2 text-sm opacity-70">({c.status.toLowerCase()})</span>}
            </li>
          ))}
        </ul>
      </AppShell>
    );
  }

  const ids = await viewableClientIds(viewer);
  const clientIds = ids === "ALL" ? [] : ids;
  const [clients, counts] = await Promise.all([
    db.client.findMany({ where: { id: { in: clientIds } } }),
    newMailCounts(viewer, clientIds),
  ]);
  // Clients with urgent new mail first, then any new mail, then by name.
  const sorted = clients.sort((a, b) => {
    const ca = counts.get(a.id) ?? { total: 0, urgent: 0 };
    const cb = counts.get(b.id) ?? { total: 0, urgent: 0 };
    return cb.urgent - ca.urgent || cb.total - ca.total || a.lastName.localeCompare(b.lastName);
  });

  return (
    <AppShell name={viewer.name}>
      <h1 className="mb-4 text-2xl font-bold">Your clients</h1>
      {sorted.length === 0 && <p className="text-lg">No clients have approved you yet. Ask staff at the shop.</p>}
      <ul className="flex flex-col gap-3">
        {sorted.map((c) => {
          const n = counts.get(c.id) ?? { total: 0, urgent: 0 };
          return (
            <li key={c.id}>
              <Link
                href={`/clients/${c.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#7fe3d4]/50 p-4 text-lg"
              >
                <span>
                  {c.firstName} {c.lastName} <span className="text-base opacity-70">· {c.pmbNumber}</span>
                </span>
                <span className="flex shrink-0 gap-2">
                  {n.urgent > 0 && (
                    <span className="rounded-full bg-[#f48fb1] px-3 py-1 text-sm font-bold text-[#1c1a1d]">
                      {n.urgent} urgent
                    </span>
                  )}
                  {n.total > 0 && (
                    <span className="rounded-full bg-[#ffd166] px-3 py-1 text-sm font-bold text-[#1c1a1d]">{n.total} new</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
