import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeRecoveryCaseFilters } from "../app/lib/server/recovery-cases";

describe("recovery cases workspace", () => {
  it("defaults to actionable open cases", () => {
    expect(normalizeRecoveryCaseFilters()).toEqual({
      currency: null,
      environment: "all",
      minimumAmountCents: null,
      minimumAmountInput: "",
      page: 1,
      segment: "all",
      status: "open",
    });
  });

  it("accepts supported filters and a positive page", () => {
    expect(normalizeRecoveryCaseFilters({
      currency: "EUR",
      environment: "live",
      minimumAmount: "499.95",
      page: "3",
      segment: "subscription",
      status: "recovered",
    })).toEqual({
      currency: "eur",
      environment: "live",
      minimumAmountCents: 49995,
      minimumAmountInput: "499.95",
      page: 3,
      segment: "subscription",
      status: "recovered",
    });
  });

  it("rejects unknown filters and unsafe page values", () => {
    expect(normalizeRecoveryCaseFilters({
      currency: "EURO",
      environment: "production-secret",
      minimumAmount: "-1",
      page: "-12",
      segment: "enterprise",
      status: "deleted",
    })).toEqual({
      currency: null,
      environment: "all",
      minimumAmountCents: null,
      minimumAmountInput: "",
      page: 1,
      segment: "all",
      status: "open",
    });
  });

  it("enforces tenant-scoped paginated database reads", () => {
    const source = readFileSync(
      new URL("../app/lib/server/recovery-cases.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain('.eq("user_id", userId)');
    expect(source.match(/\.eq\("user_id", userId\)/g)).toHaveLength(4);
    expect(source).toContain(".range(offset, offset + PAGE_SIZE - 1)");
    expect(source).toContain('{ count: "exact" }');
  });

  it("supports an accurate attention queue and currency-specific value threshold", () => {
    const source = readFileSync(
      new URL("../app/lib/server/recovery-cases.ts", import.meta.url),
      "utf8",
    );
    expect(normalizeRecoveryCaseFilters({ status: "attention" }).status).toBe("attention");
    expect(source).toContain("getAttentionMessageCaseIds");
    expect(source).toContain("ATTENTION_DELIVERY_STATUSES");
    expect(source).toContain('.gte("amount_due", filters.minimumAmountCents)');
    expect(source).toContain('.order("amount_due", { ascending: false })');
  });

  it("uses persisted decline facts without claiming causation", () => {
    const source = readFileSync(
      new URL("../app/lib/server/recovery-cases.ts", import.meta.url),
      "utf8",
    );
    const content = readFileSync(
      new URL("../app/components/dashboard/cases-content.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("getRecoveryDeclineDiagnostic");
    expect(content).toContain("Review what Stripe reported");
    expect(content).not.toMatch(/caused (the )?recovery/i);
  });
});
