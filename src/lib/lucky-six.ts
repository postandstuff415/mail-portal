import { Prisma } from "@prisma/client";
import { addMonths, monthKey, monthLabel } from "@/lib/billing";
import { db } from "@/lib/db";

// "Lucky 6" promo (owner decision 2026-11-03), self-pay clients only:
// every 6th new self-pay mailbox gets its first 6 months free.
// - Counted when staff ACTIVATE the mailbox in person (two IDs + Form 1583),
//   never at the online sign-up, so fake sign-ups can't take the 6th spot.
// - A fixed rule, not a dice roll: no chance element, so it's a discount, not a lottery.
// - One free period per person: anyone who has had a number before (same name) gets no new one.
// - Free months are the first 6 calendar months, starting with the activation month.
// Turn it off with LUCKY_SIX=off; winners already chosen keep their months.

export const LUCKY_EVERY = 6;
export const LUCKY_FREE_MONTHS = 6;

export function luckySixOn(): boolean {
  return process.env.LUCKY_SIX !== "off";
}

// How many more activations until the next free one (1 = the very next one is free).
export function untilNextFree(countSoFar: number): number {
  return LUCKY_EVERY - (countSoFar % LUCKY_EVERY);
}

export function bannerCountdown(countSoFar: number): string {
  const n = untilNextFree(countSoFar);
  return n === 1 ? "The next new self-pay mailbox is FREE for 6 months!" : `${n} more new mailboxes until the next free one.`;
}

export async function luckySixCount(): Promise<number> {
  return db.client.count({ where: { luckyNumber: { not: null } } });
}

// Last free month, e.g. "April 2027", or null when the client has no free months.
export function freeThrough(client: { enrolledAt: Date; freeMonths: number }): string | null {
  if (client.freeMonths <= 0) return null;
  return monthLabel(addMonths(monthKey(client.enrolledAt), client.freeMonths - 1));
}

// Is this month one of the client's free promo months?
export function isFreeMonth(client: { enrolledAt: Date; freeMonths: number }, month: string): boolean {
  return client.freeMonths > 0 && month < addMonths(monthKey(client.enrolledAt), client.freeMonths);
}

export type LuckyResult = { number: number; won: boolean; freeThrough: string | null };

// Call right after a NEW self-pay client is activated. Gives them the next
// number; every 6th wins. Null when the promo is off, the client isn't
// self-pay, already has a number, or this person had one before.
export async function assignLuckyNumber(clientId: string): Promise<LuckyResult | null> {
  if (!luckySixOn()) return null;
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client || client.billingType !== "SELF_PAY" || client.luckyNumber !== null) return null;
  const before = await db.client.findFirst({
    where: {
      id: { not: clientId },
      luckyNumber: { not: null },
      firstName: { equals: client.firstName, mode: "insensitive" },
      lastName: { equals: client.lastName, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (before) return null;

  // Two staff activating at the same moment: the unique number makes one retry.
  for (let attempt = 0; attempt < 5; attempt++) {
    const max = await db.client.aggregate({ _max: { luckyNumber: true } });
    const number = (max._max.luckyNumber ?? 0) + 1;
    const won = number % LUCKY_EVERY === 0;
    try {
      const saved = await db.client.update({
        where: { id: clientId },
        data: { luckyNumber: number, freeMonths: won ? LUCKY_FREE_MONTHS : 0 },
      });
      return { number, won, freeThrough: freeThrough(saved) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  throw new Error("Couldn't give a Lucky 6 number; try again.");
}
