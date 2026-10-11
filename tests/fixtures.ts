import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { generateSecret } from "otplib";
import { db } from "@/lib/db";
import { deleteMailImage } from "@/lib/storage";

// Throwaway test records with a unique tag, removed again by cleanup().

export function assertTestDatabase() {
  if (process.env.NEON_BRANCH === "production" || process.env.NODE_ENV === "production") {
    throw new Error("Tests must not run against the production database. Run `neon checkout dev` first.");
  }
}

export const PASSWORD = "fixture-password-1";
export const PIN_A = "123456";

export async function createFixtures() {
  assertTestDatabase();
  const tag = randomBytes(3).toString("hex").toUpperCase();
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  const pinHash = await bcrypt.hash(PIN_A, 4);

  const org = await db.organization.create({ data: { name: `Vitest Org ${tag}` } });
  const otherOrg = await db.organization.create({ data: { name: `Vitest Other Org ${tag}` } });

  const mkClient = (suffix: string, orgId = org.id) =>
    db.client.create({
      data: {
        pmbNumber: `VT${tag}${suffix}`,
        firstName: `Test${suffix}`,
        lastName: tag,
        pinHash,
        orgId,
        form1583OnFile: true,
        phone: `+1510555${tag.slice(0, 2).replace(/\D/g, "0")}0${suffix.charCodeAt(0) % 10}`,
      },
    });
  const clientA = await mkClient("A");
  const clientB = await mkClient("B");
  const clientC = await mkClient("C", otherOrg.id);

  const mkUser = (name: string, role: "ADMIN" | "STAFF" | "CASE_MANAGER" | "ORG_ADMIN", extra = {}) =>
    db.user.create({
      data: { email: `${name}-${tag.toLowerCase()}@vitest.example`, name, passwordHash, role, ...extra },
    });
  const staffSecret = generateSecret();
  const staff = await mkUser("staff", "STAFF", { twoFactorSecret: staffSecret });
  const staffNo2fa = await mkUser("staffnew", "STAFF");
  const caseManager = await mkUser("casemanager", "CASE_MANAGER", { orgId: org.id });
  const orgAdmin = await mkUser("orgadmin", "ORG_ADMIN", { orgId: org.id });

  // Case manager: approved for A, revoked for B, nothing for C.
  await db.delegate.create({ data: { clientId: clientA.id, userId: caseManager.id } });
  await db.delegate.create({ data: { clientId: clientB.id, userId: caseManager.id, revokedAt: new Date() } });

  const mkItem = (clientId: string) =>
    db.mailItem.create({ data: { clientId, retainUntil: new Date(Date.now() + 365 * 86400000) } });
  const itemA = await mkItem(clientA.id);
  const itemB = await mkItem(clientB.id);
  const itemC = await mkItem(clientC.id);

  return {
    tag,
    org,
    otherOrg,
    clientA,
    clientB,
    clientC,
    staff,
    staffSecret,
    staffNo2fa,
    caseManager,
    orgAdmin,
    itemA,
    itemB,
    itemC,
  };
}

export type Fixtures = Awaited<ReturnType<typeof createFixtures>>;

export async function cleanup(f: Fixtures | undefined) {
  if (!f) return;
  // Includes clients a test created itself in the fixture orgs.
  const clientIds = (
    await db.client.findMany({ where: { orgId: { in: [f.org.id, f.otherOrg.id] } }, select: { id: true } })
  ).map((c) => c.id);
  const userIds = [f.staff.id, f.staffNo2fa.id, f.caseManager.id, f.orgAdmin.id];
  await db.auditLog.deleteMany({ where: { OR: [{ clientId: { in: clientIds } }, { userId: { in: userIds } }] } });
  const images = await db.mailImage.findMany({ where: { mailItem: { clientId: { in: clientIds } } } });
  for (const img of images) await deleteMailImage(img.r2Key).catch(() => {});
  await db.mailImage.deleteMany({ where: { id: { in: images.map((i) => i.id) } } });
  await db.request.deleteMany({ where: { mailItem: { clientId: { in: clientIds } } } });
  await db.mailItem.deleteMany({ where: { clientId: { in: clientIds } } });
  await db.delegate.deleteMany({ where: { clientId: { in: clientIds } } });
  await db.client.deleteMany({ where: { id: { in: clientIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.organization.deleteMany({ where: { id: { in: [f.org.id, f.otherOrg.id] } } });
}
