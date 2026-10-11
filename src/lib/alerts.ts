import { db } from "@/lib/db";
import { sendSms, type SmsSender } from "@/lib/sms";

// One text per client per day, sent at 5 pm Pacific, counting the mail that
// arrived in the previous 24 hours. Texts NEVER include sender or contents.

export const ALERT_HOUR_PACIFIC = 17;
const DAY_MS = 24 * 60 * 60 * 1000;

export function pacificHour(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hourCycle: "h23" }).format(now),
  );
}

export function alertMessage(count: number): string {
  const pieces = count === 1 ? "1 new piece" : `${count} new pieces`;
  return `Post and Stuff: you have ${pieces} of mail. See it at postandstuff.com or stop by the shop. Reply STOP to opt out.`;
}

export async function buildDailyAlerts(now: Date) {
  const since = new Date(now.getTime() - DAY_MS);
  const groups = await db.mailItem.groupBy({
    by: ["clientId"],
    where: { receivedAt: { gt: since, lte: now }, client: { status: "ACTIVE", phone: { not: null } } },
    _count: { _all: true },
  });
  const clients = await db.client.findMany({
    where: { id: { in: groups.map((g) => g.clientId) } },
    select: { id: true, phone: true },
  });
  const phoneById = new Map(clients.map((c) => [c.id, c.phone!]));
  return groups.map((g) => ({
    clientId: g.clientId,
    phone: phoneById.get(g.clientId)!,
    message: alertMessage(g._count._all),
  }));
}

export async function sendDailyAlerts(now: Date, send: SmsSender = sendSms) {
  const alerts = await buildDailyAlerts(now);
  let sent = 0;
  let failed = 0;
  for (const alert of alerts) {
    try {
      await send(alert.phone, alert.message);
      sent++;
    } catch (error) {
      failed++;
      console.error(`Text to client ${alert.clientId} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return { sent, failed };
}
