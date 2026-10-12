import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StaffNav } from "@/components/staff-nav";
import { monthLabel } from "@/lib/billing";
import { db } from "@/lib/db";
import { isStaff } from "@/lib/permissions";
import { canViewReports, orgReport } from "@/lib/reports";
import { requireViewer } from "@/lib/session";

// Grant report: monthly totals for one nonprofit (no names, no mail contents).
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const viewer = await requireViewer();
  const staff = isStaff(viewer);
  const { org } = await searchParams;
  const orgId = staff ? org : (viewer.orgId ?? undefined);
  if (!staff && viewer.role !== "ORG_ADMIN") notFound();

  const orgs = staff ? await db.organization.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : [];
  const organization = orgId ? await db.organization.findUnique({ where: { id: orgId } }) : null;
  if (orgId && (!organization || !canViewReports(viewer, orgId))) notFound();
  const rows = organization ? await orgReport(organization.id) : [];

  return (
    <AppShell name={viewer.name}>
      {staff && <StaffNav />}
      <h1 className="mb-2 text-2xl font-bold">Grant report{organization ? `: ${organization.name}` : ""}</h1>
      {staff && (
        <ul className="mb-4 flex flex-wrap gap-2">
          {orgs.map((o) => (
            <li key={o.id}>
              <Link
                href={`/reports?org=${o.id}`}
                className={`inline-block rounded-md border px-3 py-1 ${o.id === orgId ? "border-[#ffd166] text-[#ffd166]" : "border-[#7fe3d4]/60"}`}
              >
                {o.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!organization && <p>Pick a nonprofit.</p>}
      {organization && (
        <>
          <p className="mb-3 text-sm opacity-80">
            Totals for the last 12 months. No client names or mail contents, so it can be shared with funders.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#7fe3d4]/60 text-left">
                  <th className="py-2 pr-2">Month</th>
                  <th className="py-2 pr-2 text-right">Active clients</th>
                  <th className="py-2 pr-2 text-right">New</th>
                  <th className="py-2 pr-2 text-right">Pieces received</th>
                  <th className="py-2 pr-2 text-right">Urgent</th>
                  <th className="py-2 pr-2 text-right">Pickups</th>
                  <th className="py-2 pr-2 text-right">Avg days to pickup</th>
                  <th className="py-2 text-right">Requests</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.month} className="border-b border-[#7fe3d4]/20">
                    <td className="py-2 pr-2">{monthLabel(r.month)}</td>
                    <td className="py-2 pr-2 text-right">{r.activeClients}</td>
                    <td className="py-2 pr-2 text-right">{r.newEnrollments}</td>
                    <td className="py-2 pr-2 text-right">{r.piecesReceived}</td>
                    <td className="py-2 pr-2 text-right">{r.urgentReceived}</td>
                    <td className="py-2 pr-2 text-right">{r.pickups}</td>
                    <td className="py-2 pr-2 text-right">{r.avgDaysToPickup ?? "-"}</td>
                    <td className="py-2 text-right">{r.requests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <a
            href={`/reports/csv?org=${organization.id}`}
            className="mt-4 inline-block rounded-md bg-[#7fe3d4] px-4 py-3 font-semibold text-[#1c1a1d]"
          >
            Download spreadsheet (CSV)
          </a>
        </>
      )}
    </AppShell>
  );
}
