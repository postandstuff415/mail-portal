import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { canViewInvoice, isOverdue, monthLabel } from "@/lib/billing";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";

const PT = { timeZone: "America/Los_Angeles" } as const;

// Printable invoice (Print / Save as PDF). Staff, or that nonprofit's admins.
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: { org: true, lines: { orderBy: { clientName: "asc" } } },
  });
  if (!invoice || !canViewInvoice(viewer, invoice)) notFound();
  const minimumCount = invoice.lines.filter((l) => l.minimumOnly).length;

  return (
    <div className="min-h-screen bg-white p-6 text-black">
      <div className="mx-auto max-w-2xl">
        <div className="flex justify-between gap-6">
          <div>
            <p className="text-2xl font-extrabold">POST &amp; STUFF</p>
            <p className="text-sm">4051 Foothill Blvd, Oakland, CA 94604 · (415) 725-1603</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-xl font-bold">INVOICE</p>
            <p>No. {invoice.id.slice(-8).toUpperCase()}</p>
            <p>Date {invoice.createdAt.toLocaleDateString("en-US", PT)}</p>
            <p className="font-semibold">Due {invoice.dueDate.toLocaleDateString("en-US", PT)}</p>
            {isOverdue(invoice) && <p className="font-bold text-red-700">OVERDUE</p>}
            {invoice.status === "PAID" && <p className="font-bold text-green-700">PAID</p>}
          </div>
        </div>

        <div className="mt-6 text-sm">
          <p className="font-semibold">Bill to</p>
          <p>{invoice.org.name}</p>
          {invoice.org.contactName && <p>{invoice.org.contactName}</p>}
          {invoice.org.contactEmail && <p>{invoice.org.contactEmail}</p>}
        </div>

        <p className="mt-6 font-semibold">
          Client mailboxes, {monthLabel(invoice.month)} · {invoice.org.billingTerms === "NET60" ? "Net 60" : "Net 30"}
        </p>
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-1">Client</th>
              <th className="py-1">Mailbox</th>
              <th className="py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l) => (
              <tr key={l.id} className="border-b border-gray-300">
                <td className="py-1">
                  {l.clientName}
                  {l.minimumOnly && <span className="ml-1 text-gray-600">*</span>}
                </td>
                <td className="py-1">{l.pmbNumber}</td>
                <td className="py-1 text-right">${l.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-2 font-bold" colSpan={2}>
                Total ({invoice.activeClients} client{invoice.activeClients === 1 ? "" : "s"})
              </td>
              <td className="pt-2 text-right font-bold">${invoice.amount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        {minimumCount > 0 && (
          <p className="mt-2 text-sm text-gray-700">
            * Billed under the 90-day minimum: the client has left, and this month is within the first three months of
            their enrollment.
          </p>
        )}
        <p className="mt-6 text-sm">
          Rate: ${invoice.org.monthlyRate.toFixed(2)} per active client per month. Questions: (415) 725-1603.
        </p>
        <PrintButton />
      </div>
    </div>
  );
}
