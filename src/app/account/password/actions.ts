"use server";

import { changeOwnPassword, UserError } from "@/lib/users";
import { requireViewer } from "@/lib/session";

export type PasswordState = { error?: string; ok?: boolean };

export async function changePasswordAction(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  void _prev;
  const viewer = await requireViewer();
  const next = String(formData.get("next") ?? "");
  if (next !== String(formData.get("confirm") ?? "")) return { error: "The two new passwords don't match." };
  try {
    await changeOwnPassword(viewer, String(formData.get("current") ?? ""), next);
    return { ok: true };
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    throw error;
  }
}
