"use server";

import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { sessionStillValid } from "@/lib/session";
import { changeOwnPassword, UserError } from "@/lib/users";

export type PasswordState = { error?: string };

export async function changePasswordAction(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  void _prev;
  // Not requireViewer(): people with a temporary password must be able to get here.
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await sessionStillValid(session.user))) redirect("/logout");
  const next = String(formData.get("next") ?? "");
  if (next !== String(formData.get("confirm") ?? "")) return { error: "The two new passwords don't match." };
  try {
    await changeOwnPassword(session.user, String(formData.get("current") ?? ""), next);
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    throw error;
  }
  // Start a fresh session with the new password (clears the "must change" flag).
  await signOut({ redirectTo: "/login?changed=1" });
  return {};
}
