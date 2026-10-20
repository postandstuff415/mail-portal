"use server";

import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { intakeQrUrl } from "@/lib/intake";
import { requireStaff } from "@/lib/session";
import { convertApplication, rejectApplication, SignupError } from "@/lib/signup";
import { SIGNUP_ALERT_TO, sendTestSignupAlert } from "@/lib/signup-email";

export type ConvertState = {
  error?: string;
  card?: { name: string; pmbNumber: string; pin: string; qrDataUrl: string };
  delegateAdded?: boolean;
};

export async function convertAction(applicationId: string, _prev: ConvertState, formData: FormData): Promise<ConvertState> {
  void _prev;
  const staff = await requireStaff();
  const idExpires = String(formData.get("idExpiresAt") ?? "");
  try {
    const { client, pin, delegateAdded } = await convertApplication(staff, applicationId, {
      pmbNumber: String(formData.get("pmbNumber") ?? ""),
      orgId: String(formData.get("orgId") ?? ""),
      idExpiresAt: idExpires ? new Date(`${idExpires}T12:00:00`) : undefined,
      form1583OnFile: formData.get("form1583OnFile") === "on",
    });
    revalidatePath("/staff/signups");
    const qrDataUrl = await QRCode.toDataURL(intakeQrUrl(client.pmbNumber), { margin: 1, width: 280 });
    return { card: { name: `${client.firstName} ${client.lastName}`, pmbNumber: client.pmbNumber, pin, qrDataUrl }, delegateAdded };
  } catch (error) {
    if (error instanceof SignupError) return { error: error.message };
    throw error;
  }
}

export async function rejectAction(applicationId: string) {
  const staff = await requireStaff();
  await rejectApplication(staff, applicationId);
  revalidatePath("/staff/signups");
}

export type TestEmailState = { ok?: string; error?: string };

export async function testEmailAction(_prev: TestEmailState): Promise<TestEmailState> {
  void _prev;
  const staff = await requireStaff();
  try {
    return (await sendTestSignupAlert(staff))
      ? { ok: `Sent to ${SIGNUP_ALERT_TO}. Check that inbox (and spam).` }
      : { ok: "Email isn't switched on yet; nothing was sent." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Email failed." };
  }
}
