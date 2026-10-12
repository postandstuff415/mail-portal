"use server";

import { revalidatePath } from "next/cache";
import { generateMonthlyInvoices, setInvoiceStatus } from "@/lib/billing";
import { requireStaff } from "@/lib/session";

export async function generateLastMonthAction() {
  await requireStaff();
  await generateMonthlyInvoices();
  revalidatePath("/staff/invoices");
}

export async function markInvoiceAction(invoiceId: string, status: "SENT" | "PAID") {
  const staff = await requireStaff();
  if (status !== "SENT" && status !== "PAID") return;
  await setInvoiceStatus(staff, invoiceId, status);
  revalidatePath("/staff/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
}
