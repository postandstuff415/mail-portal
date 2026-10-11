import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { homeFor, requireViewer } from "@/lib/session";

// A client's own mail. Phase 4 adds thumbnails and request buttons.
export default async function MyMailPage() {
  const viewer = await requireViewer();
  if (viewer.role !== "CLIENT" || !viewer.clientId) redirect(homeFor(viewer.role));

  const items = await db.mailItem.findMany({
    where: { clientId: viewer.clientId },
    orderBy: [{ urgent: "desc" }, { receivedAt: "desc" }],
  });

  return (
    <AppShell name={viewer.name}>
      <h1 className="mb-4 text-2xl font-bold">Your mail</h1>
      {items.length === 0 ? (
        <p className="text-lg">No mail yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/mail/${item.id}`}
                className="flex items-center justify-between rounded-xl border border-[#7fe3d4]/50 p-4 text-lg"
              >
                <span>
                  {item.type === "PACKAGE" ? "Package" : item.type === "FLAT" ? "Large envelope" : "Letter"}
                  <span className="block text-sm opacity-80">{item.receivedAt.toLocaleDateString("en-US")}</span>
                </span>
                {item.urgent && (
                  <span className="rounded-full bg-[#f48fb1] px-3 py-1 text-sm font-bold text-[#1c1a1d]">Urgent</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
