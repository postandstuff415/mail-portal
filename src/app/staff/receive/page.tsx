import { AppShell } from "@/components/app-shell";
import { StaffNav } from "@/components/staff-nav";
import { requireStaff } from "@/lib/session";
import { ReceiveForm } from "./receive-form";

export default async function ReceivePage() {
  const viewer = await requireStaff();
  return (
    <AppShell name={viewer.name}>
      <StaffNav />
      <h1 className="mb-4 text-2xl font-bold">Receive mail</h1>
      <ReceiveForm />
    </AppShell>
  );
}
