import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { newTotpSecret, totpUri } from "@/lib/totp";
import { TwoFactorSetupForm } from "./setup-form";

// Staff and admins must connect an authenticator app before using the portal.
export default async function TwoFactorPage() {
  const session = await auth();
  const identity = session?.user;
  if (!identity?.id) redirect("/login");
  if (identity.role !== "STAFF" && identity.role !== "ADMIN") redirect("/home");

  const user = await db.user.findUnique({ where: { id: identity.id } });
  if (!user) redirect("/login");
  if (user.twoFactorSecret) {
    if (!identity.needs2faSetup) redirect("/staff");
    return (
      <AppShell name={identity.name}>
        <p className="text-lg">2-step codes are already on for this account. Log out and log back in with your code.</p>
      </AppShell>
    );
  }

  const secret = newTotpSecret();
  const qr = await QRCode.toDataURL(totpUri(secret, user.email), { margin: 1, width: 240 });

  return (
    <AppShell name={identity.name}>
      <h1 className="mb-2 text-2xl font-bold">Set up 2-step codes</h1>
      <ol className="mb-4 list-decimal space-y-1 pl-6">
        <li>Install Google Authenticator, Microsoft Authenticator, or Authy on your phone.</li>
        <li>Scan this code with the app.</li>
        <li>Type the 6-digit code it shows.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="QR code for your authenticator app" className="mb-2 rounded-lg bg-white p-2" width={240} height={240} />
      <p className="mb-4 break-all font-mono text-sm opacity-80">Can&apos;t scan? Enter this key: {secret}</p>
      <TwoFactorSetupForm secret={secret} />
    </AppShell>
  );
}
