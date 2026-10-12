import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MailList } from "@/components/mail-list";
import { StaffNav } from "@/components/staff-nav";
import { db } from "@/lib/db";
import { activeDelegates } from "@/lib/delegates";
import { mailForClient } from "@/lib/mail-queries";
import { requireStaff } from "@/lib/session";
import { revokeDelegateAction } from "./actions";
import { DelegateForm } from "./delegate-form";

const PT = { timeZone: "America/Los_Angeles" } as const;

// Staff view of one client: details, who can see their mail, and their mail.
export default async function StaffClientPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireStaff();
  const { id } = await params;
  const client = await db.client.findUnique({ where: { id }, include: { org: { select: { name: true } } } });
  if (!client) notFound();

  const [delegates, caseManagers, items] = await Promise.all([
    activeDelegates(id),
    db.user.findMany({
      where: { role: "CASE_MANAGER" },
      orderBy: { name: "asc" },
      include: { org: { select: { name: true } } },
    }),
    mailForClient(id),
  ]);
  const delegateIds = new Set(delegates.map((d) => d.userId));

  return (
    <AppShell name={viewer.name}>
      <StaffNav />
      <h1 className="text-2xl font-bold">
        {client.firstName} {client.lastName} <span className="text-lg opacity-70">· {client.pmbNumber}</span>
      </h1>
      <p className="opacity-80">{client.org.name}</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="opacity-70">Phone</dt>
        <dd>{client.phone ?? "none"}</dd>
        <dt className="opacity-70">Text alerts</dt>
        <dd>{client.smsConsentAt ? `on (signed ${client.smsConsentAt.toLocaleDateString("en-US", PT)})` : "off"}</dd>
        <dt className="opacity-70">PS 1583</dt>
        <dd>{client.form1583OnFile ? "on file" : "MISSING"}</dd>
        <dt className="opacity-70">ID expires</dt>
        <dd>{client.idExpiresAt ? client.idExpiresAt.toLocaleDateString("en-US", PT) : "not recorded"}</dd>
      </dl>
      <p className="mt-3 flex gap-4">
        <Link href={`/staff/clients/${id}/card`} className="text-[#ffd166] underline">
          Print card
        </Link>
        <Link href={`/staff/clients/${id}/reset-pin`} className="text-[#ffd166] underline">
          Reset PIN
        </Link>
      </p>

      <section className="mt-6 rounded-xl border border-[#7fe3d4]/40 p-4">
        <h2 className="mb-2 text-lg font-semibold">Who can see their mail</h2>
        {delegates.length === 0 && <p className="mb-3 opacity-80">Only the client and staff.</p>}
        <ul className="mb-4 flex flex-col gap-2">
          {delegates.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3">
              <span>
                {d.user.name ?? d.user.email}
                <span className="block text-sm opacity-70">
                  {d.user.org?.name ?? "caregiver"} · since {d.approvedAt.toLocaleDateString("en-US", PT)}
                </span>
              </span>
              <form action={revokeDelegateAction.bind(null, id, d.id)}>
                <button type="submit" className="rounded-md border border-[#f48fb1] px-3 py-2 text-[#f48fb1]">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
        <DelegateForm
          clientId={id}
          caseManagers={caseManagers
            .filter((u) => !delegateIds.has(u.id))
            .map((u) => ({ id: u.id, label: `${u.name ?? u.email}${u.org ? ` · ${u.org.name}` : ""}` }))}
        />
      </section>

      <h2 className="mb-2 mt-6 text-lg font-semibold">Mail</h2>
      <MailList items={items} unseen={new Set()} />
    </AppShell>
  );
}
