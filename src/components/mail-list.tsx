import Link from "next/link";
import type { MailStatus, MailType, RequestType } from "@prisma/client";
import { REQUEST_LABELS } from "@/lib/requests";

export type MailListItem = {
  id: string;
  type: MailType;
  urgent: boolean;
  status: MailStatus;
  receivedAt: Date;
  requests: { type: RequestType }[];
};

export const TYPE_LABELS: Record<MailType, string> = { LETTER: "Letter", FLAT: "Large envelope", PACKAGE: "Package" };

export const STATUS_LABELS: Record<MailStatus, string> = {
  RECEIVED: "At the shop",
  SCAN_REQUESTED: "Waiting to be opened and scanned",
  OPENED: "Opened and scanned",
  READY_FOR_PICKUP: "Ready for pickup",
  PICKED_UP: "Picked up",
  RETURNED: "Returned to sender",
  SHREDDED: "Shredded",
};

// Big, phone-friendly rows: urgent first, then newest. No photos here, so the
// list loads fast on slow data; the photo opens on the item's own page.
export function MailList({ items, unseen }: { items: MailListItem[]; unseen: Set<string> }) {
  if (items.length === 0) return <p className="text-lg">No mail right now.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/mail/${item.id}`}
            className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-lg ${
              unseen.has(item.id) ? "border-[#ffd166]" : "border-[#7fe3d4]/50"
            }`}
          >
            <span>
              {TYPE_LABELS[item.type]}
              <span className="block text-sm opacity-80">
                {item.receivedAt.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" })} ·{" "}
                {STATUS_LABELS[item.status]}
              </span>
              {item.requests.length > 0 && (
                <span className="block text-sm text-[#7fe3d4]">
                  Asked: {item.requests.map((r) => REQUEST_LABELS[r.type]).join(", ")}
                </span>
              )}
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              {unseen.has(item.id) && (
                <span className="rounded-full bg-[#ffd166] px-3 py-1 text-sm font-bold text-[#1c1a1d]">New</span>
              )}
              {item.urgent && (
                <span className="rounded-full bg-[#f48fb1] px-3 py-1 text-sm font-bold text-[#1c1a1d]">Urgent</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
