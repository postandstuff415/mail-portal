import { db } from "@/lib/db";
import { isStaff, type Viewer } from "@/lib/permissions";

// Case managers / caregivers a client has approved (in writing) to see their mail.
// Only staff add or remove them, after checking the client's signed consent.

export class DelegateError extends Error {}

export async function addDelegate(viewer: Viewer | null | undefined, clientId: string, userId: string, consentSigned: boolean) {
  if (!isStaff(viewer)) throw new DelegateError("Staff only.");
  if (!consentSigned) throw new DelegateError("The client must sign the consent before you add someone.");
  const [client, user] = await Promise.all([
    db.client.findUnique({ where: { id: clientId }, select: { id: true } }),
    db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } }),
  ]);
  if (!client) throw new DelegateError("Client not found.");
  if (!user || user.role !== "CASE_MANAGER") throw new DelegateError("Pick a case manager or caregiver account.");

  // Re-approving someone who was removed before starts a fresh approval.
  return db.delegate.upsert({
    where: { clientId_userId: { clientId, userId } },
    create: { clientId, userId },
    update: { approvedAt: new Date(), revokedAt: null },
  });
}

export async function revokeDelegate(viewer: Viewer | null | undefined, delegateId: string) {
  if (!isStaff(viewer)) throw new DelegateError("Staff only.");
  await db.delegate.updateMany({ where: { id: delegateId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function activeDelegates(clientId: string) {
  return db.delegate.findMany({
    where: { clientId, revokedAt: null },
    include: { user: { select: { id: true, name: true, email: true, org: { select: { name: true } } } } },
    orderBy: { approvedAt: "asc" },
  });
}
