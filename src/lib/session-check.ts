import { db } from "@/lib/db";
import type { Viewer } from "@/lib/permissions";
import { DISABLED_UNTIL } from "@/lib/security";

// The session cookie is valid for 30 idle minutes, so re-check the database on
// every request: a removed account or changed role loses access immediately.
export async function sessionStillValid(identity: Viewer): Promise<boolean> {
  if (identity.role === "CLIENT") {
    return !!identity.clientId && (await db.client.count({ where: { id: identity.clientId } })) > 0;
  }
  const user = await db.user.findUnique({ where: { id: identity.id }, select: { role: true, lockedUntil: true } });
  if (!user || user.role !== identity.role) return false;
  return !user.lockedUntil || user.lockedUntil.getTime() < DISABLED_UNTIL.getTime();
}
