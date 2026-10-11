"use server";

import type { MailType } from "@prisma/client";
import { IntakeError, lookupClientByPmb, receiveMail } from "@/lib/intake";
import { requestIp, requireStaff } from "@/lib/session";

export type LookupResult = { name?: string; pmbNumber?: string; warning?: string; error?: string };

export async function lookupClient(pmb: string): Promise<LookupResult> {
  const staff = await requireStaff();
  const client = await lookupClientByPmb(staff, pmb);
  if (!client) return { error: `No client with mailbox ${pmb.trim().toUpperCase()}.` };
  return {
    name: `${client.firstName} ${client.lastName}`,
    pmbNumber: client.pmbNumber,
    warning:
      client.status !== "ACTIVE"
        ? "This mailbox is not active."
        : !client.form1583OnFile
          ? "No PS Form 1583 on file — can't accept mail yet."
          : undefined,
  };
}

export type SaveResult = { ok?: string; error?: string };

const TYPES: MailType[] = ["LETTER", "FLAT", "PACKAGE"];

export async function saveMail(formData: FormData): Promise<SaveResult> {
  const staff = await requireStaff();
  const photo = formData.get("photo");
  if (!(photo instanceof File)) return { error: "Take a photo of the envelope first." };
  const type = String(formData.get("type")) as MailType;
  if (!TYPES.includes(type)) return { error: "Pick letter, large envelope, or package." };

  try {
    const { client } = await receiveMail(
      staff,
      {
        pmbNumber: String(formData.get("pmbNumber") ?? ""),
        image: new Uint8Array(await photo.arrayBuffer()),
        type,
        urgent: formData.get("urgent") === "on",
        shelfLocation: String(formData.get("shelfLocation") ?? ""),
        sender: String(formData.get("sender") ?? ""),
      },
      await requestIp(),
    );
    return { ok: `Saved for ${client.firstName} ${client.lastName} (${client.pmbNumber}).` };
  } catch (error) {
    if (error instanceof IntakeError) return { error: error.message };
    throw error;
  }
}
