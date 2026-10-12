import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createClient, detectImageType, intakeQrUrl, IntakeError, normalizePhone, receiveMail } from "@/lib/intake";
import { loginClient } from "@/lib/login";
import type { Viewer } from "@/lib/permissions";
import { signedImageUrl } from "@/lib/storage";
import { cleanup, createFixtures, type Fixtures } from "./fixtures";

let f: Fixtures;
let staff: Viewer;
beforeAll(async () => {
  f = await createFixtures();
  staff = { id: f.staff.id, role: "STAFF" };
});
afterAll(async () => {
  await cleanup(f);
  await db.$disconnect();
});

// A real (tiny) 1x1 JPEG.
const JPEG = Uint8Array.from(
  Buffer.from(
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
    "base64",
  ),
);

describe("new client intake", () => {
  it("creates a client with a working 6-digit PIN", async () => {
    const { client, pin } = await createClient(staff, {
      pmbNumber: `vt${f.tag}new`,
      firstName: "New",
      lastName: "Person",
      orgId: f.org.id,
      phone: "(510) 555-0199",
      form1583OnFile: true,
      smsConsent: true,
    });
    expect(pin).toMatch(/^\d{6}$/);
    expect(client.smsConsentAt).toBeInstanceOf(Date);
    expect(client.pmbNumber).toBe(`VT${f.tag}NEW`);
    expect(client.phone).toBe("+15105550199");
    expect(await loginClient(client.pmbNumber, pin, null)).toMatchObject({ ok: true });
  });

  it("refuses a mailbox number that's already taken", async () => {
    await expect(
      createClient(staff, {
        pmbNumber: f.clientA.pmbNumber,
        firstName: "Dup",
        lastName: "Licate",
        orgId: f.org.id,
        form1583OnFile: true,
      }),
    ).rejects.toThrow(IntakeError);
  });

  it("text alerts need a phone number, and are off unless the client agreed", async () => {
    await expect(
      createClient(staff, {
        pmbNumber: `VT${f.tag}NOPH`,
        firstName: "No",
        lastName: "Phone",
        orgId: f.org.id,
        form1583OnFile: true,
        smsConsent: true,
      }),
    ).rejects.toThrow("phone number");
    const { client } = await createClient(staff, {
      pmbNumber: `VT${f.tag}NOSMS`,
      firstName: "No",
      lastName: "Texts",
      orgId: f.org.id,
      phone: "510-555-0177",
      form1583OnFile: true,
    });
    expect(client.smsConsentAt).toBeNull();
  });

  it("only staff can add clients", async () => {
    const cm: Viewer = { id: f.caseManager.id, role: "CASE_MANAGER" };
    await expect(
      createClient(cm, { pmbNumber: "X1", firstName: "a", lastName: "b", orgId: f.org.id, form1583OnFile: true }),
    ).rejects.toThrow("Staff only");
  });

  it("phone numbers must be US numbers", () => {
    expect(normalizePhone("510.555.0100")).toBe("+15105550100");
    expect(() => normalizePhone("12345")).toThrow(IntakeError);
  });

  it("the card QR opens the login page with the mailbox number filled in", () => {
    expect(intakeQrUrl("T101")).toMatch(/\/login\?pmb=T101$/);
  });
});

describe("receiving mail", () => {
  it("stores the envelope photo privately and records it", async () => {
    const { item } = await receiveMail(
      staff,
      { pmbNumber: f.clientA.pmbNumber, image: JPEG, type: "LETTER", urgent: true, shelfLocation: "B2" },
      "9.9.9.9",
    );
    const saved = await db.mailItem.findUniqueOrThrow({ where: { id: item.id }, include: { images: true } });
    expect(saved).toMatchObject({ urgent: true, shelfLocation: "B2", status: "RECEIVED" });
    expect(saved.images).toHaveLength(1);
    expect(saved.images[0].r2Key).toMatch(new RegExp(`^mail/${f.clientA.id}/`));

    // Hold date = received + 90 days.
    expect(saved.retainUntil.getTime() - saved.receivedAt.getTime()).toBe(90 * 24 * 60 * 60 * 1000);

    // The photo can be fetched with a signed link, and NOT without one.
    const signed = await signedImageUrl(saved.images[0].r2Key);
    expect((await fetch(signed)).status).toBe(200);
    const unsigned = signed.split("?")[0];
    expect((await fetch(unsigned)).status).toBeGreaterThanOrEqual(400);

    expect(await db.auditLog.count({ where: { action: "UPLOAD", mailItemId: item.id } })).toBe(1);
  });

  it("rejects files that aren't photos", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.7 not an image");
    await expect(
      receiveMail(staff, { pmbNumber: f.clientA.pmbNumber, image: pdf, type: "LETTER", urgent: false }),
    ).rejects.toThrow("isn't a photo");
    expect(detectImageType(JPEG)?.contentType).toBe("image/jpeg");
  });

  it("refuses mail for a client with no PS Form 1583 on file", async () => {
    await db.client.update({ where: { id: f.clientC.id }, data: { form1583OnFile: false } });
    await expect(
      receiveMail(staff, { pmbNumber: f.clientC.pmbNumber, image: JPEG, type: "LETTER", urgent: false }),
    ).rejects.toThrow("1583");
  });

  it("only staff can receive mail", async () => {
    const client: Viewer = { id: f.clientA.id, role: "CLIENT", clientId: f.clientA.id };
    await expect(
      receiveMail(client, { pmbNumber: f.clientA.pmbNumber, image: JPEG, type: "LETTER", urgent: false }),
    ).rejects.toThrow("Staff only");
  });
});
