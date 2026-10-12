"use server";

import type { RequestType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { addContentsPage, IntakeError } from "@/lib/intake";
import { closeOut, createRequest, markPickedUp, RequestError } from "@/lib/requests";
import { requestIp, requireStaff, requireViewer } from "@/lib/session";

export type ActionResult = { ok?: string; error?: string };

const TYPES: RequestType[] = ["OPEN_AND_SCAN", "HOLD", "PICKUP", "DISCARD"];

const DONE_MESSAGES: Record<RequestType, string> = {
  OPEN_AND_SCAN: "Got it. Staff will open it and add photos of the pages here.",
  HOLD: "Got it. We'll keep it on the shelf for you.",
  PICKUP: "Got it. It'll be ready at the counter. Bring your ID.",
  DISCARD: "Got it. Staff will shred it.",
};

// Client or approved case manager asks staff to do something with a piece of mail.
export async function requestAction(mailItemId: string, type: RequestType): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!TYPES.includes(type)) return { error: "Unknown request." };
  try {
    await createRequest(viewer, mailItemId, type);
  } catch (error) {
    if (error instanceof RequestError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/mail/${mailItemId}`);
  return { ok: DONE_MESSAGES[type] };
}

export async function pickedUpAction(mailItemId: string): Promise<ActionResult> {
  const staff = await requireStaff();
  try {
    await markPickedUp(staff, mailItemId, "ID");
  } catch (error) {
    if (error instanceof RequestError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/mail/${mailItemId}`);
  return { ok: "Marked picked up." };
}

export async function closeOutAction(mailItemId: string, outcome: "RETURNED" | "SHREDDED"): Promise<ActionResult> {
  const staff = await requireStaff();
  if (outcome !== "RETURNED" && outcome !== "SHREDDED") return { error: "Unknown outcome." };
  try {
    await closeOut(staff, mailItemId, outcome);
  } catch (error) {
    if (error instanceof RequestError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/mail/${mailItemId}`);
  return { ok: outcome === "RETURNED" ? "Marked returned to sender." : "Marked shredded." };
}

export async function uploadContentsAction(mailItemId: string, formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff();
  const photo = formData.get("photo");
  if (!(photo instanceof File)) return { error: "Take a photo of the page first." };
  try {
    const { page } = await addContentsPage(staff, mailItemId, new Uint8Array(await photo.arrayBuffer()), await requestIp());
    revalidatePath(`/mail/${mailItemId}`);
    return { ok: `Page ${page} added.` };
  } catch (error) {
    if (error instanceof IntakeError) return { error: error.message };
    throw error;
  }
}
