import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { IntakeCard } from "@/components/intake-card";
import { PrintButton } from "@/components/print-button";
import { StaffNav } from "@/components/staff-nav";
import { db } from "@/lib/db";
import { intakeQrUrl } from "@/lib/intake";
import { requireStaff } from "@/lib/session";

// Reprint a client's card or shelf label. PINs are never stored readable, so
// this card has no PIN; use Reset PIN to give the client a new one.
export default async function ClientCardPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireStaff();
  const { id } = await params;
  const client = await db.client.findUnique({ where: { id } });
  if (!client) notFound();
  const qrDataUrl = await QRCode.toDataURL(intakeQrUrl(client.pmbNumber), { margin: 1, width: 280 });

  return (
    <AppShell name={viewer.name}>
      <StaffNav />
      <IntakeCard name={`${client.firstName} ${client.lastName}`} pmbNumber={client.pmbNumber} qrDataUrl={qrDataUrl} />
      <PrintButton />
    </AppShell>
  );
}
