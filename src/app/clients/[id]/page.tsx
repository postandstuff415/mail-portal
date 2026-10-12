import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MailList } from "@/components/mail-list";
import { db } from "@/lib/db";
import { canViewClient } from "@/lib/permissions";
import { mailForClient } from "@/lib/mail-queries";
import { requireViewer } from "@/lib/session";
import { unseenIds } from "@/lib/unread";

// One client's mail, for an approved case manager (or staff).
export default async function ClientMailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  if (!(await canViewClient(viewer, id))) notFound();

  const client = await db.client.findUnique({ where: { id } });
  if (!client) notFound();
  const items = await mailForClient(id);
  const unseen = await unseenIds(viewer, items.map((i) => i.id));

  return (
    <AppShell name={viewer.name}>
      <Link href="/clients" className="text-[#ffd166] underline">
        ← All clients
      </Link>
      <h1 className="mb-4 mt-4 text-2xl font-bold">
        {client.firstName} {client.lastName} <span className="text-lg opacity-70">· {client.pmbNumber}</span>
      </h1>
      <MailList items={items} unseen={unseen} />
    </AppShell>
  );
}
