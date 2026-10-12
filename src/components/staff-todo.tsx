import Link from "next/link";
import { staffTodo } from "@/lib/dashboard";

// "Today" panel on the staff home: counts that need action, each a link.
export async function StaffTodo() {
  const t = await staffTodo();
  const items: { label: string; count: number; href: string; urgent?: boolean }[] = [
    { label: "Sign-ups waiting for ID", count: t.signups, href: "/staff/signups" },
    { label: "Client requests", count: t.openRequests, href: "/staff/queue" },
    { label: "Ready for pickup", count: t.readyForPickup, href: "/staff/queue" },
    { label: "Past 90-day hold (return or shred)", count: t.pastHold, href: "/staff/queue", urgent: true },
    { label: "Hold ends within 7 days", count: t.holdEndingSoon, href: "/staff/queue" },
    { label: "IDs expired", count: t.idsExpired, href: "/staff", urgent: true },
    { label: "IDs expiring within 30 days", count: t.idsExpiring, href: "/staff" },
    { label: "Active clients missing 1583", count: t.no1583, href: "/staff", urgent: true },
    { label: "Overdue invoices", count: t.overdueInvoices, href: "/staff/invoices", urgent: true },
  ];
  const crdSoon = t.crd.daysLeft <= 14;

  return (
    <section className="mb-6 rounded-xl border border-[#7fe3d4]/50 p-4">
      <h2 className="mb-3 text-lg font-semibold">Today</h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items
          .filter((i) => i.count > 0)
          .map((i) => (
            <li key={i.label}>
              <Link
                href={i.href}
                className={`flex justify-between rounded-lg px-3 py-2 ${i.urgent ? "bg-[#f48fb1] text-[#1c1a1d]" : "bg-white/5"}`}
              >
                <span>{i.label}</span>
                <strong>{i.count}</strong>
              </Link>
            </li>
          ))}
      </ul>
      {items.every((i) => i.count === 0) && <p className="opacity-80">Nothing waiting. Nice.</p>}
      <p className={`mt-3 text-sm ${crdSoon ? "font-semibold text-[#ffd166]" : "opacity-80"}`}>
        USPS quarterly CRD certification due{" "}
        {t.crd.date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          timeZone: "America/Los_Angeles",
        })}{" "}
        (
        {t.crd.daysLeft === 0 ? "today" : `${t.crd.daysLeft} days`}). Check that terminations are entered and no IDs
        have expired.
      </p>
    </section>
  );
}
