import { describe, expect, it } from "vitest";
import {
  evaluateActivationReadiness,
  type ActivationReadinessInput,
} from "../app/lib/recovery/activation-readiness";

const readyInput: ActivationReadinessInput = {
  approvedTestRecipient: "qa@example.com",
  controlledTestCompleted: true,
  emailIdentityConfigured: true,
  mode: "test",
  recoveryConfigurationPersisted: true,
  sendingDomainStatus: "verified",
  stripeCommunicationOverlapReviewed: true,
  stripeConnected: true,
  webhookHealth: "healthy",
};

describe("activation readiness", () => {
  it("is not ready when core setup is missing", () => {
    const result = evaluateActivationReadiness({
      ...readyInput,
      approvedTestRecipient: null,
      emailIdentityConfigured: false,
      recoveryConfigurationPersisted: false,
      stripeConnected: false,
    });

    expect(result.state).toBe("not_ready");
    expect(result.checks.filter((item) => item.status === "required").map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "stripe_connection",
        "recovery_configuration",
        "email_identity",
        "test_recipient",
      ]),
    );
  });

  it("allows controlled testing before live-only safeguards are complete", () => {
    const result = evaluateActivationReadiness({
      ...readyInput,
      controlledTestCompleted: false,
      sendingDomainStatus: "not_configured",
      stripeCommunicationOverlapReviewed: false,
      webhookHealth: "unknown",
    });

    expect(result.state).toBe("ready_for_test");
    expect(result.checks.find((item) => item.id === "sending_domain")?.status).toBe("warning");
    expect(result.checks.find((item) => item.id === "controlled_test")?.status).toBe("warning");
  });

  it("moves from not ready to ready for test when required setup is completed", () => {
    const incomplete = evaluateActivationReadiness({
      ...readyInput,
      approvedTestRecipient: null,
      emailIdentityConfigured: false,
      controlledTestCompleted: false,
      sendingDomainStatus: "not_configured",
      webhookHealth: "unknown",
    });
    const completed = evaluateActivationReadiness({
      ...readyInput,
      controlledTestCompleted: false,
      sendingDomainStatus: "not_configured",
      webhookHealth: "unknown",
    });

    expect(incomplete.state).toBe("not_ready");
    expect(completed.state).toBe("ready_for_test");
  });

  it("requires all live safeguards before declaring live readiness", () => {
    expect(evaluateActivationReadiness(readyInput).state).toBe("ready_for_live");
  });

  it("reports attention required when a live dependency degrades", () => {
    const webhookFailure = evaluateActivationReadiness({
      ...readyInput,
      mode: "live",
      webhookHealth: "failing",
    });
    const domainFailure = evaluateActivationReadiness({
      ...readyInput,
      mode: "live",
      sendingDomainStatus: "failed",
    });

    expect(webhookFailure.state).toBe("attention_required");
    expect(domainFailure.state).toBe("attention_required");
  });

  it("does not treat unknown webhook health as a failure", () => {
    const result = evaluateActivationReadiness({
      ...readyInput,
      controlledTestCompleted: false,
      webhookHealth: "unknown",
    });

    expect(result.state).toBe("ready_for_test");
    expect(result.checks.find((item) => item.id === "webhook_health")?.status).toBe("warning");
  });
});
