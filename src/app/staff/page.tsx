import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StaffNav } from "@/components/staff-nav";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";

const DAY_MS = 24 * 60 * 60 * 1000;

// Staff home: every client, with compliance flags for the quarterly USPS CRD check.
export default async function StaffHome() {
  const viewer = await requireStaff();
  const clients = await db.client.findMany({
    orderBy: { pmbNumber: "asc" },
    include: { org: { select: { name: true } } },
  });
  const soon = new Date(Date.now() + 30 * DAY_MS);

  return (
    <AppShell name={viewer.name}>
      <StaffNav />
      <h1 className="mb-4 text-2xl font-bold">Clients</h1>
      <ul className="flex flex-col gap-2">
        {clients.map((c) => {
          const flags = [
            !c.form1583OnFile && "No 1583 on file",
            c.idExpiresAt && c.idExpiresAt < new Date() && "ID expired",
            c.idExpiresAt && c.idExpiresAt >= new Date() && c.idExpiresAt < soon && "ID expires within 30 days",
            c.status !== "ACTIVE" && c.status.toLowerCase(),
            c.phone && !c.smsConsentAt && "Texts off (no signed agreement)",
          ].filter(Boolean);
          return (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#7fe3d4]/50 p-3">
              <span>
                <Link href={`/staff/clients/${c.id}`} className="underline decoration-[#7fe3d4]/60">
                  <span className="font-mono">{c.pmbNumber}</span> · {c.firstName} {c.lastName}
                </Link>
                <span className="block text-sm opacity-70">{c.org.name}</span>
                {flags.length > 0 && <span className="block text-sm text-[#f48fb1]">{flags.join(" · ")}</span>}
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1 text-sm">
                <Link href={`/staff/clients/${c.id}/card`} className="text-[#ffd166] underline">
                  Print card
                </Link>
                <Link href={`/staff/clients/${c.id}/reset-pin`} className="text-[#ffd166] underline">
                  Reset PIN
                </Link>
              </span>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
