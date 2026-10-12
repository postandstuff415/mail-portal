import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { PasswordForm } from "./password-form";

export default async function PasswordPage() {
  // Not requireViewer(): it sends people with a temporary password here.
  const session = await auth();
  const viewer = session?.user;
  if (!viewer?.id) redirect("/login");
  // Clients log in with a PIN; staff reset it at the shop.
  if (viewer.role === "CLIENT") redirect("/mail");

  return (
    <AppShell name={viewer.name}>
      <h1 className="mb-2 text-2xl font-bold">Change password</h1>
      {viewer.mustChangePassword && (
        <p className="mb-4 rounded-lg border-2 border-[#ffd166] p-3">
          You logged in with a temporary password. Choose your own password to continue.
        </p>
      )}
      <PasswordForm currentLabel={viewer.mustChangePassword ? "Temporary password" : "Current password"} />
    </AppShell>
  );
}
