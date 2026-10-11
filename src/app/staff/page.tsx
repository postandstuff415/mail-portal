import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";

// Staff home. Phase 3 adds New Client, Receive Mail, and the request queue.
export default async function StaffHome() {
  const viewer = await requireStaff();
  const clients = await db.client.findMany({
    orderBy: { pmbNumber: "asc" },
    include: { org: { select: { name: true } } },
  });

  return (
    <AppShell name={viewer.name}>
      <h1 className="mb-4 text-2xl font-bold">Staff</h1>
      <h2 className="mb-2 text-lg font-semibold">Clients</h2>
      <ul className="flex flex-col gap-2">
        {clients.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-xl border border-[#7fe3d4]/50 p-3">
            <span>
              <span className="font-mono">{c.pmbNumber}</span> · {c.firstName} {c.lastName}
              <span className="block text-sm opacity-70">{c.org.name}</span>
            </span>
            <Link href={`/staff/clients/${c.id}/reset-pin`} className="text-[#ffd166] underline">
              Reset PIN
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
