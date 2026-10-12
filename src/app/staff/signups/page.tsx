import { AppShell } from "@/components/app-shell";
import { StaffNav } from "@/components/staff-nav";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { rejectAction } from "./actions";
import { ConvertForm } from "./convert-form";

const PT = { timeZone: "America/Los_Angeles" } as const;

// Online sign-ups waiting for their in-person ID check and Form 1583.
export default async function SignupsPage() {
  const viewer = await requireStaff();
  const [apps, orgs] = await Promise.all([
    db.application.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { org: { select: { id: true, name: true } } },
    }),
    db.organization.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <AppShell name={viewer.name}>
      <StaffNav />
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
                  {a.org?.name ?? a.orgOther ?? "no nonprofit"} · signed up {a.createdAt.toLocaleDateString("en-US", PT)}
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
    </AppShell>
  );
}
