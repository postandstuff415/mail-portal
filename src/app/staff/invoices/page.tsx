import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StaffNav } from "@/components/staff-nav";
import { addMonths, isOverdue, monthKey, monthLabel } from "@/lib/billing";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import {
  generateLastMonthAction,
  markClientBillPaidAction,
  markInvoiceAction,
  runSelfPayBillingAction,
} from "./actions";
import { EmailInvoiceButton } from "./email-button";

const PT = { timeZone: "America/Los_Angeles" } as const;

// Monthly invoices to partner nonprofits. They are made automatically on the
// 1st; the button makes last month's now (it never makes duplicates).
export default async function InvoicesPage() {
  const viewer = await requireStaff();
  const [invoices, bills] = await Promise.all([
    db.invoice.findMany({
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
      include: { org: { select: { name: true } } },
      take: 200,
    }),
    db.clientInvoice.findMany({
      orderBy: [{ month: "desc" }, { createdAt: "desc" }],
      include: { client: { select: { id: true, firstName: true, lastName: true, pmbNumber: true } } },
      take: 200,
    }),
  ]);
  const thisMonth = monthKey(new Date());
  const billsOwed = bills.filter((b) => b.status !== "PAID").reduce((sum, b) => sum + Number(b.amount), 0);
  const lastMonth = addMonths(monthKey(new Date()), -1);
  const owed = invoices.filter((i) => i.status !== "PAID").reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <AppShell name={viewer.name}>
      <StaffNav />
      <h1 className="mb-1 text-2xl font-bold">Invoices</h1>
      <p className="mb-4 opacity-80">
        Nonprofits unpaid: ${owed.toFixed(2)} · Self-pay unpaid: ${billsOwed.toFixed(2)}
      </p>

      <h2 className="mb-2 text-xl font-semibold">Self-pay bills</h2>
      <p className="mb-2 text-sm opacity-80">
        Sent automatically on the 1st (and on the day a self-pay client is activated). Mark each one paid when they pay.
      </p>
      <form action={runSelfPayBillingAction} className="mb-4">
        <button type="submit" className="h-12 w-full rounded-md border border-[#7fe3d4] font-semibold text-[#7fe3d4]">
          Make and send any missing {monthLabel(thisMonth)} self-pay bills now
        </button>
      </form>
      {bills.length === 0 && <p className="mb-6">No self-pay bills yet.</p>}
      <ul className="mb-8 flex flex-col gap-2">
        {bills.map((b) => (
          <li key={b.id} className="rounded-xl border border-[#ffd166]/50 p-3">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/staff/clients/${b.client.id}`} className="underline decoration-[#7fe3d4]/60">
                {b.client.firstName} {b.client.lastName} ({b.client.pmbNumber}) · {monthLabel(b.month)}
              </Link>
              <span className="font-semibold">${b.amount.toFixed(2)}</span>
            </div>
            <p className="text-sm opacity-80">
              due {b.dueDate.toLocaleDateString("en-US", PT)} ·{" "}
              <span className={isOverdue(b) ? "font-bold text-[#f48fb1]" : ""}>
                {isOverdue(b) ? "OVERDUE" : b.status.toLowerCase()}
              </span>
              {b.emailedAt && " · emailed"}
              {b.textedAt && " · texted"}
              {!b.emailedAt && !b.textedAt && b.status !== "PAID" && " · not sent yet"}
            </p>
            {b.status !== "PAID" && (
              <form action={markClientBillPaidAction.bind(null, b.id)} className="mt-2 text-sm">
                <button type="submit" className="text-[#ffd166] underline">
                  Mark paid
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <h2 className="mb-2 text-xl font-semibold">Nonprofit invoices</h2>
      <form action={generateLastMonthAction} className="mb-6">
        <button type="submit" className="h-12 w-full rounded-md bg-[#7fe3d4] font-semibold text-[#1c1a1d]">
          Make {monthLabel(lastMonth)} invoices now
        </button>
      </form>
      {invoices.length === 0 && <p>No invoices yet.</p>}
      <ul className="flex flex-col gap-2">
        {invoices.map((inv) => (
          <li key={inv.id} className="rounded-xl border border-[#7fe3d4]/50 p-3">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/invoices/${inv.id}`} className="underline decoration-[#7fe3d4]/60">
                {inv.org.name} · {monthLabel(inv.month)}
              </Link>
              <span className="font-semibold">${inv.amount.toFixed(2)}</span>
            </div>
            <p className="text-sm opacity-80">
              {inv.activeClients} client{inv.activeClients === 1 ? "" : "s"} · due{" "}
              {inv.dueDate.toLocaleDateString("en-US", PT)} ·{" "}
              <span className={isOverdue(inv) ? "font-bold text-[#f48fb1]" : ""}>
                {isOverdue(inv) ? "OVERDUE" : inv.status.toLowerCase()}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {inv.status !== "PAID" && <EmailInvoiceButton invoiceId={inv.id} />}
              {inv.status === "DRAFT" && (
                <form action={markInvoiceAction.bind(null, inv.id, "SENT")}>
                  <button type="submit" className="text-[#ffd166] underline">
                    Mark sent
                  </button>
                </form>
              )}
              {inv.status !== "PAID" && (
                <form action={markInvoiceAction.bind(null, inv.id, "PAID")}>
                  <button type="submit" className="text-[#ffd166] underline">
                    Mark paid
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
