import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generate } from "otplib";
import { db } from "@/lib/db";
import { loginClient, loginUser } from "@/lib/login";
import { cleanup, createFixtures, PASSWORD, PIN_A, type Fixtures } from "./fixtures";

let f: Fixtures;
beforeAll(async () => {
  f = await createFixtures();
});
afterAll(async () => {
  await cleanup(f);
  await db.$disconnect();
});

describe("client PIN login", () => {
  it("accepts the right mailbox number and PIN (any letter case) and logs it", async () => {
    const result = await loginClient(f.clientA.pmbNumber.toLowerCase(), PIN_A, "1.2.3.4");
    expect(result).toMatchObject({ ok: true, identity: { role: "CLIENT", clientId: f.clientA.id } });
    expect(await db.auditLog.count({ where: { action: "LOGIN", clientId: f.clientA.id } })).toBe(1);
  });

  it("rejects an unknown mailbox number", async () => {
    expect(await loginClient("NOPE-0000", PIN_A, null)).toEqual({ ok: false, reason: "invalid" });
  });

  it("locks after 5 wrong PINs, even if the right PIN comes next", async () => {
    for (let i = 0; i < 4; i++) {
      expect(await loginClient(f.clientB.pmbNumber, "000000", null)).toEqual({ ok: false, reason: "invalid" });
    }
    expect(await loginClient(f.clientB.pmbNumber, "000000", null)).toEqual({ ok: false, reason: "locked" });
    expect(await loginClient(f.clientB.pmbNumber, PIN_A, null)).toEqual({ ok: false, reason: "locked" });

    const client = await db.client.findUniqueOrThrow({ where: { id: f.clientB.id } });
    const minutes = (client.lockedUntil!.getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(14);
    expect(minutes).toBeLessThanOrEqual(15);
    expect(await db.auditLog.count({ where: { action: "LOGIN_FAILED", clientId: f.clientB.id } })).toBe(6);
  });

  it("a lock expires after 15 minutes", async () => {
    await db.client.update({ where: { id: f.clientB.id }, data: { lockedUntil: new Date(Date.now() - 1000) } });
    expect(await loginClient(f.clientB.pmbNumber, PIN_A, null)).toMatchObject({ ok: true });
  });
});

describe("staff and case manager login", () => {
  it("case managers log in with email and password", async () => {
    const result = await loginUser(f.caseManager.email, PASSWORD, undefined, null);
    expect(result).toMatchObject({ ok: true, identity: { role: "CASE_MANAGER", needs2faSetup: false } });
  });

  it("staff must also give a 2-step code", async () => {
    expect(await loginUser(f.staff.email, PASSWORD, undefined, null)).toEqual({ ok: false, reason: "code_required" });
    expect(await loginUser(f.staff.email, PASSWORD, "000000", null)).toEqual({ ok: false, reason: "invalid" });
    const code = await generate({ secret: f.staffSecret });
    expect(await loginUser(f.staff.email, PASSWORD, code, null)).toMatchObject({ ok: true, identity: { role: "STAFF" } });
  });

  it("a wrong password never reveals whether a code is needed", async () => {
    expect(await loginUser(f.staff.email, "wrong", undefined, null)).toEqual({ ok: false, reason: "invalid" });
  });

  it("new staff without 2-step codes are flagged to set them up", async () => {
    const result = await loginUser(f.staffNo2fa.email, PASSWORD, undefined, null);
    expect(result).toMatchObject({ ok: true, identity: { needs2faSetup: true } });
  });

  it("locks after 5 wrong passwords", async () => {
    for (let i = 0; i < 4; i++) await loginUser(f.orgAdmin.email, "wrong", undefined, null);
    expect(await loginUser(f.orgAdmin.email, "wrong", undefined, null)).toEqual({ ok: false, reason: "locked" });
    expect(await loginUser(f.orgAdmin.email, PASSWORD, undefined, null)).toEqual({ ok: false, reason: "locked" });
  });
});
