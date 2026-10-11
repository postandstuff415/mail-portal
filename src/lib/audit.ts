import type { AuditAction } from "@prisma/client";
import { db } from "@/lib/db";

type AuditEntry = {
  action: AuditAction;
  userId?: string | null;
  clientId?: string | null;
  mailItemId?: string | null;
  ip?: string | null;
};

// Every login, failed login, view, upload, and download gets a row here.
export async function writeAudit(entry: AuditEntry) {
  await db.auditLog.create({
    data: {
      action: entry.action,
      userId: entry.userId ?? null,
      clientId: entry.clientId ?? null,
      mailItemId: entry.mailItemId ?? null,
      ip: entry.ip ?? null,
    },
  });
}

export function ipFromHeaders(headers: Headers | null | undefined): string | null {
  if (!headers) return null;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip");
}
