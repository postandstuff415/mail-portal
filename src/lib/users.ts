import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { isStaff, type Viewer } from "@/lib/permissions";

// Email-login accounts: case managers, nonprofit admins, staff, admins.
// New accounts and resets get a temporary password shown once to staff;
// the person changes it at /account/password.

export class UserError extends Error {}

export const MIN_PASSWORD = 12;
const ROUNDS = 12;

// Easy to read aloud: no 0/O/1/l/I.
export function temporaryPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(14);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${chars.slice(0, 7)}-${chars.slice(7)}`;
}

// Staff can manage case managers and nonprofit admins; only admins manage staff/admins.
function canManage(viewer: Viewer | null | undefined, role: UserRole) {
  if (!isStaff(viewer)) return false;
  if (role === "STAFF" || role === "ADMIN") return viewer!.role === "ADMIN";
  return true;
}

export const newUserSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    email: z.string().trim().toLowerCase().email("Check the email address").max(200),
    role: z.enum(["CASE_MANAGER", "ORG_ADMIN", "STAFF", "ADMIN"]),
    orgId: z.string().optional(),
  })
  .refine((d) => d.role !== "ORG_ADMIN" || !!d.orgId, { message: "Nonprofit admins need a nonprofit." });

export async function createUser(viewer: Viewer | null | undefined, input: z.input<typeof newUserSchema>) {
  const data = newUserSchema.parse(input);
  if (!canManage(viewer, data.role)) throw new UserError("Only an admin can add staff or admin accounts.");
  if (await db.user.findUnique({ where: { email: data.email }, select: { id: true } })) {
    throw new UserError("Someone already has an account with that email.");
  }
  const password = temporaryPassword();
  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      orgId: data.orgId || null,
      passwordHash: await bcrypt.hash(password, ROUNDS),
      mustChangePassword: true,
    },
  });
  return { user, password };
}

export async function resetUserPassword(viewer: Viewer | null | undefined, userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new UserError("Account not found.");
  if (!canManage(viewer, user.role)) throw new UserError("Only an admin can reset staff or admin passwords.");
  const password = temporaryPassword();
  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: await bcrypt.hash(password, ROUNDS),
      failedLogins: 0,
      lockedUntil: null,
      mustChangePassword: true,
    },
  });
  return { password };
}

export async function changeOwnPassword(viewer: Viewer | null | undefined, current: string, next: string) {
  if (!viewer || viewer.role === "CLIENT") throw new UserError("Only email accounts have passwords.");
  const user = await db.user.findUnique({ where: { id: viewer.id } });
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    throw new UserError("Your current password didn't match.");
  }
  if (next.length < MIN_PASSWORD) throw new UserError(`Use at least ${MIN_PASSWORD} characters.`);
  if (next === current) throw new UserError("Pick a password you haven't used here before.");
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, ROUNDS), mustChangePassword: false },
  });
}
