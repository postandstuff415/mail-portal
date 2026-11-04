import { describe, expect, it } from "vitest";
import { bannerCountdown, freeThrough, isFreeMonth, untilNextFree } from "@/lib/lucky-six";

// No database needed: the countdown and which months are free.
describe("Lucky 6 promo", () => {
  it("counts down to every 6th activation", () => {
    expect(untilNextFree(0)).toBe(6);
    expect(untilNextFree(4)).toBe(2);
    expect(untilNextFree(5)).toBe(1);
    expect(untilNextFree(6)).toBe(6);
    expect(bannerCountdown(5)).toContain("next new self-pay mailbox is FREE");
    expect(bannerCountdown(3)).toBe("3 more new mailboxes until the next free one.");
  });

  it("a winner activated Nov 2026 is free Nov through Apr, billed from May", () => {
    const winner = { enrolledAt: new Date("2026-11-20T20:00:00Z"), freeMonths: 6 };
    expect(isFreeMonth(winner, "2026-11")).toBe(true);
    expect(isFreeMonth(winner, "2027-04")).toBe(true);
    expect(isFreeMonth(winner, "2027-05")).toBe(false);
    expect(freeThrough(winner)).toBe("April 2027");
  });

  it("non-winners have no free months", () => {
    const regular = { enrolledAt: new Date("2026-11-20T20:00:00Z"), freeMonths: 0 };
    expect(isFreeMonth(regular, "2026-11")).toBe(false);
    expect(freeThrough(regular)).toBeNull();
  });
});
