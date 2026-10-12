import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { addDelegate, revokeDelegate } from "@/lib/delegates";
import { addContentsPage } from "@/lib/intake";
import { loginUser } from "@/lib/login";
import { canViewClient, getMailItemForViewer, type Viewer } from "@/lib/permissions";
import { closeOut, createRequest, markPickedUp } from "@/lib/requests";
import { newMailCounts, unseenIds } from "@/lib/unread";
import { sessionStillValid } from "@/lib/session-check";
import { changeOwnPassword, createUser, removeAccess, resetUserPassword } from "@/lib/users";
import { cleanup, createFixtures, PASSWORD, type Fixtures } from "./fixtures";

let f: Fixtures;
let staff: Viewer;
let admin: Viewer;
let clientA: Viewer;
let cm: Viewer;
beforeAll(async () => {
  f = await createFixtures();
  staff = { id: f.staff.id, role: "STAFF" };
  admin = { id: f.admin.id, role: "ADMIN" };
  clientA = { id: f.clientA.id, role: "CLIENT", clientId: f.clientA.id };
  cm = { id: f.caseManager.id, role: "CASE_MANAGER", orgId: f.org.id };
});
afterAll(async () => {
  // Users made by these tests go too (their login rows first).
  const made = { email: { endsWith: `-${f.tag.toLowerCase()}@vitest-new.example` } };
  await db.auditLog.deleteMany({ where: { user: made } });
  await db.delegate.deleteMany({ where: { user: made } });
  await db.user.deleteMany({ where: made });
  await cleanup(f);
  await db.$disconnect();
});

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);

describe("client requests", () => {
  it("a client can ask to open and scan their own mail; status updates", async () => {
    const r = await createRequest(clientA, f.itemA.id, "OPEN_AND_SCAN");
    expect(r).toMatchObject({ type: "OPEN_AND_SCAN", status: "OPEN", requestedById: null });
    expect((await db.mailItem.findUniqueOrThrow({ where: { id: f.itemA.id } })).status).toBe("SCAN_REQUESTED");
  });

  it("asking twice doesn't make a second request", async () => {
    const again = await createRequest(clientA, f.itemA.id, "OPEN_AND_SCAN");
    expect(await db.request.count({ where: { mailItemId: f.itemA.id, type: "OPEN_AND_SCAN" } })).toBe(1);
    expect(again.status).toBe("OPEN");
  });

  it("a client cannot make requests on someone else's mail", async () => {
    await expect(createRequest(clientA, f.itemB.id, "DISCARD")).rejects.toThrow("Mail not found");
    expect(await db.request.count({ where: { mailItemId: f.itemB.id } })).toBe(0);
  });

  it("an approved case manager can ask for pickup; it's recorded as theirs", async () => {
    const r = await createRequest(cm, f.itemA.id, "PICKUP");
    expect(r.requestedById).toBe(f.caseManager.id);
    expect((await db.mailItem.findUniqueOrThrow({ where: { id: f.itemA.id } })).status).toBe("READY_FOR_PICKUP");
  });

  it("a nonprofit admin cannot make requests", async () => {
    const orgAdmin: Viewer = { id: f.orgAdmin.id, role: "ORG_ADMIN", orgId: f.org.id };
    await expect(createRequest(orgAdmin, f.itemA.id, "HOLD")).rejects.toThrow("Mail not found");
  });
});

describe("staff handling", () => {
  it("contents photos are added as pages, mark the mail opened, and close the scan request", async () => {
    expect(await addContentsPage(staff, f.itemA.id, JPEG)).toEqual({ page: 1 });
    expect(await addContentsPage(staff, f.itemA.id, JPEG)).toEqual({ page: 2 });
    expect((await db.mailItem.findUniqueOrThrow({ where: { id: f.itemA.id } })).status).toBe("OPENED");
    expect(await db.request.count({ where: { mailItemId: f.itemA.id, type: "OPEN_AND_SCAN", status: "OPEN" } })).toBe(0);
    await expect(addContentsPage(clientA, f.itemA.id, JPEG)).rejects.toThrow("Staff only");
  });

  it("pickup is logged with who checked ID; open requests close; no more requests allowed", async () => {
    await markPickedUp(staff, f.itemA.id, "ID");
    const pickup = await db.pickup.findFirstOrThrow({ where: { mailItemId: f.itemA.id } });
    expect(pickup).toMatchObject({ verifiedById: f.staff.id, method: "ID" });
    expect(await db.request.count({ where: { mailItemId: f.itemA.id, status: "OPEN" } })).toBe(0);
    await expect(createRequest(clientA, f.itemA.id, "HOLD")).rejects.toThrow("left the shop");
    await expect(markPickedUp(staff, f.itemA.id, "ID")).rejects.toThrow("Already closed");
  });

  it("only staff record pickups or shredding", async () => {
    await expect(markPickedUp(clientA, f.itemB.id, "ID")).rejects.toThrow("Staff only");
    await expect(closeOut(cm, f.itemB.id, "SHREDDED")).rejects.toThrow("Staff only");
    await closeOut(staff, f.itemC.id, "RETURNED");
    expect((await db.mailItem.findUniqueOrThrow({ where: { id: f.itemC.id } })).status).toBe("RETURNED");
  });
});

describe("new-mail markers", () => {
  it("mail is new until that person opens it, separately for client and case manager", async () => {
    const item = await db.mailItem.create({
      data: { clientId: f.clientA.id, urgent: true, retainUntil: new Date(Date.now() + 86400000 * 365) },
    });
    expect((await unseenIds(clientA, [item.id])).has(item.id)).toBe(true);
    expect((await newMailCounts(cm, [f.clientA.id])).get(f.clientA.id)).toEqual({ total: 1, urgent: 1 });

    await getMailItemForViewer(clientA, item.id); // client opens it
    expect((await unseenIds(clientA, [item.id])).has(item.id)).toBe(false);
    expect((await unseenIds(cm, [item.id])).has(item.id)).toBe(true); // still new for the case manager

    await getMailItemForViewer(cm, item.id);
    expect((await newMailCounts(cm, [f.clientA.id])).get(f.clientA.id)).toBeUndefined();
  });
});

describe("delegates", () => {
  it("staff add a case manager only with signed consent, and can remove them", async () => {
    await expect(addDelegate(staff, f.clientC.id, f.caseManager.id, false)).rejects.toThrow("sign the consent");
    await expect(addDelegate(cm, f.clientC.id, f.caseManager.id, true)).rejects.toThrow("Staff only");
    await expect(addDelegate(staff, f.clientC.id, f.orgAdmin.id, true)).rejects.toThrow("case manager");

    const d = await addDelegate(staff, f.clientC.id, f.caseManager.id, true);
    expect(await canViewClient(cm, f.clientC.id)).toBe(true);
    await revokeDelegate(staff, d.id);
    expect(await canViewClient(cm, f.clientC.id)).toBe(false);
  });

  it("re-approving a removed case manager restores access", async () => {
    // Client B's delegate was revoked in the fixtures.
    await addDelegate(staff, f.clientB.id, f.caseManager.id, true);
    expect(await canViewClient(cm, f.clientB.id)).toBe(true);
  });
});

describe("accounts and passwords", () => {
  const email = (name: string) => `${name}-${f.tag.toLowerCase()}@vitest-new.example`;

  it("staff add a case manager with a one-time password; they must change it before anything else", async () => {
    const { user, password } = await createUser(staff, { name: "New CM", email: email("cm"), role: "CASE_MANAGER" });
    expect(password).toMatch(/^[A-Za-z2-9]{7}-[A-Za-z2-9]{7}$/);
    expect(await loginUser(user.email, password, null)).toMatchObject({
      ok: true,
      identity: { role: "CASE_MANAGER", mustChangePassword: true },
    });
    await changeOwnPassword({ id: user.id, role: "CASE_MANAGER" }, password, "my-own-new-password");
    expect(await loginUser(user.email, "my-own-new-password", null)).toMatchObject({
      ok: true,
      identity: { mustChangePassword: false },
    });
  });

  it("only an admin can add staff accounts", async () => {
    await expect(createUser(staff, { name: "S", email: email("staff2"), role: "STAFF" })).rejects.toThrow("Only an admin");
    await expect(createUser(admin, { name: "S", email: email("staff3"), role: "STAFF" })).resolves.toBeTruthy();
  });

  it("nonprofit admins must belong to a nonprofit; emails are unique", async () => {
    await expect(createUser(staff, { name: "O", email: email("oa"), role: "ORG_ADMIN" })).rejects.toThrow("need a nonprofit");
    await expect(
      createUser(staff, { name: "Dup", email: f.caseManager.email.toUpperCase(), role: "CASE_MANAGER" }),
    ).rejects.toThrow("already has an account");
  });

  it("a reset gives a new working password and unlocks the account", async () => {
    await db.user.update({ where: { id: f.caseManager.id }, data: { lockedUntil: new Date(Date.now() + 600000) } });
    const { password } = await resetUserPassword(staff, f.caseManager.id);
    expect(await loginUser(f.caseManager.email, password, null)).toMatchObject({
      ok: true,
      identity: { mustChangePassword: true },
    });
    await expect(resetUserPassword(staff, f.admin.id)).rejects.toThrow("Only an admin");
  });

  it("removing someone's access cuts mail access and login at once; a reset gives it back", async () => {
    const { user } = await createUser(staff, { name: "Leaving CM", email: email("leaving"), role: "CASE_MANAGER" });
    await addDelegate(staff, f.clientA.id, user.id, true);
    const leaving: Viewer = { id: user.id, role: "CASE_MANAGER" };
    expect(await sessionStillValid(leaving)).toBe(true);
    expect(await canViewClient(leaving, f.clientA.id)).toBe(true);

    await removeAccess(staff, user.id);
    expect(await canViewClient(leaving, f.clientA.id)).toBe(false);
    expect(await sessionStillValid(leaving)).toBe(false); // an open session ends on the next page load
    expect(await loginUser(user.email, PASSWORD, null)).toEqual({ ok: false, reason: "locked" });
    await expect(removeAccess(staff, staff.id)).rejects.toThrow("your own");
    await expect(removeAccess(staff, f.admin.id)).rejects.toThrow("Only an admin");

    const { password } = await resetUserPassword(staff, user.id);
    expect(await loginUser(user.email, password, null)).toMatchObject({ ok: true });
  });

  it("a role change ends the old session", async () => {
    expect(await sessionStillValid({ id: f.caseManager.id, role: "STAFF" })).toBe(false);
  });

  it("people change their own password; the old one stops working", async () => {
    const me: Viewer = { id: f.orgAdmin.id, role: "ORG_ADMIN" };
    await expect(changeOwnPassword(me, "wrong", "a-brand-new-password")).rejects.toThrow("didn't match");
    await expect(changeOwnPassword(me, PASSWORD, "short")).rejects.toThrow("12 characters");
    await changeOwnPassword(me, PASSWORD, "a-brand-new-password");
    const user = await db.user.findUniqueOrThrow({ where: { id: f.orgAdmin.id } });
    expect(await bcrypt.compare("a-brand-new-password", user.passwordHash)).toBe(true);
    expect(await loginUser(f.orgAdmin.email, PASSWORD, null)).toEqual({ ok: false, reason: "invalid" });
    await expect(changeOwnPassword(clientA, "x", "y".repeat(12))).rejects.toThrow("Only email accounts");
  });
});
