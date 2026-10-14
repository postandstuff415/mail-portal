import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StaffNav } from "@/components/staff-nav";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { rejectAction } from "./actions";
import { ConvertForm } from "./convert-form";

const PT = { timeZone: "America/Los_Angeles" } as const;

const STATUS = {
  PENDING: { label: "Waiting for ID", style: "bg-[#ffd166] text-[#1c1a1d]" },
  CONVERTED: { label: "Became a client", style: "bg-[#7fe3d4] text-[#1c1a1d]" },
  REJECTED: { label: "Removed", style: "bg-white/10" },
} as const;

// Online sign-ups: the ones waiting for their in-person ID check and Form 1583,
// or (?view=all) every sign-up ever received, for records and grant reports.
export default async function SignupsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const viewer = await requireStaff();
  const showAll = (await searchParams).view === "all";
  const [apps, orgs, counts] = await Promise.all([
    db.application.findMany({
      where: showAll ? {} : { status: "PENDING" },
      orderBy: { createdAt: showAll ? "desc" : "asc" },
      include: { org: { select: { id: true, name: true } } },
      take: showAll ? 500 : undefined,
    }),
    db.organization.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.application.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (s: keyof typeof STATUS) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const total = counts.reduce((n, c) => n + c._count._all, 0);
  const tab = (active: boolean) =>
    `rounded-md border px-3 py-2 ${active ? "border-[#ffd166] text-[#ffd166]" : "border-[#7fe3d4]/60"}`;

  return (
    <AppShell name={viewer.name}>
      <StaffNav />
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Link href="/staff/signups" className={tab(!showAll)}>
          Waiting for ID ({count("PENDING")})
        </Link>
        <Link href="/staff/signups?view=all" className={tab(showAll)}>
          All sign-ups ({total})
        </Link>
      </div>

      {showAll ? (
        <>
          <h1 className="mb-1 text-2xl font-bold">All sign-ups</h1>
          <p className="mb-4 text-sm opacity-80">
            {total} received · {count("CONVERTED")} became clients · {count("PENDING")} waiting · {count("REJECTED")}{" "}
            removed. Newest first.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#7fe3d4]/60 text-left">
                  <th className="py-2 pr-2">Name</th>
                  <th className="py-2 pr-2">Signed up</th>
                  <th className="py-2 pr-2">Nonprofit</th>
                  <th className="py-2 pr-2">Texts</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id} className="border-b border-[#7fe3d4]/20">
                    <td className="py-2 pr-2">
                      {a.clientId ? (
                        <Link href={`/staff/clients/${a.clientId}`} className="underline decoration-[#7fe3d4]/60">
                          {a.firstName} {a.lastName}
                        </Link>
                      ) : (
                        `${a.firstName} ${a.lastName}`
                      )}
                    </td>
                    <td className="py-2 pr-2">{a.createdAt.toLocaleDateString("en-US", PT)}</td>
                    <td className="py-2 pr-2">{a.org?.name ?? a.orgOther ?? "-"}</td>
                    <td className="py-2 pr-2">{a.smsConsent ? "yes" : "no"}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS[a.status].style}`}>
                        {STATUS[a.status].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <h1 className="mb-1 text-2xl font-bold print:hidden">Sign-ups waiting for ID ({apps.length})</h1>
          <p className="mb-4 text-sm opacity-80 print:hidden">
            Bring this list to a 1583 day. Check two IDs, witness the form, then create the client.
          </p>
          <ul className="flex flex-col gap-4">
            {apps.map((a) => (
              <li key={a.id} className="rounded-xl border border-[#7fe3d4]/50 p-4">
                <details>
                  <summary className="cursor-pointer text-lg print:hidden">
                    {a.firstName} {a.lastName}
                    <span className="block text-sm opacity-70">
                      {a.org?.name ?? a.orgOther ?? "no nonprofit"} · signed up{" "}
                      {a.createdAt.toLocaleDateString("en-US", PT)}
                    </span>
                  </summary>
                  <dl className="my-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm print:hidden">
                    <dt className="opacity-70">Date of birth</dt>
                    <dd>{a.dateOfBirth?.toLocaleDateString("en-US", { timeZone: "UTC" }) ?? "-"}</dd>
                    <dt className="opacity-70">Phone</dt>
                    <dd>{a.phone ?? "-"}</dd>
                    <dt className="opacity-70">Email</dt>
                    <dd>{a.email ?? "-"}</dd>
                    <dt className="opacity-70">Case manager</dt>
                    <dd>
                      {a.caseManagerName} · {a.caseManagerEmail}
                      {a.delegateConsent ? " (may see mail)" : " (no mail access)"}
                    </dd>
                    <dt className="opacity-70">Text alerts</dt>
                    <dd>{a.smsConsent ? "yes" : "no"}</dd>
                    <dt className="opacity-70">Signed</dt>
                    <dd>
                      &quot;{a.signatureName}&quot; · agreement {a.agreementVersion} ·{" "}
                      {a.signedAt.toLocaleString("en-US", PT)}
                    </dd>
                  </dl>
                  <ConvertForm applicationId={a.id} orgs={orgs} defaultOrgId={a.org?.id ?? ""} />
                  <form action={rejectAction.bind(null, a.id)} className="mt-3 print:hidden">
                    <button type="submit" className="text-sm text-[#f48fb1] underline">
                      Remove (spam or duplicate)
                    </button>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppShell>
  );
}
