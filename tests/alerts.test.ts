import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { alertMessage, buildDailyAlerts, pacificHour, sendDailyAlerts } from "@/lib/alerts";
import { db } from "@/lib/db";
import { cleanup, createFixtures, type Fixtures } from "./fixtures";

let f: Fixtures;
beforeAll(async () => {
  f = await createFixtures();
  const day = 24 * 60 * 60 * 1000;
  const retainUntil = new Date(Date.now() + 365 * day);
  // The shared fixture items count as old mail here.
  await db.mailItem.updateMany({
    where: { id: { in: [f.itemA.id, f.itemB.id, f.itemC.id] } },
    data: { receivedAt: new Date(Date.now() - 5 * day) },
  });
  // Client A: 2 new pieces today (one with a sender) + 1 old piece. Client B: no phone.
  await db.mailItem.createMany({
    data: [
      { clientId: f.clientA.id, sender: "Superior Court", retainUntil },
      { clientId: f.clientA.id, retainUntil },
      { clientId: f.clientA.id, retainUntil, receivedAt: new Date(Date.now() - 3 * day) },
      { clientId: f.clientB.id, retainUntil },
      { clientId: f.clientC.id, retainUntil },
    ],
  });
  await db.client.update({ where: { id: f.clientB.id }, data: { phone: null } });
  // C has a phone and new mail but never agreed to texts.
  await db.client.update({ where: { id: f.clientC.id }, data: { smsConsentAt: null } });
});
afterAll(async () => {
  await cleanup(f);
  await db.$disconnect();
});

describe("daily text alerts", () => {
  it("one text per client, counting only the last 24 hours", async () => {
    const alerts = (await buildDailyAlerts(new Date())).filter((a) =>
      [f.clientA.id, f.clientB.id, f.clientC.id].includes(a.clientId),
    );
    expect(alerts).toHaveLength(1); // B has no phone; C never agreed to texts
    expect(alerts[0]).toMatchObject({ clientId: f.clientA.id, phone: f.clientA.phone });
    expect(alerts[0].message).toContain("2 new pieces");
  });

  it("texts never include the sender or contents", async () => {
    const alerts = await buildDailyAlerts(new Date());
    for (const a of alerts) expect(a.message).not.toMatch(/court/i);
    expect(alertMessage(1)).toBe(
      "Post and Stuff: you have 1 new piece of mail. See it at postandstuff.com or stop by the shop. Reply STOP to opt out.",
    );
  });

  it("sends through the given sender and keeps going if one text fails", async () => {
    const sent: string[] = [];
    const result = await sendDailyAlerts(new Date(), async (to) => {
      if (to === f.clientA.phone) throw new Error("carrier rejected");
      sent.push(to);
    });
    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(sent).not.toContain(f.clientA.phone);
  });

  it("a client who replied STOP gets their texts switched off in our records", async () => {
    await db.client.update({ where: { id: f.clientA.id }, data: { smsConsentAt: new Date() } });
    const result = await sendDailyAlerts(new Date(), async (to) => {
      if (to === f.clientA.phone) throw Object.assign(new Error("Attempt to send to unsubscribed recipient"), { code: 21610 });
    });
    expect(result.optedOut).toBeGreaterThanOrEqual(1);
    expect((await db.client.findUniqueOrThrow({ where: { id: f.clientA.id } })).smsConsentAt).toBeNull();
  });

  it("knows when it's 5 pm in Oakland, in summer and winter time", () => {
    expect(pacificHour(new Date("2026-07-01T00:00:00Z"))).toBe(17); // PDT
    expect(pacificHour(new Date("2026-12-01T01:00:00Z"))).toBe(17); // PST
    expect(pacificHour(new Date("2026-12-01T00:00:00Z"))).toBe(16);
  });
});
