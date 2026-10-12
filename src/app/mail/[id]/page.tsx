import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { STATUS_LABELS, TYPE_LABELS } from "@/components/mail-list";
import { db } from "@/lib/db";
import { isStaff, getMailItemForViewer } from "@/lib/permissions";
import { FINAL_STATUSES } from "@/lib/requests";
import { requestIp, requireViewer } from "@/lib/session";
import { signedImageUrl } from "@/lib/storage";
import { RequestButtons } from "./request-buttons";
import { StaffTools } from "./staff-tools";

const PT = { timeZone: "America/Los_Angeles" } as const;

// One piece of mail. Anyone not allowed to see it gets the same "not found"
// page as a mail item that doesn't exist.
export default async function MailItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  const item = await getMailItemForViewer(viewer, id, await requestIp());
  if (!item) notFound();

  const [images, openRequests, client] = await Promise.all([
    // 5-minute links, made only after the permission check above passed.
    Promise.all(item.images.map(async (img) => ({ ...img, url: await signedImageUrl(img.r2Key) }))),
    db.request.findMany({ where: { mailItemId: item.id, status: "OPEN" }, select: { type: true } }),
    db.client.findUnique({ where: { id: item.clientId }, select: { firstName: true, lastName: true, pmbNumber: true } }),
  ]);
  const closed = FINAL_STATUSES.includes(item.status);
  const staff = isStaff(viewer);
  const back = viewer.role === "CLIENT" ? "/mail" : staff ? "/staff/queue" : `/clients/${item.clientId}`;

  return (
    <AppShell name={viewer.name}>
      <Link href={back} className="text-[#ffd166] underline">
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-bold">
        {TYPE_LABELS[item.type]}
        {item.urgent && <span className="ml-3 align-middle text-base text-[#f48fb1]">Urgent</span>}
      </h1>
      {viewer.role !== "CLIENT" && client && (
        <p className="opacity-80">
          For {client.firstName} {client.lastName} · {client.pmbNumber}
        </p>
      )}
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-lg">
        <dt className="opacity-80">Received</dt>
        <dd>{item.receivedAt.toLocaleDateString("en-US", PT)}</dd>
        {item.sender && (
          <>
            <dt className="opacity-80">From</dt>
            <dd>{item.sender}</dd>
          </>
        )}
        <dt className="opacity-80">Status</dt>
        <dd>{STATUS_LABELS[item.status]}</dd>
        {!closed && (
          <>
            <dt className="opacity-80">Held until</dt>
            <dd>{item.retainUntil.toLocaleDateString("en-US", PT)}</dd>
          </>
        )}
      </dl>

      <div className="mt-6 flex flex-col gap-4">
        {images.map((img) => (
          <figure key={img.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.kind === "ENVELOPE" ? "Envelope" : `Page ${img.pageNumber}`}
              className="w-full rounded-lg bg-white"
              loading="lazy"
            />
            <figcaption className="mt-1 text-sm opacity-70">
              {img.kind === "ENVELOPE" ? "Envelope" : `Page ${img.pageNumber}`}
            </figcaption>
          </figure>
        ))}
      </div>

      <section className="mt-8">
        {staff ? (
          <StaffTools mailItemId={item.id} closed={closed} />
        ) : closed ? (
          <p className="opacity-80">This mail has left the shop.</p>
        ) : (
          <>
            <h2 className="mb-3 text-lg font-semibold">What should we do with it?</h2>
            <RequestButtons mailItemId={item.id} open={openRequests.map((r) => r.type)} />
          </>
        )}
      </section>
    </AppShell>
  );
}
