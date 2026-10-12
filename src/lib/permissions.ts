import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import type { SessionIdentity } from "@/lib/login";

// The part of the session the permission checks rely on. IDs here come from
// the signed session cookie, never from the URL or a form.
export type Viewer = Pick<SessionIdentity, "id" | "role" | "clientId" | "orgId">;

export function isStaff(viewer: Viewer | null | undefined): boolean {
  return !!viewer && (viewer.role === "STAFF" || viewer.role === "ADMIN");
}

// May this person see this client's mail?
// - The client themselves
// - An approved, non-revoked delegate (case manager / caregiver)
// - Staff and admins
// Org admins see client lists and invoices, never mail.
export async function canViewClient(viewer: Viewer | null | undefined, clientId: string): Promise<boolean> {
  if (!viewer || !clientId) return false;
  if (viewer.role === "CLIENT") return viewer.clientId === clientId;
  if (isStaff(viewer)) return true;
  if (viewer.role === "CASE_MANAGER") {
    const delegate = await db.delegate.findFirst({
      where: { clientId, userId: viewer.id, revokedAt: null },
      select: { id: true },
    });
    return delegate !== null;
  }
  return false;
}

// Load one mail item for display. Returns null (shown as "not found") when the
// item doesn't exist OR the viewer may not see it, so guessing IDs reveals nothing.
export async function getMailItemForViewer(viewer: Viewer | null | undefined, mailItemId: string, ip?: string | null) {
  if (!viewer) return null;
  const item = await db.mailItem.findUnique({
    where: { id: mailItemId },
    include: { images: { orderBy: [{ kind: "asc" }, { pageNumber: "asc" }] } },
  });
  if (!item || !(await canViewClient(viewer, item.clientId))) return null;

  await writeAudit({
    action: "VIEW",
    mailItemId: item.id,
    clientId: item.clientId,
    userId: viewer.role === "CLIENT" ? null : viewer.id,
    ip,
  });
  return item;
}

// Clients a viewer may see mail for (for list pages).
export async function viewableClientIds(viewer: Viewer | null | undefined): Promise<string[] | "ALL"> {
  if (!viewer) return [];
  if (viewer.role === "CLIENT") return viewer.clientId ? [viewer.clientId] : [];
  if (isStaff(viewer)) return "ALL";
  if (viewer.role === "CASE_MANAGER") {
    const rows = await db.delegate.findMany({
      where: { userId: viewer.id, revokedAt: null },
      select: { clientId: true },
    });
    return rows.map((r) => r.clientId);
  }
  return [];
}
