import type { ActivationReadiness } from "./activation-readiness";
import type { RecoveryMode } from "./mode-policy";

export type RecoveryHealthSummary = {
  detail: string;
  state: "attention" | "healthy" | "monitoring";
  title: string;
};

const OPERATIONAL_CHECK_IDS = new Set(["sending_domain", "webhook_health"]);

export function buildRecoveryHealthSummary(
  readiness: ActivationReadiness,
  mode: RecoveryMode,
): RecoveryHealthSummary {
  const operationalChecks = readiness.checks.filter((item) =>
    OPERATIONAL_CHECK_IDS.has(item.id),
  );
  const requiredChecks = operationalChecks.filter((item) => item.status === "required");
  const warningChecks = operationalChecks.filter((item) => item.status === "warning");

  if (requiredChecks.length > 0) {
    return {
      detail: requiredChecks.map((item) => item.detail).join(" "),
      state: "attention",
      title: "Recovery health needs attention",
    };
  }

  if (mode !== "live") {
    return {
      detail: `Recovery is in ${mode} mode. Operational checks remain visible while customer delivery is not live.`,
      state: "monitoring",
      title: "Recovery health is being monitored",
    };
  }

  if (warningChecks.length > 0) {
    return {
      detail: warningChecks.map((item) => item.detail).join(" "),
      state: "monitoring",
      title: "Recovery health is partially verified",
    };
  }

  return {
    detail: "Stripe event processing and the customer-facing sending domain are currently verified.",
    state: "healthy",
    title: "Recovery health is operational",
  };
}
