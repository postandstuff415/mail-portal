import { AppShell } from "@/components/app-shell";
import { StaffNav } from "@/components/staff-nav";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { OrgForm } from "./org-form";

export default async function OrgsPage() {
  const viewer = await requireStaff();
  const orgs = await db.organization.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { clients: { where: { status: "ACTIVE" } } } } },
  });

  return (
    <AppShell name={viewer.name}>
      <StaffNav />
      <h1 className="mb-4 text-2xl font-bold">Nonprofits</h1>
      <ul className="mb-6 flex flex-col gap-2">
        {orgs.map((o) => (
          <li key={o.id} className="flex justify-between rounded-xl border border-[#7fe3d4]/50 p-3">
            <span>
              {o.name}
              <span className="block text-sm opacity-70">
                {o.billingTerms === "NET60" ? "Net 60" : "Net 30"} · ${o.monthlyRate.toFixed(2)}/client/month
              </span>
            </span>
            <span className="text-sm opacity-80">{o._count.clients} active</span>
          </li>
        ))}
      </ul>
      <OrgForm />
    </AppShell>
  );
}
