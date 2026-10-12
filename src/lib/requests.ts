import type { MailStatus, RequestType } from "@prisma/client";
import { db } from "@/lib/db";
import { canViewClient, isStaff, type Viewer } from "@/lib/permissions";

// Client / case manager requests on a piece of mail, and what staff do about them.

export class RequestError extends Error {}

// Mail that has left the shop can't be acted on any more.
export const FINAL_STATUSES: MailStatus[] = ["PICKED_UP", "RETURNED", "SHREDDED"];

export const REQUEST_LABELS: Record<RequestType, string> = {
  OPEN_AND_SCAN: "Open and scan",
  HOLD: "Hold",
  PICKUP: "I'll pick it up",
  DISCARD: "Discard",
};

// What the mail's status becomes when a request comes in.
const STATUS_FOR: Partial<Record<RequestType, MailStatus>> = {
  OPEN_AND_SCAN: "SCAN_REQUESTED",
  PICKUP: "READY_FOR_PICKUP",
};

export async function createRequest(viewer: Viewer | null | undefined, mailItemId: string, type: RequestType) {
  const item = await db.mailItem.findUnique({ where: { id: mailItemId } });
  // Same answer for "doesn't exist" and "not yours", so IDs can't be probed.
  if (!item || !(await canViewClient(viewer, item.clientId))) throw new RequestError("Mail not found.");
  if (FINAL_STATUSES.includes(item.status)) throw new RequestError("This mail has already left the shop.");

  // Asking twice is harmless: return the request that's already open.
  const existing = await db.request.findFirst({ where: { mailItemId, type, status: "OPEN" } });
  if (existing) return existing;

  const status = STATUS_FOR[type];
  const [request] = await db.$transaction([
    db.request.create({
      data: { mailItemId, type, requestedById: viewer!.role === "CLIENT" ? null : viewer!.id },
    }),
    ...(status ? [db.mailItem.update({ where: { id: mailItemId }, data: { status } })] : []),
  ]);
  return request;
}

export async function markPickedUp(viewer: Viewer | null | undefined, mailItemId: string, method: "CODE" | "ID") {
  if (!isStaff(viewer)) throw new RequestError("Staff only.");
  const item = await db.mailItem.findUnique({ where: { id: mailItemId } });
  if (!item) throw new RequestError("Mail not found.");
  if (FINAL_STATUSES.includes(item.status)) throw new RequestError("Already closed out.");

  await db.$transaction([
    db.pickup.create({ data: { mailItemId, verifiedById: viewer!.id, method } }),
    db.mailItem.update({ where: { id: mailItemId }, data: { status: "PICKED_UP" } }),
    db.request.updateMany({ where: { mailItemId, status: "OPEN" }, data: { status: "DONE" } }),
  ]);
}

// Retention: staff record what happened to mail past its hold date.
export async function closeOut(viewer: Viewer | null | undefined, mailItemId: string, outcome: "RETURNED" | "SHREDDED") {
  if (!isStaff(viewer)) throw new RequestError("Staff only.");
  const item = await db.mailItem.findUnique({ where: { id: mailItemId } });
  if (!item) throw new RequestError("Mail not found.");
  if (FINAL_STATUSES.includes(item.status)) throw new RequestError("Already closed out.");
  await db.$transaction([
    db.mailItem.update({ where: { id: mailItemId }, data: { status: outcome } }),
    db.request.updateMany({ where: { mailItemId, status: "OPEN" }, data: { status: "DONE" } }),
  ]);
}
