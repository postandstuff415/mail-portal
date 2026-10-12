import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StaffNav } from "@/components/staff-nav";
import { addMonths, isOverdue, monthKey, monthLabel } from "@/lib/billing";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { generateLastMonthAction, markInvoiceAction } from "./actions";
import { EmailInvoiceButton } from "./email-button";

const PT = { timeZone: "America/Los_Angeles" } as const;

// Monthly invoices to partner nonprofits. They are made automatically on the
// 1st; the button makes last month's now (it never makes duplicates).
export default async function InvoicesPage() {
  const viewer = await requireStaff();
  const invoices = await db.invoice.findMany({
    orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
    include: { org: { select: { name: true } } },
    take: 200,
  });
  const lastMonth = addMonths(monthKey(new Date()), -1);
  const owed = invoices.filter((i) => i.status !== "PAID").reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <AppShell name={viewer.name}>
      <StaffNav />
      <h1 className="mb-1 text-2xl font-bold">Invoices</h1>
      <p className="mb-4 opacity-80">Unpaid total: ${owed.toFixed(2)}</p>
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
