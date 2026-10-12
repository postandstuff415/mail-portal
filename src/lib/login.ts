import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { normalizePmb } from "@/lib/pin";
import { LOCK_MINUTES, MAX_FAILED_LOGINS } from "@/lib/security";

// The identity stored in the session after a successful login.
export type SessionIdentity = {
  id: string;
  role: UserRole | "CLIENT";
  name: string;
  clientId?: string;
  orgId?: string | null;
  // Logged in with a temporary password: must set their own first.
  mustChangePassword?: boolean;
};

export type LoginResult = { ok: true; identity: SessionIdentity } | { ok: false; reason: "invalid" | "locked" };

// Compared against when the account doesn't exist, so a wrong mailbox number
// takes as long as a wrong PIN and can't be used to discover real numbers.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-pin", 10);

function lockedNow(lockedUntil: Date | null) {
  return lockedUntil !== null && lockedUntil > new Date();
}

function lockExpiry() {
  return new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
}

export async function loginClient(pmbInput: string, pin: string, ip: string | null): Promise<LoginResult> {
  const client = await db.client.findUnique({ where: { pmbNumber: normalizePmb(pmbInput) } });

  if (!client) {
    await bcrypt.compare(pin, DUMMY_HASH);
    await writeAudit({ action: "LOGIN_FAILED", ip });
    return { ok: false, reason: "invalid" };
  }

  if (lockedNow(client.lockedUntil)) {
    await writeAudit({ action: "LOGIN_FAILED", clientId: client.id, ip });
    return { ok: false, reason: "locked" };
  }

  const pinOk = await bcrypt.compare(pin, client.pinHash);
  if (!pinOk || client.status !== "ACTIVE") {
    const updated = await db.client.update({
      where: { id: client.id },
      data: { failedLogins: { increment: 1 } },
    });
    await writeAudit({ action: "LOGIN_FAILED", clientId: client.id, ip });
    if (updated.failedLogins >= MAX_FAILED_LOGINS) {
      await db.client.update({ where: { id: client.id }, data: { failedLogins: 0, lockedUntil: lockExpiry() } });
      return { ok: false, reason: "locked" };
    }
    return { ok: false, reason: "invalid" };
  }

  await db.client.update({ where: { id: client.id }, data: { failedLogins: 0, lockedUntil: null } });
  await writeAudit({ action: "LOGIN", clientId: client.id, ip });
  return {
    ok: true,
    identity: {
      id: client.id,
      role: "CLIENT",
      name: client.firstName,
      clientId: client.id,
      orgId: client.orgId,
    },
  };
}

// Staff, admins, case managers and nonprofit admins: email + password only
// (owner decision 2026-10-11: no 2-step codes).
export async function loginUser(emailInput: string, password: string, ip: string | null): Promise<LoginResult> {
  const user = await db.user.findUnique({ where: { email: emailInput.trim().toLowerCase() } });

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    await writeAudit({ action: "LOGIN_FAILED", ip });
    return { ok: false, reason: "invalid" };
  }

  if (lockedNow(user.lockedUntil)) {
    await writeAudit({ action: "LOGIN_FAILED", userId: user.id, ip });
    return { ok: false, reason: "locked" };
  }

  const fail = async (): Promise<LoginResult> => {
    const updated = await db.user.update({ where: { id: user.id }, data: { failedLogins: { increment: 1 } } });
    await writeAudit({ action: "LOGIN_FAILED", userId: user.id, ip });
    if (updated.failedLogins >= MAX_FAILED_LOGINS) {
      await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: lockExpiry() } });
      return { ok: false, reason: "locked" };
    }
    return { ok: false, reason: "invalid" };
  };

  if (!(await bcrypt.compare(password, user.passwordHash))) return fail();

  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  await writeAudit({ action: "LOGIN", userId: user.id, ip });
  return {
    ok: true,
    identity: {
      id: user.id,
      role: user.role,
      name: user.name ?? user.email,
      orgId: user.orgId,
      mustChangePassword: user.mustChangePassword,
    },
  };
}
