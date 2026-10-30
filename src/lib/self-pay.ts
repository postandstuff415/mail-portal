import { Prisma } from "@prisma/client";
import { billingFor, MINIMUM_MONTHS, addMonths, monthKey, monthLabel } from "@/lib/billing";
import { db } from "@/lib/db";
import { escapeHtml, sendEmail, type Email, type EmailSender } from "@/lib/email";
import { isOptedOutError } from "@/lib/alerts";
import { isStaff, type Viewer } from "@/lib/permissions";
import { sendSms, smsConfigured, type SmsSender } from "@/lib/sms";

// Self-pay clients (no sponsoring nonprofit) pay their own monthly price.
// Owner rules: same as nonprofits, a 3-month minimum (enrollment month counts),
// then month to month. Bills go out in advance: on the day the mailbox is
// activated (for that month) and on the 1st of every month after.
// Each bill is emailed if we have an email, and texted if the client agreed to
// bill texts AND BILL_SMS_LIVE=true (the Twilio campaign must cover bills first).

export class SelfPayError extends Error {}

export const DEFAULT_SELF_PAY_PRICE = "15.00";
export const SELF_PAY_DUE_DAYS = 10;

// Exact wording of the optional bill-text checkbox (sign-up page and staff forms).
export const BILL_SMS_CONSENT_TEXT =
  "I agree to receive my monthly mailbox bill by text from Post and Stuff at the mobile number I provided. " +
  "About 1 message per month. Message and data rates may apply. Reply STOP to cancel, HELP for help.";

const PT = { timeZone: "America/Los_Angeles" } as const;
const DAY_MS = 24 * 60 * 60 * 1000;
const money = (n: { toFixed(d: number): string }) => `$${n.toFixed(2)}`;

export function billTextsLive(): boolean {
  return process.env.BILL_SMS_LIVE === "true" && smsConfigured();
}

function paymentUrl(): string | null {
  return process.env.SELF_PAY_PAYMENT_URL?.trim() || null;
}

// "15", "$15.00", "15.5" -> "15.00". Rejects zero, negatives, and nonsense.
export function parsePrice(raw: string): Prisma.Decimal {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(cleaned) || Number(cleaned) <= 0) {
    throw new SelfPayError("Monthly price must be a dollar amount, like 15 or 15.00.");
  }
  return new Prisma.Decimal(cleaned).toDecimalPlaces(2);
}

// Make one self-pay client's bill for a month. Safe to run twice (returns the
// existing bill). Null when the client isn't self-pay, has no price, or isn't
// billable that month.
export async function generateClientInvoice(clientId: string, month: string, now = new Date()) {
  const existing = await db.clientInvoice.findUnique({ where: { clientId_month: { clientId, month } } });
  if (existing) return existing;
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client || client.billingType !== "SELF_PAY" || !client.monthlyPrice) return null;
  if (!billingFor(client, month).billed) return null;
  try {
    return await db.clientInvoice.create({
      data: { clientId, month, amount: client.monthlyPrice, dueDate: new Date(now.getTime() + SELF_PAY_DUE_DAYS * DAY_MS) },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return db.clientInvoice.findUniqueOrThrow({ where: { clientId_month: { clientId, month } } });
    }
    throw error;
  }
}

type BillForMessage = {
  id: string;
  month: string;
  amount: Prisma.Decimal;
  dueDate: Date;
  client: { firstName: string; lastName: string; pmbNumber: string; enrolledAt: Date };
};

function inMinimum(bill: BillForMessage) {
  return bill.month <= addMonths(monthKey(bill.client.enrolledAt), MINIMUM_MONTHS - 1);
}

// The text: amount, due date, how to pay. Never mentions mail.
export function clientBillText(bill: BillForMessage): string {
  const url = paymentUrl();
  return (
    `Post and Stuff: your mailbox bill for ${monthLabel(bill.month)} is ${money(bill.amount)}, ` +
    `due ${bill.dueDate.toLocaleDateString("en-US", { ...PT, month: "short", day: "numeric" })}. ` +
    `Pay at 4051 Foothill Blvd, Oakland${url ? ` or ${url}` : ""}. Questions: (415) 725-1603. Reply STOP to opt out.`
  );
}

export function clientBillEmail(bill: BillForMessage, to: string): Email {
  const number = bill.id.slice(-8).toUpperCase();
  const period = monthLabel(bill.month);
  const due = bill.dueDate.toLocaleDateString("en-US", PT);
  const name = `${bill.client.firstName} ${bill.client.lastName}`;
  const url = paymentUrl();
  const note = inMinimum(bill)
    ? `Your first ${MINIMUM_MONTHS} months are the minimum. After that your mailbox is month to month.`
    : "Your mailbox is month to month. To close it, tell us at the shop or call (415) 725-1603.";
  const how = `Pay at the shop, 4051 Foothill Blvd, Oakland${url ? `, or online: ${url}` : ""}.`;
  const subject = `Post and Stuff mailbox bill: ${period}, ${money(bill.amount)} due ${due}`;
  const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:560px">
<p style="font-size:20px;font-weight:bold;margin:0">POST &amp; STUFF</p>
<p style="margin:0 0 16px">4051 Foothill Blvd, Oakland, CA 94601 · (415) 725-1603</p>
<p>Bill <strong>${number}</strong> for <strong>${escapeHtml(name)}</strong>, mailbox ${escapeHtml(bill.client.pmbNumber)}</p>
<p style="font-size:18px">Mailbox, ${escapeHtml(period)}: <strong>${money(bill.amount)}</strong><br>Due <strong>${due}</strong></p>
<p>${escapeHtml(how)}${url ? ` <a href="${escapeHtml(url)}">Pay online</a>` : ""}</p>
<p style="font-size:13px;color:#444">${escapeHtml(note)}</p>
</div>`;
  const text = [
    `POST & STUFF bill ${number}`,
    `${name}, mailbox ${bill.client.pmbNumber}`,
    `Mailbox, ${period}: ${money(bill.amount)}, due ${due}`,
    how,
    note,
    "Questions: (415) 725-1603",
  ].join("\n");
  return { to, subject, html, text };
}

export type Senders = { email?: EmailSender; sms?: SmsSender };

// Send one bill by every channel the client has. A draft becomes "sent" once
// a real email or text goes out. `viewer` null = automatic (cron/activation).
export async function sendClientInvoice(viewer: Viewer | null, invoiceId: string, senders: Senders = {}) {
  if (viewer !== null && !isStaff(viewer)) throw new SelfPayError("Staff only.");
  const bill = await db.clientInvoice.findUnique({ where: { id: invoiceId }, include: { client: true } });
  if (!bill) throw new SelfPayError("Bill not found.");
  if (bill.status === "PAID") throw new SelfPayError("This bill is already paid.");
  const c = bill.client;
  const canText = !!c.phone && !!c.billSmsConsentAt;
  if (!c.email && !canText) {
    throw new SelfPayError("No email and no bill-text permission on file. Add an email on the client's page, or hand them the bill.");
  }

  let emailed = false;
  let texted = false;
  if (c.email) emailed = await (senders.email ?? sendEmail)(clientBillEmail(bill, c.email));
  if (canText && (senders.sms || billTextsLive())) {
    try {
      await (senders.sms ?? sendSms)(c.phone!, clientBillText(bill));
      texted = true;
    } catch (error) {
      console.error("Bill text failed:", error instanceof Error ? error.message : error);
      // They replied STOP: stop texting bills.
      if (isOptedOutError(error)) await db.client.update({ where: { id: c.id }, data: { billSmsConsentAt: null } });
    }
  }
  const now = new Date();
  if (emailed || texted) {
    await db.clientInvoice.update({
      where: { id: bill.id },
      data: {
        ...(emailed && { emailedAt: now }),
        ...(texted && { textedAt: now }),
        ...(bill.status === "DRAFT" && { status: "SENT" }),
      },
    });
  }
  return { emailed, texted };
}

// Make and send this month's bill for one client (used right after activation).
export async function billNow(clientId: string, now = new Date(), senders: Senders = {}) {
  const bill = await generateClientInvoice(clientId, monthKey(now), now);
  if (!bill || bill.status !== "DRAFT" || bill.emailedAt || bill.textedAt) return null;
  return sendClientInvoice(null, bill.id, senders).catch((error) => {
    console.error(`Bill ${bill.id} not sent:`, error instanceof Error ? error.message : error);
    return null;
  });
}

// On the 1st: this month's bill for every self-pay client, sent once.
export async function runSelfPayBilling(now = new Date(), senders: Senders = {}) {
  const month = monthKey(now);
  const clients = await db.client.findMany({
    where: { billingType: "SELF_PAY", monthlyPrice: { not: null } },
    select: { id: true },
  });
  let made = 0;
  let sent = 0;
  for (const c of clients) {
    const bill = await generateClientInvoice(c.id, month, now);
    if (!bill) continue;
    made++;
    if (bill.status !== "DRAFT" || bill.emailedAt || bill.textedAt) continue;
    try {
      const r = await sendClientInvoice(null, bill.id, senders);
      if (r.emailed || r.texted) sent++;
    } catch (error) {
      console.error(`Bill ${bill.id} not sent:`, error instanceof Error ? error.message : error);
    }
  }
  return { month, bills: made, sent };
}

export async function markClientInvoicePaid(viewer: Viewer | null | undefined, invoiceId: string, now = new Date()) {
  if (!isStaff(viewer)) throw new SelfPayError("Staff only.");
  await db.clientInvoice.update({ where: { id: invoiceId }, data: { status: "PAID", paidAt: now } });
}

// Staff change who pays for a client (also how an existing client becomes self-pay).
export async function setClientBilling(
  viewer: Viewer | null | undefined,
  clientId: string,
  input: { billingType: "NONPROFIT" | "SELF_PAY"; orgId?: string; monthlyPrice?: string; email?: string; billSmsConsent: boolean },
) {
  if (!isStaff(viewer)) throw new SelfPayError("Staff only.");
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) throw new SelfPayError("Client not found.");
  const email = input.email?.trim().toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new SelfPayError("Check the email address.");
  if (input.billSmsConsent && !client.phone) throw new SelfPayError("Add a phone number before turning on bill texts.");
  const billSmsConsentAt = input.billSmsConsent ? (client.billSmsConsentAt ?? new Date()) : null;

  if (input.billingType === "NONPROFIT") {
    if (!input.orgId || !(await db.organization.findUnique({ where: { id: input.orgId }, select: { id: true } }))) {
      throw new SelfPayError("Pick the nonprofit that pays.");
    }
    return db.client.update({
      where: { id: clientId },
      data: { billingType: "NONPROFIT", orgId: input.orgId, monthlyPrice: null, email, billSmsConsentAt },
    });
  }
  return db.client.update({
    where: { id: clientId },
    data: {
      billingType: "SELF_PAY",
      orgId: null,
      monthlyPrice: parsePrice(input.monthlyPrice ?? ""),
      email,
      billSmsConsentAt,
    },
  });
}
