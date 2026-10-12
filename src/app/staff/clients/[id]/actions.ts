"use server";

import { revalidatePath } from "next/cache";
import { addDelegate, DelegateError, revokeDelegate } from "@/lib/delegates";
import { requireStaff } from "@/lib/session";

export type DelegateState = { error?: string; ok?: string };

export async function addDelegateAction(clientId: string, _prev: DelegateState, formData: FormData): Promise<DelegateState> {
  void _prev;
  const staff = await requireStaff();
  try {
    await addDelegate(staff, clientId, String(formData.get("userId") ?? ""), formData.get("consent") === "on");
  } catch (error) {
    if (error instanceof DelegateError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/staff/clients/${clientId}`);
  return { ok: "Added. They can see this client's mail now." };
}

export async function revokeDelegateAction(clientId: string, delegateId: string) {
  const staff = await requireStaff();
  await revokeDelegate(staff, delegateId);
  revalidatePath(`/staff/clients/${clientId}`);
}
