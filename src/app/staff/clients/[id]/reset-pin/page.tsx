import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { ResetPinForm } from "./reset-form";

export default async function ResetPinPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireStaff();
  const { id } = await params;
  const client = await db.client.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <AppShell name={viewer.name}>
      <Link href="/staff" className="text-[#ffd166] underline">
        ← Back
      </Link>
      <h1 className="my-4 text-2xl font-bold">
        Reset PIN for {client.firstName} {client.lastName} ({client.pmbNumber})
      </h1>
      <ResetPinForm clientId={client.id} />
    </AppShell>
  );
}
