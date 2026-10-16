import { isOverdue, monthLabel } from "@/lib/billing";
import { db } from "@/lib/db";
import { escapeHtml, sendEmail, type Email, type EmailSender } from "@/lib/email";
import { isStaff, type Viewer } from "@/lib/permissions";

export class InvoiceEmailError extends Error {}

const PT = { timeZone: "America/Los_Angeles" } as const;
const money = (n: { toFixed(d: number): string }) => `$${n.toFixed(2)}`;

type InvoiceForEmail = NonNullable<Awaited<ReturnType<typeof loadInvoice>>>;

function loadInvoice(id: string) {
  return db.invoice.findUnique({ where: { id }, include: { org: true, lines: { orderBy: { clientName: "asc" } } } });
}

// The invoice itself in the email body, so the billing contact needs no login.
export function invoiceEmail(inv: InvoiceForEmail): Email {
  const number = inv.id.slice(-8).toUpperCase();
  const period = monthLabel(inv.month);
  const due = inv.dueDate.toLocaleDateString("en-US", PT);
  const terms = inv.org.billingTerms === "NET60" ? "Net 60" : "Net 30";
  const minimumNote = inv.lines.some((l) => l.minimumOnly)
    ? "* Billed under the 90-day minimum: the client has left, and this month is within the first three months of their enrollment."
    : "";
  const subject = `Post and Stuff invoice ${number}: ${period}, ${money(inv.amount)} due ${due}`;

  const rows = inv.lines
    .map(
      (l) =>
        `<tr><td style="padding:4px 8px;border-bottom:1px solid #ddd">${escapeHtml(l.clientName)}${l.minimumOnly ? " *" : ""}</td>` +
        `<td style="padding:4px 8px;border-bottom:1px solid #ddd">${escapeHtml(l.pmbNumber)}</td>` +
        `<td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:right">${money(l.amount)}</td></tr>`,
    )
    .join("");
  const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:640px">
<p style="font-size:20px;font-weight:bold;margin:0">POST &amp; STUFF</p>
<p style="margin:0 0 16px">4051 Foothill Blvd, Oakland, CA 94601 · (415) 725-1603</p>
<p>Invoice <strong>${number}</strong> for <strong>${escapeHtml(inv.org.name)}</strong><br>
Client mailboxes, ${escapeHtml(period)} · ${terms}<br>
<strong>Total ${money(inv.amount)} · due ${due}</strong>${isOverdue(inv) ? ' · <strong style="color:#b00">OVERDUE</strong>' : ""}</p>
<table style="border-collapse:collapse;width:100%;font-size:14px">
<thead><tr><th style="text-align:left;padding:4px 8px;border-bottom:2px solid #111">Client</th><th style="text-align:left;padding:4px 8px;border-bottom:2px solid #111">Mailbox</th><th style="text-align:right;padding:4px 8px;border-bottom:2px solid #111">Amount</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr><td colspan="2" style="padding:8px;font-weight:bold">Total (${inv.activeClients} client${inv.activeClients === 1 ? "" : "s"})</td><td style="padding:8px;text-align:right;font-weight:bold">${money(inv.amount)}</td></tr></tfoot>
</table>
${minimumNote ? `<p style="font-size:13px;color:#444">${minimumNote}</p>` : ""}
<p style="font-size:13px">Rate: ${money(inv.org.monthlyRate)} per active client per month. Questions: reply to this email or call (415) 725-1603.</p>
</div>`;

  const text = [
    `POST & STUFF invoice ${number}`,
    `${inv.org.name} · client mailboxes, ${period} · ${terms}`,
    `Total ${money(inv.amount)}, due ${due}`,
    "",
    ...inv.lines.map((l) => `${l.clientName}${l.minimumOnly ? " *" : ""} (${l.pmbNumber}): ${money(l.amount)}`),
    "",
    minimumNote,
    "Questions: (415) 725-1603",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");

  return { to: inv.org.contactEmail ?? "", subject, html, text };
}

// Email an invoice to the nonprofit's billing contact; a draft becomes "sent".
// `viewer` null = the monthly cron job.
export async function emailInvoice(viewer: Viewer | null, invoiceId: string, send: EmailSender = sendEmail) {
  if (viewer !== null && !isStaff(viewer)) throw new InvoiceEmailError("Staff only.");
  const inv = await loadInvoice(invoiceId);
  if (!inv) throw new InvoiceEmailError("Invoice not found.");
  if (!inv.org.contactEmail) throw new InvoiceEmailError(`${inv.org.name} has no billing email. Add one under Nonprofits.`);
  const sent = await send(invoiceEmail(inv));
  // Only a real send marks the invoice sent; a dry run leaves it as a draft.
  if (sent && inv.status === "DRAFT") await db.invoice.update({ where: { id: inv.id }, data: { status: "SENT" } });
  return { sent };
}

// After the monthly run: email every draft invoice for that month (skips nonprofits with no billing email).
export async function emailDraftInvoices(month: string, send: EmailSender = sendEmail) {
  const drafts = await db.invoice.findMany({ where: { month, status: "DRAFT", org: { contactEmail: { not: null } } } });
  let sent = 0;
  for (const inv of drafts) {
    try {
      if ((await emailInvoice(null, inv.id, send)).sent) sent++;
    } catch (error) {
      console.error(`Invoice ${inv.id} email failed:`, error instanceof Error ? error.message : error);
    }
  }
  return { drafts: drafts.length, sent };
}
