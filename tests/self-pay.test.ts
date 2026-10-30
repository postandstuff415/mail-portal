import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateInvoice } from "@/lib/billing";
import { db } from "@/lib/db";
import type { Email } from "@/lib/email";
import type { Viewer } from "@/lib/permissions";
import {
  billNow,
  generateClientInvoice,
  markClientInvoicePaid,
  runSelfPayBilling,
  sendClientInvoice,
  setClientBilling,
} from "@/lib/self-pay";
import { convertApplication, createApplication } from "@/lib/signup";
import { cleanup, createFixtures, type Fixtures } from "./fixtures";

// Self-pay clients: sign-up without a nonprofit or case manager, activation
// with a price, monthly bills by email/text, 3-month minimum then monthly.
let f: Fixtures;
let staff: Viewer;
const ip = `10.250.${Math.floor(Math.random() * 200)}`;
const selfPayClientIds: string[] = [];
const emails: Email[] = [];
const texts: { to: string; body: string }[] = [];
const senders = {
  email: async (e: Email) => {
    emails.push(e);
    return true;
  },
  sms: async (to: string, body: string) => {
    texts.push({ to, body });
  },
};

beforeAll(async () => {
  f = await createFixtures();
  staff = { id: f.staff.id, role: "STAFF" };
});
afterAll(async () => {
  const ids = [...selfPayClientIds, f.clientA.id];
  await db.clientInvoice.deleteMany({ where: { clientId: { in: ids } } });
  await db.application.deleteMany({ where: { ip: { startsWith: ip } } });
  await db.auditLog.deleteMany({ where: { clientId: { in: selfPayClientIds } } });
  await db.client.deleteMany({ where: { id: { in: selfPayClientIds } } });
  // clientA may have been switched to self-pay; put it back so cleanup finds it.
  await db.client.update({ where: { id: f.clientA.id }, data: { orgId: f.org.id, billingType: "NONPROFIT" } });
  await cleanup(f);
  await db.$disconnect();
});

const base = () => ({
  firstName: "Sam",
  lastName: `Selfpay${f.tag}`,
  dateOfBirth: "1975-03-02",
  phone: "(510) 555-0199",
  email: `sam-${f.tag.toLowerCase()}@vitest.example`,
  orgId: "",
  orgOther: "",
  caseManagerName: "",
  caseManagerEmail: "",
  delegateConsent: false,
  smsConsent: false,
  selfPay: true,
  billSmsConsent: true,
  agreed: true as const,
  signatureName: `Sam Selfpay${f.tag}`,
});

describe("self-pay sign-up", () => {
  it("needs no nonprofit and no case manager", async () => {
    const app = await createApplication(base(), { ip: `${ip}.1`, userAgent: null });
    expect(app).toMatchObject({ selfPay: true, billSmsConsent: true, orgId: null, caseManagerEmail: null });
  });

  it("a nonprofit client may also skip the case manager", async () => {
    const app = await createApplication(
      { ...base(), selfPay: false, billSmsConsent: false, orgId: f.org.id },
      { ip: `${ip}.2`, userAgent: null },
    );
    expect(app).toMatchObject({ selfPay: false, orgId: f.org.id, caseManagerName: null });
  });

  it("self-pay needs a way to send the bill: email, or phone + bill-text OK", async () => {
    await expect(
      createApplication({ ...base(), email: "", billSmsConsent: false }, { ip: null, userAgent: null }),
    ).rejects.toThrow("monthly bill");
  });

  it("case manager access needs the case manager's email", async () => {
    await expect(
      createApplication({ ...base(), delegateConsent: true, caseManagerName: "Pat" }, { ip: null, userAgent: null }),
    ).rejects.toThrow("case manager's email");
  });
});

describe("self-pay activation and bills", () => {
  it("staff activate a self-pay sign-up: no nonprofit, price set, PIN made, first bill emailed and texted", async () => {
    const app = await createApplication(base(), { ip: `${ip}.3`, userAgent: null });
    const { client, pin } = await convertApplication(staff, app.id, {
      pmbNumber: `VS${f.tag}1`,
      billingType: "SELF_PAY",
      monthlyPrice: "15",
      form1583OnFile: true,
    });
    selfPayClientIds.push(client.id);
    expect(pin).toMatch(/^\d{6}$/);
    const saved = await db.client.findUniqueOrThrow({ where: { id: client.id } });
    expect(saved).toMatchObject({ orgId: null, billingType: "SELF_PAY", email: base().email });
    expect(saved.monthlyPrice?.toFixed(2)).toBe("15.00");
    expect(saved.billSmsConsentAt?.getTime()).toBe(app.signedAt.getTime());

    const r = await billNow(client.id, new Date(), senders);
    expect(r).toEqual({ emailed: true, texted: true });
    expect(emails.at(-1)?.to).toBe(base().email);
    expect(texts.at(-1)?.body).toContain("$15.00");
    // Running again sends nothing new.
    expect(await billNow(client.id, new Date(), senders)).toBeNull();
    const bills = await db.clientInvoice.findMany({ where: { clientId: client.id } });
    expect(bills).toHaveLength(1);
    expect(bills[0].status).toBe("SENT");
  });

  it("3-month minimum, then month to month; never twice for one month", async () => {
    const enrolledAt = new Date("2026-01-15T20:00:00Z");
    const c = await db.client.create({
      data: {
        pmbNumber: `VS${f.tag}2`,
        firstName: "Min",
        lastName: f.tag,
        pinHash: "x",
        billingType: "SELF_PAY",
        monthlyPrice: "20.00",
        email: "min@vitest.example",
        enrolledAt,
        endedAt: new Date("2026-01-20T20:00:00Z"),
        status: "CLOSED",
      },
    });
    selfPayClientIds.push(c.id);
    // Left after 5 days: still billed Jan, Feb, Mar (minimum), not April.
    for (const m of ["2026-01", "2026-02", "2026-03"]) expect(await generateClientInvoice(c.id, m)).not.toBeNull();
    expect(await generateClientInvoice(c.id, "2026-04")).toBeNull();
    const again = await generateClientInvoice(c.id, "2026-02");
    expect(await db.clientInvoice.count({ where: { clientId: c.id } })).toBe(3);
    expect(again?.amount.toFixed(2)).toBe("20.00");
  });

  it("the monthly run bills every self-pay client once and skips nonprofit clients", async () => {
    const now = new Date("2026-12-01T16:00:00Z");
    const first = await runSelfPayBilling(now, senders);
    const second = await runSelfPayBilling(now, senders);
    expect(second.sent).toBe(0);
    expect(first.month).toBe("2026-12");
    expect(await db.clientInvoice.count({ where: { clientId: f.clientB.id } })).toBe(0);
  });

  it("nonprofit invoices never include self-pay clients", async () => {
    const inv = await generateInvoice(f.org.id, "2026-12");
    const lines = inv ? await db.invoiceLine.findMany({ where: { invoiceId: inv.id } }) : [];
    expect(lines.some((l) => selfPayClientIds.includes(l.clientId))).toBe(false);
    if (inv) await db.invoice.delete({ where: { id: inv.id } });
  });

  it("staff can switch an existing client to self-pay, bill, and mark paid; non-staff cannot", async () => {
    await expect(
      setClientBilling({ id: f.caseManager.id, role: "CASE_MANAGER" }, f.clientA.id, {
        billingType: "SELF_PAY",
        monthlyPrice: "15",
        billSmsConsent: false,
      }),
    ).rejects.toThrow("Staff only");
    const c = await setClientBilling(staff, f.clientA.id, {
      billingType: "SELF_PAY",
      monthlyPrice: "$15",
      email: "a@vitest.example",
      billSmsConsent: false,
    });
    expect(c).toMatchObject({ orgId: null, billingType: "SELF_PAY" });
    const bill = await generateClientInvoice(f.clientA.id, "2026-12", new Date("2026-12-01T16:00:00Z"));
    expect(bill).not.toBeNull();
    const r = await sendClientInvoice(staff, bill!.id, senders);
    expect(r).toEqual({ emailed: true, texted: false });
    await markClientInvoicePaid(staff, bill!.id);
    expect((await db.clientInvoice.findUniqueOrThrow({ where: { id: bill!.id } })).status).toBe("PAID");
    await expect(sendClientInvoice(staff, bill!.id, senders)).rejects.toThrow("already paid");
  });
});
