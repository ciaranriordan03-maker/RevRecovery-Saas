import { describe, expect, it } from "vitest";
import { evaluateNotificationActivationReadiness } from "../app/lib/recovery/notification-activation-readiness";
import type { ActivationReadiness } from "../app/lib/recovery/activation-readiness";

function activationReadiness({ domain = "complete", test = "complete" }: { domain?: "complete" | "required" | "warning"; test?: "complete" | "required" | "warning" } = {}): ActivationReadiness {
  return {
    checks: [
      { detail: "Domain", id: "sending_domain", label: "Sending domain", status: domain },
      { detail: "Test", id: "controlled_test", label: "Controlled test", status: test },
    ],
    state: "ready_for_live",
  };
}

describe("notification activation readiness", () => {
  it("is ready for review only when every notification safeguard passes", () => {
    const result = evaluateNotificationActivationReadiness({
      accountEmail: "owner@example.com",
      activationReadiness: activationReadiness(),
      notificationHistory: { events: [], state: "ready" },
    });

    expect(result.state).toBe("ready_for_review");
    expect(result.checks).toHaveLength(5);
    expect(result.checks.every((item) => item.status === "complete")).toBe(true);
  });

  it("keeps delivery blocked for an invalid recipient", () => {
    const result = evaluateNotificationActivationReadiness({
      accountEmail: "Account owner email unavailable",
      activationReadiness: activationReadiness(),
      notificationHistory: { events: [], state: "ready" },
    });

    expect(result.state).toBe("blocked");
    expect(result.checks.find((item) => item.id === "recipient")?.status).toBe("required");
  });

  it("keeps delivery blocked until the domain, controlled test, and preview storage are healthy", () => {
    const result = evaluateNotificationActivationReadiness({
      accountEmail: "owner@example.com",
      activationReadiness: activationReadiness({ domain: "warning", test: "warning" }),
      notificationHistory: { events: [], state: "unavailable" },
    });

    expect(result.state).toBe("blocked");
    expect(result.checks.find((item) => item.id === "domain_health")?.status).toBe("required");
    expect(result.checks.find((item) => item.id === "test_evidence")?.status).toBe("required");
  });
});
