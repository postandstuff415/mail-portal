"use server";

import { revalidatePath } from "next/cache";
import { endEnrollment, monthKey, reenroll } from "@/lib/billing";
import {
  generateClientInvoice,
  markClientInvoicePaid,
  SelfPayError,
  sendClientInvoice,
  setClientBilling,
} from "@/lib/self-pay";
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

export async function endEnrollmentAction(clientId: string) {
  const staff = await requireStaff();
  await endEnrollment(staff, clientId);
  revalidatePath(`/staff/clients/${clientId}`);
}

export async function reenrollAction(clientId: string) {
  const staff = await requireStaff();
  await reenroll(staff, clientId);
  revalidatePath(`/staff/clients/${clientId}`);
}

export async function revokeDelegateAction(clientId: string, delegateId: string) {
  const staff = await requireStaff();
  await revokeDelegate(staff, delegateId);
  revalidatePath(`/staff/clients/${clientId}`);
}

export type BillingState = { error?: string; ok?: string };

// Who pays for this client (also how an existing client becomes self-pay).
export async function updateBillingAction(clientId: string, _prev: BillingState, formData: FormData): Promise<BillingState> {
  void _prev;
  const staff = await requireStaff();
  try {
    const client = await setClientBilling(staff, clientId, {
      billingType: formData.get("billingType") === "SELF_PAY" ? "SELF_PAY" : "NONPROFIT",
      orgId: String(formData.get("orgId") ?? ""),
      monthlyPrice: String(formData.get("monthlyPrice") ?? ""),
      email: String(formData.get("email") ?? ""),
      billSmsConsent: formData.get("billSmsConsent") === "on",
    });
    revalidatePath(`/staff/clients/${clientId}`);
    return {
      ok: client.billingType === "SELF_PAY" ? "Saved. Use “Bill this month now” if they owe for this month." : "Saved.",
    };
  } catch (error) {
    if (error instanceof SelfPayError) return { error: error.message };
    throw error;
  }
}

export async function billThisMonthAction(clientId: string, _prev: BillingState): Promise<BillingState> {
  void _prev;
  await requireStaff();
  const bill = await generateClientInvoice(clientId, monthKey(new Date()));
  if (!bill) return { error: "Nothing to bill: not self-pay, no price, or not enrolled this month." };
  revalidatePath(`/staff/clients/${clientId}`);
  return { ok: "This month's bill is ready. Use “Send” to email/text it." };
}

export async function sendBillAction(clientId: string, billId: string, _prev: BillingState): Promise<BillingState> {
  void _prev;
  const staff = await requireStaff();
  try {
    const r = await sendClientInvoice(staff, billId);
    revalidatePath(`/staff/clients/${clientId}`);
    revalidatePath("/staff/invoices");
    const how = [r.emailed && "emailed", r.texted && "texted"].filter(Boolean).join(" and ");
    return { ok: how ? `Bill ${how}.` : "Email and bill texts aren't switched on yet; nothing was sent. Hand them a copy." };
  } catch (error) {
    if (error instanceof SelfPayError) return { error: error.message };
    throw error;
  }
}

export async function markBillPaidAction(clientId: string, billId: string) {
  const staff = await requireStaff();
  await markClientInvoicePaid(staff, billId);
  revalidatePath(`/staff/clients/${clientId}`);
  revalidatePath("/staff/invoices");
}
