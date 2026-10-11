import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getMailItemForViewer } from "@/lib/permissions";
import { homeFor, requestIp, requireViewer } from "@/lib/session";
import { signedImageUrl } from "@/lib/storage";

// One piece of mail. Anyone not allowed to see it gets the same "not found"
// page as a mail item that doesn't exist.
export default async function MailItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  const item = await getMailItemForViewer(viewer, id, await requestIp());
  if (!item) notFound();
  // 5-minute links, made only after the permission check above passed.
  const images = await Promise.all(
    item.images.map(async (img) => ({ id: img.id, kind: img.kind, url: await signedImageUrl(img.r2Key) })),
  );

  return (
    <AppShell name={viewer.name}>
      <Link href={homeFor(viewer.role)} className="text-[#ffd166] underline">
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-bold">
        {item.type === "PACKAGE" ? "Package" : item.type === "FLAT" ? "Large envelope" : "Letter"}
        {item.urgent && <span className="ml-3 align-middle text-base text-[#f48fb1]">Urgent</span>}
      </h1>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-lg">
        <dt className="opacity-80">Received</dt>
        <dd>{item.receivedAt.toLocaleDateString("en-US")}</dd>
        {item.sender && (
          <>
            <dt className="opacity-80">From</dt>
            <dd>{item.sender}</dd>
          </>
        )}
        <dt className="opacity-80">Status</dt>
        <dd>{item.status.replaceAll("_", " ").toLowerCase()}</dd>
      </dl>
      <div className="mt-6 flex flex-col gap-4">
        {images.map((img) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={img.id}
            src={img.url}
            alt={img.kind === "ENVELOPE" ? "Envelope" : "Contents page"}
            className="w-full rounded-lg bg-white"
          />
        ))}
      </div>
      <p className="mt-6 text-sm opacity-80">Request buttons (open and scan, hold, pickup) arrive in the next phase.</p>
    </AppShell>
  );
}
