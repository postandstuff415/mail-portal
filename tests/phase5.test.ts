import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { decodeBackup, encodeBackup, restoreDatabase, type Backup } from "@/lib/backup";
import { generateInvoice } from "@/lib/billing";
import { nextCrdCertification } from "@/lib/dashboard";
import { db } from "@/lib/db";
import { emailInvoice, invoiceEmail } from "@/lib/invoice-email";
import { canViewReports, monthStart, orgMonthReport, reportCsv } from "@/lib/reports";
import { cleanup, createFixtures, type Fixtures } from "./fixtures";

const pt = (s: string) => new Date(`${s}-07:00`);

let f: Fixtures;
beforeAll(async () => {
  f = await createFixtures();
  // Client A (fixture org) enrolled in June 2026; mail and a pickup in July.
  await db.client.update({ where: { id: f.clientA.id }, data: { enrolledAt: pt("2026-06-10T12:00:00"), firstName: "<b>Al</b>" } });
  await db.client.update({ where: { id: f.clientB.id }, data: { enrolledAt: pt("2026-07-02T12:00:00") } });
  await db.client.update({ where: { id: f.clientC.id }, data: { enrolledAt: pt("2026-06-01T12:00:00") } });
  const retainUntil = pt("2026-12-31T12:00:00");
  const m1 = await db.mailItem.create({
    data: { clientId: f.clientA.id, receivedAt: pt("2026-07-01T09:00:00"), urgent: true, retainUntil },
  });
  await db.mailItem.create({ data: { clientId: f.clientB.id, receivedAt: pt("2026-07-31T23:30:00"), retainUntil } });
  await db.mailItem.create({ data: { clientId: f.clientB.id, receivedAt: pt("2026-08-01T00:30:00"), retainUntil } });
  await db.pickup.create({ data: { mailItemId: m1.id, verifiedById: f.staff.id, method: "ID", pickedUpAt: pt("2026-07-04T09:00:00") } });
  // Other org's mail must never show up in this org's report.
  await db.mailItem.create({ data: { clientId: f.clientC.id, receivedAt: pt("2026-07-15T12:00:00"), retainUntil } });
  await db.organization.update({ where: { id: f.org.id }, data: { contactEmail: "billing@vitest.example" } });
});
afterAll(async () => {
  await db.invoice.deleteMany({ where: { orgId: { in: [f.org.id, f.otherOrg.id] } } });
  await cleanup(f);
  await db.$disconnect();
});

describe("grant reports", () => {
  it("counts one nonprofit's month in Oakland time", async () => {
    const r = await orgMonthReport(f.org.id, "2026-07");
    expect(r).toMatchObject({
      activeClients: 2,
      newEnrollments: 1,
      piecesReceived: 2, // 11:30 pm Jul 31 counts in July; 12:30 am Aug 1 does not
      urgentReceived: 1,
      pickups: 1,
      avgDaysToPickup: 3,
    });
  });

  it("months start at midnight Pacific", () => {
    expect(monthStart("2026-07").toISOString()).toBe("2026-07-01T07:00:00.000Z");
    expect(monthStart("2026-12").toISOString()).toBe("2026-12-01T08:00:00.000Z");
  });

  it("only staff and that nonprofit's admins can see its report", () => {
    expect(canViewReports({ id: "s", role: "STAFF" }, f.org.id)).toBe(true);
    expect(canViewReports({ id: "o", role: "ORG_ADMIN", orgId: f.org.id }, f.org.id)).toBe(true);
    expect(canViewReports({ id: "o", role: "ORG_ADMIN", orgId: f.otherOrg.id }, f.org.id)).toBe(false);
    expect(canViewReports({ id: "c", role: "CASE_MANAGER", orgId: f.org.id }, f.org.id)).toBe(false);
  });

  it("the spreadsheet can't smuggle in formulas", () => {
    const csv = reportCsv("=HYPERLINK(\"x\")", [
      { month: "2026-07", activeClients: 1, newEnrollments: 0, piecesReceived: 0, urgentReceived: 0, pickups: 0, avgDaysToPickup: null, requests: 0 },
    ]);
    expect(csv.split("\n")[1].startsWith(`"'=HYPERLINK(""x"")"`)).toBe(true);
  });
});

describe("USPS quarterly certification reminder", () => {
  it("finds the next Jan/Apr/Jul/Oct 15 in Oakland time", () => {
    expect(nextCrdCertification(new Date("2026-10-12T18:00:00Z")).daysLeft).toBe(3);
    // 11 pm Oct 15 in Oakland is Oct 16 in UTC: still due today.
    expect(nextCrdCertification(new Date("2026-10-16T06:00:00Z")).daysLeft).toBe(0);
    const next = nextCrdCertification(new Date("2026-12-20T18:00:00Z"));
    expect(next.date.toISOString().slice(0, 10)).toBe("2027-01-15");
  });
});

describe("invoice emails", () => {
  it("puts the invoice in the email, with names made safe for HTML", async () => {
    const inv = await generateInvoice(f.org.id, "2026-07", pt("2026-08-01T08:00:00"));
    const full = await db.invoice.findUniqueOrThrow({ where: { id: inv!.id }, include: { org: true, lines: true } });
    const email = invoiceEmail(full);
    expect(email.to).toBe("billing@vitest.example");
    expect(email.subject).toContain("July 2026");
    expect(email.html).toContain("&lt;b&gt;Al&lt;/b&gt;");
    expect(email.html).not.toContain("<b>Al</b>");
    expect(email.text).toContain("Total $30.00");
  });

  it("a dry run leaves the invoice as a draft; a real send marks it sent", async () => {
    const inv = await db.invoice.findFirstOrThrow({ where: { orgId: f.org.id, month: "2026-07" } });
    await emailInvoice({ id: f.staff.id, role: "STAFF" }, inv.id, async () => false);
    expect((await db.invoice.findUniqueOrThrow({ where: { id: inv.id } })).status).toBe("DRAFT");
    const sent: string[] = [];
    await emailInvoice({ id: f.staff.id, role: "STAFF" }, inv.id, async (e) => {
      sent.push(e.to);
      return true;
    });
    expect(sent).toEqual(["billing@vitest.example"]);
    expect((await db.invoice.findUniqueOrThrow({ where: { id: inv.id } })).status).toBe("SENT");
  });

  it("only staff email invoices; a nonprofit with no billing email is reported", async () => {
    const inv = await db.invoice.findFirstOrThrow({ where: { orgId: f.org.id, month: "2026-07" } });
    await expect(emailInvoice({ id: f.caseManager.id, role: "CASE_MANAGER" }, inv.id, async () => true)).rejects.toThrow("Staff only");
    const other = await generateInvoice(f.otherOrg.id, "2026-07", pt("2026-08-01T08:00:00"));
    await expect(emailInvoice(null, other!.id, async () => true)).rejects.toThrow("no billing email");
  });
});

describe("backups", () => {
  it("round-trips data, keeping exact money amounts and dates", () => {
    const backup: Backup = {
      createdAt: "2026-10-12T00:00:00.000Z",
      branch: "dev",
      tables: { organization: [{ id: "o1", monthlyRate: new Prisma.Decimal("15.00"), createdAt: new Date("2026-01-02T03:04:05Z") }] } as unknown as Backup["tables"],
    };
    const back = decodeBackup(encodeBackup(backup));
    expect(back.tables.organization[0]).toEqual({ id: "o1", monthlyRate: "15", createdAt: "2026-01-02T03:04:05.000Z" });
  });

  it("refuses to restore over a database that has data", async () => {
    const backup = { createdAt: "", branch: null, tables: {} } as unknown as Backup;
    await expect(restoreDatabase(db, backup)).rejects.toThrow("Refusing to restore");
  });
});
