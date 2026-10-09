import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const serviceSource = readFileSync(
  new URL("../app/lib/server/synthetic-test-case.ts", import.meta.url),
  "utf8",
);
const routeSource = readFileSync(
  new URL("../app/api/recovery/test-case/route.ts", import.meta.url),
  "utf8",
);

describe("synthetic test-case safety boundary", () => {
  it("revalidates authentication and eligibility on the server", () => {
    expect(routeSource).toContain("supabase.auth.getClaims()");
    expect(routeSource).toContain("getControlledTestEligibility");
    expect(serviceSource).toContain("getSyntheticTestCaseGateError");
  });

  it("hard-codes sandbox-only detected cases", () => {
    expect(serviceSource).toContain('recoverySettings.livemode !== false');
    expect(serviceSource).toContain('recoverySettings.mode !== "test"');
    expect(serviceSource).toContain("livemode: false");
    expect(serviceSource).toContain('targetStatus: "detected"');
  });

  it("does not schedule or deliver recovery messages", () => {
    expect(serviceSource).not.toContain("ensureRecoverySequenceForFailedPayment");
    expect(serviceSource).not.toContain("recovery-delivery");
    expect(serviceSource).not.toContain("Resend");
  });
});
