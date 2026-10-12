import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireViewer } from "@/lib/session";
import { PasswordForm } from "./password-form";

export default async function PasswordPage() {
  const viewer = await requireViewer();
  // Clients log in with a PIN; staff reset it at the shop.
  if (viewer.role === "CLIENT") redirect("/mail");
  return (
    <AppShell name={viewer.name}>
      <h1 className="mb-4 text-2xl font-bold">Change password</h1>
      <PasswordForm />
    </AppShell>
  );
}
