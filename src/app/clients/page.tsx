import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { viewableClientIds } from "@/lib/permissions";
import { requireViewer } from "@/lib/session";

// Case managers: the clients who approved them. Org admins: their org's
// client list (names only, no mail). Phase 4 adds unread counts.
export default async function ClientsPage() {
  const viewer = await requireViewer();
  if (viewer.role === "CLIENT") redirect("/mail");

  if (viewer.role === "ORG_ADMIN") {
    const clients = viewer.orgId
      ? await db.client.findMany({ where: { orgId: viewer.orgId }, orderBy: { lastName: "asc" } })
      : [];
    return (
      <AppShell name={viewer.name}>
        <h1 className="mb-4 text-2xl font-bold">Your organization&apos;s clients</h1>
        <ul className="flex flex-col gap-2 text-lg">
          {clients.map((c) => (
            <li key={c.id} className="rounded-xl border border-[#7fe3d4]/50 p-4">
              {c.firstName} {c.lastName} <span className="opacity-70">· {c.pmbNumber}</span>
            </li>
          ))}
        </ul>
      </AppShell>
    );
  }

  const ids = await viewableClientIds(viewer);
  const clients = await db.client.findMany({
    where: ids === "ALL" ? {} : { id: { in: ids } },
    orderBy: { lastName: "asc" },
    include: {
      mailItems: { where: { status: { in: ["RECEIVED", "READY_FOR_PICKUP"] } }, select: { id: true, urgent: true } },
    },
  });

  return (
    <AppShell name={viewer.name}>
      <h1 className="mb-4 text-2xl font-bold">Clients</h1>
      {clients.length === 0 && <p className="text-lg">No clients have approved you yet.</p>}
      <ul className="flex flex-col gap-3">
        {clients.map((c) => (
          <li key={c.id} className="rounded-xl border border-[#7fe3d4]/50 p-4">
            <div className="flex items-center justify-between text-lg">
              <span>
                {c.firstName} {c.lastName} <span className="opacity-70">· {c.pmbNumber}</span>
              </span>
              {c.mailItems.some((m) => m.urgent) && (
                <span className="rounded-full bg-[#f48fb1] px-3 py-1 text-sm font-bold text-[#1c1a1d]">Urgent</span>
              )}
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {c.mailItems.map((m) => (
                <li key={m.id}>
                  <Link href={`/mail/${m.id}`} className="text-[#ffd166] underline">
                    View mail item
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
