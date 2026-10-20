import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CURRENT_AGREEMENT } from "@/lib/agreement";
import { db } from "@/lib/db";
import { loginClient } from "@/lib/login";
import { canViewClient, type Viewer } from "@/lib/permissions";
import type { Email } from "@/lib/email";
import { convertApplication, createApplication, rejectApplication } from "@/lib/signup";
import { notifyNewSignup } from "@/lib/signup-email";
import { cleanup, createFixtures, type Fixtures } from "./fixtures";

let f: Fixtures;
let staff: Viewer;
const ipBase = `10.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
beforeAll(async () => {
  f = await createFixtures();
  staff = { id: f.staff.id, role: "STAFF" };
});
afterAll(async () => {
  await db.application.deleteMany({ where: { ip: { startsWith: ipBase } } });
  await cleanup(f);
  await db.$disconnect();
});

const good = () => ({
  firstName: "Robin",
  lastName: "Signup",
  dateOfBirth: "1980-05-17",
  phone: "(510) 555-0123",
  email: "",
  orgId: f.org.id,
  caseManagerName: "Casey Manager",
  caseManagerEmail: f.caseManager.email.toUpperCase(),
  delegateConsent: true,
  smsConsent: true,
  agreed: true as const,
  signatureName: "robin  signup",
});

describe("online sign-up", () => {
  it("saves the signed agreement version, typed signature, and consents", async () => {
    const app = await createApplication(good(), { ip: `${ipBase}.1`, userAgent: "test" });
    expect(app).toMatchObject({
      status: "PENDING",
      agreementVersion: CURRENT_AGREEMENT.version,
      signatureName: "robin  signup",
      phone: "+15105550123",
      email: null,
      smsConsent: true,
      delegateConsent: true,
    });
  });

  it("email is optional, but the signature must match the name and the agreement box is required", async () => {
    await expect(createApplication({ ...good(), signatureName: "Someone Else" }, { ip: null, userAgent: null })).rejects.toThrow(
      "must match",
    );
    await expect(
      createApplication({ ...good(), agreed: false as unknown as true }, { ip: null, userAgent: null }),
    ).rejects.toThrow("agree");
  });

  it("text alerts need a phone; a nonprofit is required (from the list or typed)", async () => {
    await expect(createApplication({ ...good(), phone: "" }, { ip: null, userAgent: null })).rejects.toThrow("phone");
    await expect(
      createApplication({ ...good(), orgId: "", orgOther: "" }, { ip: null, userAgent: null }),
    ).rejects.toThrow("nonprofit");
    const typed = await createApplication(
      { ...good(), orgId: "", orgOther: "New Shelter Org" },
      { ip: `${ipBase}.2`, userAgent: null },
    );
    expect(typed).toMatchObject({ orgId: null, orgOther: "New Shelter Org" });
  });

  it("limits sign-ups from one connection to 5 an hour", async () => {
    const meta = { ip: `${ipBase}.9`, userAgent: null };
    for (let i = 0; i < 5; i++) await createApplication(good(), meta);
    await expect(createApplication(good(), meta)).rejects.toThrow("Too many");
  });

  it("on a 1583 day staff convert it: client with PIN, online text consent kept, case manager access granted", async () => {
    const app = await createApplication(good(), { ip: `${ipBase}.3`, userAgent: null });
    await expect(
      convertApplication(staff, app.id, { pmbNumber: `VT${f.tag}SU`, orgId: f.org.id, form1583OnFile: false }),
    ).rejects.toThrow("1583");

    const { client, pin, delegateAdded } = await convertApplication(staff, app.id, {
      pmbNumber: `VT${f.tag}SU`,
      orgId: f.org.id,
      form1583OnFile: true,
    });
    expect(client).toMatchObject({ firstName: "Robin", lastName: "Signup", form1583OnFile: true });
    expect(await loginClient(client.pmbNumber, pin, null)).toMatchObject({ ok: true });
    const saved = await db.client.findUniqueOrThrow({ where: { id: client.id } });
    expect(saved.smsConsentAt?.getTime()).toBe(app.signedAt.getTime());
    expect(delegateAdded).toBe(true);
    expect(await canViewClient({ id: f.caseManager.id, role: "CASE_MANAGER" }, client.id)).toBe(true);
    expect((await db.application.findUniqueOrThrow({ where: { id: app.id } })).status).toBe("CONVERTED");

    await expect(
      convertApplication(staff, app.id, { pmbNumber: `VT${f.tag}SU2`, orgId: f.org.id, form1583OnFile: true }),
    ).rejects.toThrow("already handled");
  });

  it("emails the owner about each new sign-up, without date of birth or phone", async () => {
    const app = await createApplication(good(), { ip: `${ipBase}.5`, userAgent: null });
    const sent: Email[] = [];
    await notifyNewSignup(app.id, async (e) => (sent.push(e), true));
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("postandstuff415@gmail.com");
    expect(sent[0].subject).toBe("New sign-up: Robin Signup");
    expect(sent[0].text).toContain(f.org.name);
    expect(sent[0].text).toContain("/staff/signups");
    for (const body of [sent[0].text, sent[0].html]) {
      expect(body).not.toContain("1980");
      expect(body).not.toContain("0123");
    }
  });

  it("only staff convert or remove sign-ups", async () => {
    const app = await createApplication(good(), { ip: `${ipBase}.4`, userAgent: null });
    const cm: Viewer = { id: f.caseManager.id, role: "CASE_MANAGER" };
    await expect(
      convertApplication(cm, app.id, { pmbNumber: "X", orgId: f.org.id, form1583OnFile: true }),
    ).rejects.toThrow("Staff only");
    await rejectApplication(staff, app.id);
    expect((await db.application.findUniqueOrThrow({ where: { id: app.id } })).status).toBe("REJECTED");
  });
});
