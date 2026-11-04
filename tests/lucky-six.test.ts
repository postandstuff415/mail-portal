import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { reenroll } from "@/lib/billing";
import { db } from "@/lib/db";
import { createClient } from "@/lib/intake";
import { assignLuckyNumber } from "@/lib/lucky-six";
import type { Viewer } from "@/lib/permissions";
import { generateClientInvoice } from "@/lib/self-pay";
import { cleanup, createFixtures, type Fixtures } from "./fixtures";

// Every 6th new self-pay activation gets 6 free months; nonprofit clients never count.
let f: Fixtures;
let staff: Viewer;
const made: string[] = [];

beforeAll(async () => {
  f = await createFixtures();
  staff = { id: f.staff.id, role: "STAFF" };
});
afterAll(async () => {
  await db.clientInvoice.deleteMany({ where: { clientId: { in: made } } });
  await db.client.deleteMany({ where: { id: { in: made } } });
  await cleanup(f);
  await db.$disconnect();
});

async function selfPay(i: number) {
  const { client, lucky } = await createClient(staff, {
    pmbNumber: `VL${f.tag}${i}`,
    firstName: `Lucky${i}`,
    lastName: f.tag,
    billingType: "SELF_PAY",
    monthlyPrice: "15",
    email: `l${i}@vitest.example`,
    form1583OnFile: true,
  });
  made.push(client.id);
  return { client, lucky };
}

describe("Lucky 6", () => {
  it("only self-pay activations get a number", async () => {
    const { client, lucky } = await createClient(staff, {
      pmbNumber: `VL${f.tag}N`,
      firstName: "Org",
      lastName: f.tag,
      orgId: f.org.id,
      form1583OnFile: true,
    });
    expect(lucky).toBeNull();
    expect(client.luckyNumber).toBeNull();
  });

  it("the 6th self-pay activation in a row wins 6 free months; its first bills are skipped", async () => {
    const results = [];
    for (let i = 1; i <= 6; i++) results.push((await selfPay(i)).lucky!);
    const numbers = results.map((r) => r.number);
    // Consecutive numbers; exactly the multiples of 6 win.
    for (let i = 1; i < 6; i++) expect(numbers[i]).toBe(numbers[i - 1] + 1);
    for (const r of results) expect(r.won).toBe(r.number % 6 === 0);
    expect(results.filter((r) => r.won)).toHaveLength(1);

    const winner = await db.client.findFirstOrThrow({ where: { id: { in: made }, freeMonths: 6 } });
    const now = new Date();
    expect(await generateClientInvoice(winner.id, monthKeyNow(now), now)).toBeNull();
    const loser = await db.client.findFirstOrThrow({ where: { id: { in: made }, freeMonths: 0, billingType: "SELF_PAY" } });
    expect(await generateClientInvoice(loser.id, monthKeyNow(now), now)).not.toBeNull();

    // Re-enrolling never brings free months back.
    await reenroll(staff, winner.id);
    expect((await db.client.findUniqueOrThrow({ where: { id: winner.id } })).freeMonths).toBe(0);
  });

  it("one number per person: the same name again gets none", async () => {
    const first = await db.client.findFirstOrThrow({ where: { id: { in: made }, luckyNumber: { not: null } } });
    const again = await db.client.create({
      data: {
        pmbNumber: `VL${f.tag}R`,
        firstName: first.firstName.toUpperCase(),
        lastName: first.lastName,
        pinHash: "x",
        billingType: "SELF_PAY",
        monthlyPrice: "15.00",
      },
    });
    made.push(again.id);
    expect(await assignLuckyNumber(again.id)).toBeNull();
  });
});

function monthKeyNow(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit" })
    .format(d)
    .slice(0, 7);
}
