import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../app/lib/server/at-risk-customers.ts", import.meta.url),
  "utf8",
);
const tableSource = readFileSync(
  new URL(
    "../app/components/dashboard/at-risk-customers-table.tsx",
    import.meta.url,
  ),
  "utf8",
);

describe("recovery case diagnostic boundary", () => {
  it("selects persisted raw Stripe failure facts for the diagnostic DTO", () => {
    expect(source).toContain("failure_code, decline_code, failure_message");
    expect(source).toContain("getRecoveryDeclineDiagnostic");
  });

  it("keeps the open-case query explicitly scoped to the authenticated tenant", () => {
    expect(source).toContain('.eq("user_id", userId)');
  });

  it("does not change currency or case-state calculations", () => {
    expect(source).toContain("amountDue: payment.amount_due");
    expect(source).toContain("currency: payment.currency");
    expect(source).toContain("getEffectiveRecoveryCaseStatus");
  });

  it("shows the normalized reason in the existing open-cases table", () => {
    expect(tableSource).toContain("Failure Reason");
    expect(tableSource).toContain("customer.failureDiagnostic.title");
    expect(tableSource).toContain("customer.failureDiagnostic.explanation");
  });
});
