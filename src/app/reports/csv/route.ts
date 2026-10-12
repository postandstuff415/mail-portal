import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isStaff } from "@/lib/permissions";
import { canViewReports, orgReport, reportCsv } from "@/lib/reports";

// Grant report as a spreadsheet file. Staff, or that nonprofit's admins.
export async function GET(request: Request) {
  const session = await auth();
  const viewer = session?.user;
  if (!viewer?.id || viewer.mustChangePassword) return new Response("Not found", { status: 404 });

  const requested = new URL(request.url).searchParams.get("org");
  const orgId = isStaff(viewer) ? requested : viewer.orgId;
  if (!orgId || !canViewReports(viewer, orgId)) return new Response("Not found", { status: 404 });
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) return new Response("Not found", { status: 404 });

  const csv = reportCsv(org.name, await orgReport(org.id));
  const safeName = org.name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "report";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}-grant-report.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
