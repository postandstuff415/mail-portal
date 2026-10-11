import { AppShell } from "@/components/app-shell";
import { StaffNav } from "@/components/staff-nav";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { NewClientForm } from "./new-client-form";

export default async function NewClientPage() {
  const viewer = await requireStaff();
  const orgs = await db.organization.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  return (
    <AppShell name={viewer.name}>
      <StaffNav />
      <h1 className="mb-4 text-2xl font-bold print:hidden">New client</h1>
      <NewClientForm orgs={orgs} />
    </AppShell>
  );
}
