"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { createUser, resetUserPassword, UserError } from "@/lib/users";
import { requireStaff } from "@/lib/session";

export type PersonState = { error?: string; created?: { name: string; email: string; password: string } };
export type ResetState = { error?: string; password?: string };

export async function createPersonAction(_prev: PersonState, formData: FormData): Promise<PersonState> {
  void _prev;
  const staff = await requireStaff();
  try {
    const { user, password } = await createUser(staff, {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? "") as "CASE_MANAGER",
      orgId: String(formData.get("orgId") ?? "") || undefined,
    });
    revalidatePath("/staff/people");
    return { created: { name: user.name ?? user.email, email: user.email, password } };
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    if (error instanceof ZodError) return { error: error.issues[0].message };
    throw error;
  }
}

export async function resetPasswordAction(userId: string, _prev: ResetState): Promise<ResetState> {
  void _prev;
  const staff = await requireStaff();
  try {
    return await resetUserPassword(staff, userId);
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    throw error;
  }
}
