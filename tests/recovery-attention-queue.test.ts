import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeRecoveryCaseFilters } from "../app/lib/server/recovery-cases";

describe("needs-attention queue and high-value prioritization", () => {
  it("requires a valid currency before accepting a value threshold", () => {
    expect(normalizeRecoveryCaseFilters({ minimumAmount: "500" })).toMatchObject({
      currency: null,
      minimumAmountCents: null,
      minimumAmountInput: "",
    });
  });

  it("converts exact decimal thresholds to integer minor units", () => {
    expect(normalizeRecoveryCaseFilters({
      currency: "gbp",
      minimumAmount: "1200.5",
    })).toMatchObject({
      currency: "gbp",
      minimumAmountCents: 120050,
      minimumAmountInput: "1200.5",
    });
  });

  it("rejects ambiguous, negative, or over-precise thresholds", () => {
    for (const minimumAmount of ["0", "-20", "10.999", "1,000", "free"]) {
      expect(normalizeRecoveryCaseFilters({
        currency: "usd",
        minimumAmount,
      }).minimumAmountCents).toBeNull();
    }
  });

  it("explains that high value is user-defined and currency-specific", () => {
    const content = readFileSync(
      new URL("../app/components/dashboard/cases-content.tsx", import.meta.url),
      "utf8",
    );
    expect(content).toContain("High value is never assumed across currencies");
    expect(content).toContain("your own threshold");
  });

  it("uses the latest provider outcome so an old bounce does not stay actionable", () => {
    const source = readFileSync(
      new URL("../app/lib/server/recovery-cases.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("latestStatusByCase.set");
    expect(source).toContain('.order("scheduled_for", { ascending: true })');
    expect(source).not.toContain('.in("provider_delivery_status", ATTENTION_DELIVERY_STATUSES)');
  });
});
