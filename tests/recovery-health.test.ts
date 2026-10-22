import { describe, expect, it } from "vitest";
import type { ActivationReadiness } from "../app/lib/recovery/activation-readiness";
import { buildRecoveryHealthSummary } from "../app/lib/recovery/recovery-health";

function readiness(
  sendingDomain: "complete" | "required" | "warning",
  webhook: "complete" | "required" | "warning",
): ActivationReadiness {
  return {
    checks: [
      { detail: "Domain detail.", id: "sending_domain", label: "Sending domain", status: sendingDomain },
      { detail: "Webhook detail.", id: "webhook_health", label: "Webhook health", status: webhook },
    ],
    state: "ready_for_test",
  };
}

describe("recovery health summary", () => {
  it("surfaces required operational checks", () => {
    expect(buildRecoveryHealthSummary(readiness("complete", "required"), "live")).toEqual({
      detail: "Webhook detail.",
      state: "attention",
      title: "Recovery health needs attention",
    });
  });

  it("describes non-live modes as monitored rather than operational", () => {
    const result = buildRecoveryHealthSummary(readiness("complete", "complete"), "test");
    expect(result.state).toBe("monitoring");
    expect(result.detail).toContain("test mode");
  });

  it("only calls live recovery operational when checks are complete", () => {
    expect(buildRecoveryHealthSummary(readiness("complete", "complete"), "live").state).toBe("healthy");
    expect(buildRecoveryHealthSummary(readiness("warning", "complete"), "live").state).toBe("monitoring");
  });
});
