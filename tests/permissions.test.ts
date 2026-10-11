import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { canViewClient, getMailItemForViewer, viewableClientIds, type Viewer } from "@/lib/permissions";
import { cleanup, createFixtures, type Fixtures } from "./fixtures";

let f: Fixtures;
beforeAll(async () => {
  f = await createFixtures();
});
afterAll(async () => {
  await cleanup(f);
  await db.$disconnect();
});

const asClient = (clientId: string): Viewer => ({ id: clientId, role: "CLIENT", clientId });

describe("who can see whose mail", () => {
  it("a client sees their own mail", async () => {
    expect(await canViewClient(asClient(f.clientA.id), f.clientA.id)).toBe(true);
    expect(await getMailItemForViewer(asClient(f.clientA.id), f.itemA.id)).not.toBeNull();
  });

  it("a client cannot open another client's mail by changing the ID", async () => {
    expect(await canViewClient(asClient(f.clientA.id), f.clientB.id)).toBe(false);
    expect(await getMailItemForViewer(asClient(f.clientA.id), f.itemB.id)).toBeNull();
    expect(await getMailItemForViewer(asClient(f.clientA.id), f.itemC.id)).toBeNull();
  });

  it("a made-up mail ID looks the same as a forbidden one", async () => {
    expect(await getMailItemForViewer(asClient(f.clientA.id), "does-not-exist")).toBeNull();
  });

  it("a case manager sees only approved, non-revoked clients", async () => {
    const cm: Viewer = { id: f.caseManager.id, role: "CASE_MANAGER", orgId: f.org.id };
    expect(await canViewClient(cm, f.clientA.id)).toBe(true);
    expect(await canViewClient(cm, f.clientB.id)).toBe(false); // revoked
    expect(await canViewClient(cm, f.clientC.id)).toBe(false); // never approved
    expect(await viewableClientIds(cm)).toEqual([f.clientA.id]);
  });

  it("a nonprofit admin never sees mail", async () => {
    const admin: Viewer = { id: f.orgAdmin.id, role: "ORG_ADMIN", orgId: f.org.id };
    expect(await canViewClient(admin, f.clientA.id)).toBe(false);
    expect(await getMailItemForViewer(admin, f.itemA.id)).toBeNull();
  });

  it("staff see all mail, but only after 2-step setup", async () => {
    const staff: Viewer = { id: f.staff.id, role: "STAFF" };
    const newStaff: Viewer = { id: f.staffNo2fa.id, role: "STAFF", needs2faSetup: true };
    expect(await canViewClient(staff, f.clientC.id)).toBe(true);
    expect(await canViewClient(newStaff, f.clientC.id)).toBe(false);
  });

  it("nobody logged in sees nothing", async () => {
    expect(await canViewClient(null, f.clientA.id)).toBe(false);
    expect(await getMailItemForViewer(null, f.itemA.id)).toBeNull();
  });

  it("views are written to the audit log; denied attempts are not shown as views", async () => {
    const before = await db.auditLog.count({ where: { action: "VIEW", mailItemId: f.itemB.id } });
    await getMailItemForViewer(asClient(f.clientA.id), f.itemB.id); // denied
    await getMailItemForViewer(asClient(f.clientB.id), f.itemB.id); // allowed
    const after = await db.auditLog.count({ where: { action: "VIEW", mailItemId: f.itemB.id } });
    expect(after - before).toBe(1);
  });
});
