import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StaffNav } from "@/components/staff-nav";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { markRequestDone } from "./actions";

const REQUEST_LABELS = {
  OPEN_AND_SCAN: "Open and scan",
  HOLD: "Hold",
  PICKUP: "Ready for pickup",
  DISCARD: "Discard",
} as const;

const DONE_STATUSES = ["PICKED_UP", "RETURNED", "SHREDDED"] as const;

// Everything staff need to act on: open client requests, mail waiting for
// pickup, and mail past its hold date.
export default async function QueuePage() {
  const viewer = await requireStaff();
  const now = new Date();

  const [requests, readyForPickup, pastHold] = await Promise.all([
    db.request.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      include: { mailItem: { include: { client: true } } },
    }),
    db.mailItem.findMany({
      where: { status: "READY_FOR_PICKUP" },
      orderBy: { receivedAt: "asc" },
      include: { client: true },
    }),
    db.mailItem.findMany({
      where: { retainUntil: { lt: now }, status: { notIn: [...DONE_STATUSES] } },
      orderBy: { retainUntil: "asc" },
      include: { client: true },
    }),
  ]);

  const who = (c: { pmbNumber: string; firstName: string; lastName: string }) =>
    `${c.pmbNumber} · ${c.firstName} ${c.lastName}`;

  return (
    <AppShell name={viewer.name}>
      <StaffNav />
      <h1 className="mb-4 text-2xl font-bold">Queue</h1>

      <h2 className="mb-2 text-lg font-semibold">Client requests ({requests.length})</h2>
      {requests.length === 0 && <p className="mb-6 opacity-80">None right now.</p>}
      <ul className="mb-6 flex flex-col gap-2">
        {requests.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#7fe3d4]/50 p-3">
            <span>
              <strong>{REQUEST_LABELS[r.type]}</strong> · {who(r.mailItem.client)}
              <span className="block text-sm opacity-70">
                Shelf {r.mailItem.shelfLocation ?? "?"} · asked {r.createdAt.toLocaleDateString("en-US")}
              </span>
              <Link href={`/mail/${r.mailItemId}`} className="text-sm text-[#ffd166] underline">
                View item
              </Link>
            </span>
            <form action={markRequestDone.bind(null, r.id)}>
              <button type="submit" className="h-11 rounded-md bg-[#7fe3d4] px-4 font-semibold text-[#1c1a1d]">
                Done
              </button>
            </form>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 text-lg font-semibold">Waiting for pickup ({readyForPickup.length})</h2>
      <ul className="mb-6 flex flex-col gap-2">
        {readyForPickup.map((m) => (
          <li key={m.id} className="rounded-xl border border-[#7fe3d4]/50 p-3">
            {who(m.client)} <span className="text-sm opacity-70">· shelf {m.shelfLocation ?? "?"}</span>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 text-lg font-semibold">Past hold date ({pastHold.length})</h2>
      <p className="mb-2 text-sm opacity-80">Return to sender or shred, per the client agreement.</p>
      <ul className="flex flex-col gap-2">
        {pastHold.map((m) => (
          <li key={m.id} className="rounded-xl border border-[#f48fb1]/60 p-3">
            {who(m.client)}
            <span className="block text-sm opacity-70">
              Hold ended {m.retainUntil.toLocaleDateString("en-US")} · shelf {m.shelfLocation ?? "?"}
            </span>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
