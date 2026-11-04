"use server";

import QRCode from "qrcode";
import { after } from "next/server";
import { ZodError } from "zod";
import { createClient, intakeQrUrl, IntakeError } from "@/lib/intake";
import { billNow } from "@/lib/self-pay";
import { requireStaff } from "@/lib/session";

export type NewClientState = {
  error?: string;
  card?: { name: string; pmbNumber: string; pin: string; qrDataUrl: string; note?: string };
};

export async function createClientAction(_prev: NewClientState, formData: FormData): Promise<NewClientState> {
  void _prev;
  const staff = await requireStaff();
  const idExpires = String(formData.get("idExpiresAt") ?? "");
  try {
    const { client, pin, lucky } = await createClient(staff, {
      pmbNumber: String(formData.get("pmbNumber") ?? ""),
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      billingType: formData.get("billingType") === "SELF_PAY" ? "SELF_PAY" : "NONPROFIT",
      orgId: String(formData.get("orgId") ?? ""),
      monthlyPrice: String(formData.get("monthlyPrice") ?? ""),
      email: String(formData.get("email") ?? ""),
      billSmsConsent: formData.get("billSmsConsent") === "on",
      phone: String(formData.get("phone") ?? ""),
      form1583OnFile: formData.get("form1583OnFile") === "on",
      smsConsent: formData.get("smsConsent") === "on",
      idExpiresAt: idExpires ? new Date(`${idExpires}T12:00:00`) : undefined,
    });
    // Self-pay: send this month's bill right away (after the page responds).
    if (client.billingType === "SELF_PAY") after(() => billNow(client.id).then(() => undefined));
    const qrDataUrl = await QRCode.toDataURL(intakeQrUrl(client.pmbNumber), { margin: 1, width: 280 });
    const note = lucky?.won ? `LUCKY 6! Your first 6 months are free (through ${lucky.freeThrough}).` : undefined;
    return { card: { name: `${client.firstName} ${client.lastName}`, pmbNumber: client.pmbNumber, pin, qrDataUrl, note } };
  } catch (error) {
    if (error instanceof IntakeError) return { error: error.message };
    if (error instanceof ZodError) return { error: error.issues[0].message };
    throw error;
  }
}
