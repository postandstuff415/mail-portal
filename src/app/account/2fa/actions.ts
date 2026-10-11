"use server";

import { redirect } from "next/navigation";
import { auth, unstable_update } from "@/auth";
import { db } from "@/lib/db";
import { verifyTotp } from "@/lib/totp";

export type TwoFactorState = { error?: string };

// Save the authenticator secret once the staff member proves their app works.
export async function confirmTwoFactor(_prev: TwoFactorState, formData: FormData): Promise<TwoFactorState> {
  const session = await auth();
  const identity = session?.user;
  if (!identity?.id || (identity.role !== "STAFF" && identity.role !== "ADMIN")) redirect("/login");

  const user = await db.user.findUnique({ where: { id: identity.id } });
  if (!user) redirect("/login");
  if (user.twoFactorSecret) return { error: "2-step codes are already set up for this account." };

  const secret = String(formData.get("secret") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!/^[A-Z2-7]{16,}$/.test(secret) || !(await verifyTotp(secret, code))) {
    return { error: "That code didn't match. Check the app and try the newest code." };
  }

  await db.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret } });
  // Refresh the session; the server re-reads the database to clear the setup flag.
  await unstable_update({});
  redirect("/staff");
}
