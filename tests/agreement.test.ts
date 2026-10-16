import { describe, expect, it } from "vitest";
import { AGREEMENTS, CURRENT_AGREEMENT } from "@/lib/agreement";

describe("client agreement", () => {
  it("uses the shop's real ZIP (USPS: 94601), not the PO Box ZIP 94604", () => {
    const text = JSON.stringify(CURRENT_AGREEMENT);
    expect(text).toContain("Oakland, CA 94601");
    expect(text).not.toContain("94604");
  });

  it("keeps every older version so saved signatures still point at their words", () => {
    expect(AGREEMENTS["2026-10-12"].intro).toContain("94604");
    expect(AGREEMENTS[CURRENT_AGREEMENT.version]).toBe(CURRENT_AGREEMENT);
  });
});
