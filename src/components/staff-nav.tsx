import Link from "next/link";

const LINKS = [
  { href: "/staff/receive", label: "Receive mail" },
  { href: "/staff/queue", label: "Queue" },
  { href: "/staff/clients/new", label: "New client" },
  { href: "/staff", label: "Clients" },
  { href: "/staff/orgs", label: "Nonprofits" },
  { href: "/staff/people", label: "People" },
];

export function StaffNav() {
  return (
    <nav className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 print:hidden">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="rounded-lg border border-[#7fe3d4]/60 px-3 py-3 text-center font-semibold text-[#7fe3d4]"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
