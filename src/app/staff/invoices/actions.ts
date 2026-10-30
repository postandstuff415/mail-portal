"use server";

import { revalidatePath } from "next/cache";
import { generateMonthlyInvoices, setInvoiceStatus } from "@/lib/billing";
import { emailInvoice, InvoiceEmailError } from "@/lib/invoice-email";
import { markClientInvoicePaid, runSelfPayBilling } from "@/lib/self-pay";
import { requireStaff } from "@/lib/session";

export async function generateLastMonthAction() {
  await requireStaff();
  await generateMonthlyInvoices();
  revalidatePath("/staff/invoices");
}

export type EmailState = { ok?: string; error?: string };

export async function emailInvoiceAction(invoiceId: string, _prev: EmailState): Promise<EmailState> {
  void _prev;
  const staff = await requireStaff();
  try {
    const { sent } = await emailInvoice(staff, invoiceId);
    revalidatePath("/staff/invoices");
    return sent ? { ok: "Emailed." } : { ok: "Email isn't switched on yet; nothing was sent. Print it instead." };
  } catch (error) {
    if (error instanceof InvoiceEmailError) return { error: error.message };
    throw error;
  }
}

export async function markInvoiceAction(invoiceId: string, status: "SENT" | "PAID") {
  const staff = await requireStaff();
  if (status !== "SENT" && status !== "PAID") return;
  await setInvoiceStatus(staff, invoiceId, status);
  revalidatePath("/staff/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
}

// Make and send this month's self-pay bills now (the 1st-of-month job does the same; never duplicates).
export async function runSelfPayBillingAction() {
  await requireStaff();
  await runSelfPayBilling();
  revalidatePath("/staff/invoices");
}

export async function markClientBillPaidAction(billId: string) {
  const staff = await requireStaff();
  await markClientInvoicePaid(staff, billId);
  revalidatePath("/staff/invoices");
}
