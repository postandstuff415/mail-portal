import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { AGREEMENTS, CURRENT_AGREEMENT } from "@/lib/agreement";
import { clientBillEmail, clientBillText, parsePrice } from "@/lib/self-pay";

// No database needed: wording and price parsing for self-pay bills.
const bill = {
  id: "cl_test_abcdefgh12345678",
  month: "2026-11",
  amount: new Prisma.Decimal("15.00"),
  dueDate: new Date("2026-11-11T20:00:00Z"),
  client: { firstName: "Robin", lastName: "Payer", pmbNumber: "101", enrolledAt: new Date("2026-10-30T20:00:00Z") },
};

describe("self-pay bills", () => {
  it("parses prices like 15, $15.00, 12.5 and rejects zero or junk", () => {
    expect(parsePrice("15").toFixed(2)).toBe("15.00");
    expect(parsePrice("$15.00").toFixed(2)).toBe("15.00");
    expect(parsePrice("12.5").toFixed(2)).toBe("12.50");
    expect(() => parsePrice("0")).toThrow();
    expect(() => parsePrice("abc")).toThrow();
    expect(() => parsePrice("")).toThrow();
  });

  it("bill text: amount, due date, where to pay, STOP; nothing about mail", () => {
    const t = clientBillText(bill);
    expect(t).toContain("November 2026");
    expect(t).toContain("$15.00");
    expect(t).toContain("Nov 11");
    expect(t).toContain("4051 Foothill");
    expect(t).toContain("Reply STOP");
    expect(t.toLowerCase()).not.toContain("piece");
  });

  it("bill email explains the 3-month minimum early on, then month to month", () => {
    const early = clientBillEmail(bill, "robin@example.com");
    expect(early.to).toBe("robin@example.com");
    expect(early.subject).toContain("$15.00");
    expect(early.text).toContain("first 3 months are the minimum");
    const later = clientBillEmail({ ...bill, month: "2027-02" }, "robin@example.com");
    expect(later.text).toContain("month to month");
    expect(later.text).not.toContain("minimum");
  });

  it("agreement 2026-10-30 adds self-pay; older versions are kept unchanged", () => {
    expect(CURRENT_AGREEMENT.version).toBe("2026-10-30");
    const text = JSON.stringify(CURRENT_AGREEMENT);
    expect(text).toContain("self-pay");
    expect(text).toContain("3 months");
    expect(JSON.stringify(AGREEMENTS["2026-10-16"])).not.toContain("self-pay");
  });
});
