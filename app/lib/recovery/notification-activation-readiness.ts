import type { ActivationReadiness } from "./activation-readiness";
import { ESSENTIAL_NOTIFICATION_RULES } from "./essential-notification-policy";
import type { PreviewNotificationHistory } from "./notification-event-history";

export type NotificationActivationCheck = {
  detail: string;
  id: "recipient" | "policy" | "cooldowns" | "domain_health" | "test_evidence";
  label: string;
  status: "complete" | "required";
};

export type NotificationActivationReadiness = {
  checks: NotificationActivationCheck[];
  state: "blocked" | "ready_for_review";
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUIRED_RULE_IDS = [
  "webhook_failure",
  "sending_domain_failure",
  "attention_digest",
] as const;

function activationCheck(
  readiness: ActivationReadiness,
  id: "controlled_test" | "sending_domain",
) {
  return readiness.checks.find((candidate) => candidate.id === id);
}

export function evaluateNotificationActivationReadiness({
  accountEmail,
  activationReadiness,
  notificationHistory,
}: {
  accountEmail: string;
  activationReadiness: ActivationReadiness;
  notificationHistory: PreviewNotificationHistory;
}): NotificationActivationReadiness {
  const recipientReady = EMAIL_PATTERN.test(accountEmail);
  const configuredRuleIds = new Set(ESSENTIAL_NOTIFICATION_RULES.map((rule) => rule.id));
  const policyReady = REQUIRED_RULE_IDS.every((id) => configuredRuleIds.has(id));
  const cooldownsReady = ESSENTIAL_NOTIFICATION_RULES.every((rule) => rule.cooldownLabel.trim().length > 0);
  const sendingDomainReady = activationCheck(activationReadiness, "sending_domain")?.status === "complete";
  const controlledTestReady = activationCheck(activationReadiness, "controlled_test")?.status === "complete";
  const previewStorageReady = notificationHistory.state === "ready";
  const testEvidenceReady = controlledTestReady && previewStorageReady;

  const checks: NotificationActivationCheck[] = [
    {
      detail: recipientReady
        ? `${accountEmail} is a valid proposed recipient.`
        : "A valid account-owner recipient is required.",
      id: "recipient",
      label: "Notification recipient",
      status: recipientReady ? "complete" : "required",
    },
    {
      detail: policyReady
        ? "All three essential notification rules are defined."
        : "The essential notification policy is incomplete.",
      id: "policy",
      label: "Essential policy rules",
      status: policyReady ? "complete" : "required",
    },
    {
      detail: cooldownsReady
        ? "Every rule has duplicate and cooldown protection."
        : "Every rule must define duplicate and cooldown protection.",
      id: "cooldowns",
      label: "Noise protection",
      status: cooldownsReady ? "complete" : "required",
    },
    {
      detail: sendingDomainReady
        ? "The customer-facing sending domain is verified."
        : "Verify the sending domain before notification delivery can be reviewed.",
      id: "domain_health",
      label: "Sending-domain health",
      status: sendingDomainReady ? "complete" : "required",
    },
    {
      detail: testEvidenceReady
        ? "A controlled recovery test exists and preview-event storage is available."
        : !controlledTestReady
          ? "Complete a controlled recovery test before notification delivery can be reviewed."
          : "Preview-event storage must be available before notification delivery can be reviewed.",
      id: "test_evidence",
      label: "Controlled test evidence",
      status: testEvidenceReady ? "complete" : "required",
    },
  ];

  return {
    checks,
    state: checks.every((item) => item.status === "complete")
      ? "ready_for_review"
      : "blocked",
  };
}
