"use server";

import QRCode from "qrcode";
import { ZodError } from "zod";
import { createClient, intakeQrUrl, IntakeError } from "@/lib/intake";
import { requireStaff } from "@/lib/session";

export type NewClientState = {
  error?: string;
  card?: { name: string; pmbNumber: string; pin: string; qrDataUrl: string };
};

export async function createClientAction(_prev: NewClientState, formData: FormData): Promise<NewClientState> {
  void _prev;
  const staff = await requireStaff();
  const idExpires = String(formData.get("idExpiresAt") ?? "");
  try {
    const { client, pin } = await createClient(staff, {
      pmbNumber: String(formData.get("pmbNumber") ?? ""),
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      orgId: String(formData.get("orgId") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      form1583OnFile: formData.get("form1583OnFile") === "on",
      smsConsent: formData.get("smsConsent") === "on",
      idExpiresAt: idExpires ? new Date(`${idExpires}T12:00:00`) : undefined,
    });
    const qrDataUrl = await QRCode.toDataURL(intakeQrUrl(client.pmbNumber), { margin: 1, width: 280 });
    return { card: { name: `${client.firstName} ${client.lastName}`, pmbNumber: client.pmbNumber, pin, qrDataUrl } };
  } catch (error) {
    if (error instanceof IntakeError) return { error: error.message };
    if (error instanceof ZodError) return { error: error.issues[0].message };
    throw error;
  }
}
