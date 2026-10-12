import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addMonths, billingFor, canViewInvoice, generateInvoice, monthKey } from "@/lib/billing";
import { db } from "@/lib/db";
import { cleanup, createFixtures, type Fixtures } from "./fixtures";

// Pacific-time dates, as the shop sees them.
const pt = (s: string) => new Date(`${s}T12:00:00-07:00`);

const billedMonths = (enrolledAt: Date, endedAt: Date | null, from: string, count: number) => {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const m = addMonths(from, i);
    if (billingFor({ enrolledAt, endedAt }, m).billed) out.push(m);
  }
  return out;
};

describe("90-day minimum, option A (the examples in the nonprofit agreement)", () => {
  it("enrolls Oct 1, leaves Oct 20: Oct, Nov, Dec ($45)", () => {
    expect(billedMonths(pt("2026-10-01"), pt("2026-10-20"), "2026-09", 8)).toEqual(["2026-10", "2026-11", "2026-12"]);
  });
  it("enrolls Oct 28, stays through Feb: Oct to Feb ($75)", () => {
    expect(billedMonths(pt("2026-10-28"), pt("2027-02-27"), "2026-09", 8)).toEqual([
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
  });
  it("enrolls Oct 15, leaves Nov 3: Oct, Nov, Dec ($45)", () => {
    expect(billedMonths(pt("2026-10-15"), pt("2026-11-03"), "2026-09", 8)).toEqual(["2026-10", "2026-11", "2026-12"]);
  });
  it("still enrolled: every month", () => {
    expect(billedMonths(pt("2026-10-01"), null, "2026-10", 6)).toHaveLength(6);
  });
  it("months after the minimum are marked as minimum-only", () => {
    const c = { enrolledAt: pt("2026-10-01"), endedAt: pt("2026-10-20") };
    expect(billingFor(c, "2026-10")).toEqual({ billed: true, minimumOnly: false });
    expect(billingFor(c, "2026-11")).toEqual({ billed: true, minimumOnly: true });
    expect(billingFor(c, "2027-01")).toEqual({ billed: false, minimumOnly: false });
  });
  it("months follow Oakland time, not UTC", () => {
    // 8 pm Oct 31 in Oakland is already Nov 1 in UTC.
    expect(monthKey(new Date("2026-11-01T03:00:00Z"))).toBe("2026-10");
  });
});

describe("monthly invoices", () => {
  let f: Fixtures;
  beforeAll(async () => {
    f = await createFixtures();
    // A and B enrolled Sep 2026; B left in Sep (still owed Oct, Nov); C belongs to another org.
    await db.client.update({ where: { id: f.clientA.id }, data: { enrolledAt: pt("2026-09-10") } });
    await db.client.update({
      where: { id: f.clientB.id },
      data: { enrolledAt: pt("2026-09-05"), endedAt: pt("2026-09-25"), status: "CLOSED" },
    });
  });
  afterAll(async () => {
    await db.invoice.deleteMany({ where: { orgId: { in: [f.org.id, f.otherOrg.id] } } });
    await cleanup(f);
    await db.$disconnect();
  });

  it("bills each enrolled client once, marks minimum-only lines, totals at $15", async () => {
    const inv = await generateInvoice(f.org.id, "2026-11", pt("2026-12-01"));
    const lines = await db.invoiceLine.findMany({ where: { invoiceId: inv!.id } });
    expect(lines.map((l) => [l.clientId, l.minimumOnly]).sort()).toEqual(
      [
        [f.clientA.id, false],
        [f.clientB.id, true],
      ].sort(),
    );
    expect(Number(inv!.amount)).toBe(30);
    expect(inv!.activeClients).toBe(2);
    expect(inv!.month).toBe("2026-11");
  });

  it("net 30 by default: due 30 days after the invoice date", async () => {
    const inv = await db.invoice.findFirstOrThrow({ where: { orgId: f.org.id, month: "2026-11" } });
    expect((inv.dueDate.getTime() - pt("2026-12-01").getTime()) / 86400000).toBe(30);
  });

  it("running it again never makes a second invoice", async () => {
    await generateInvoice(f.org.id, "2026-11", pt("2026-12-02"));
    expect(await db.invoice.count({ where: { orgId: f.org.id, month: "2026-11" } })).toBe(1);
  });

  it("no invoice when nobody is billable that month", async () => {
    expect(await generateInvoice(f.org.id, "2026-08", pt("2026-09-01"))).toBeNull();
  });

  it("the client who left is no longer billed once the minimum is over", async () => {
    const inv = await generateInvoice(f.org.id, "2026-12", pt("2027-01-01"));
    const lines = await db.invoiceLine.findMany({ where: { invoiceId: inv!.id } });
    expect(lines.map((l) => l.clientId)).toEqual([f.clientA.id]);
  });

  it("only staff and that nonprofit's admins can see an invoice", () => {
    const inv = { orgId: f.org.id };
    expect(canViewInvoice({ id: f.staff.id, role: "STAFF" }, inv)).toBe(true);
    expect(canViewInvoice({ id: f.orgAdmin.id, role: "ORG_ADMIN", orgId: f.org.id }, inv)).toBe(true);
    expect(canViewInvoice({ id: "x", role: "ORG_ADMIN", orgId: f.otherOrg.id }, inv)).toBe(false);
    expect(canViewInvoice({ id: f.caseManager.id, role: "CASE_MANAGER", orgId: f.org.id }, inv)).toBe(false);
    expect(canViewInvoice({ id: f.clientA.id, role: "CLIENT", clientId: f.clientA.id }, inv)).toBe(false);
  });
});
