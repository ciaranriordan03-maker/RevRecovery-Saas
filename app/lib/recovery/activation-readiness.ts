import type { RecoveryMode } from "./mode-policy";
import type { SendingDomainStatus } from "../email/sending-domain";

export const ACTIVATION_READINESS_STATES = [
  "not_ready",
  "ready_for_test",
  "ready_for_live",
  "attention_required",
] as const;

export type ActivationReadinessState =
  (typeof ACTIVATION_READINESS_STATES)[number];

export type ActivationReadinessCheck = {
  detail: string;
  id:
    | "stripe_connection"
    | "recovery_configuration"
    | "email_identity"
    | "test_recipient"
    | "sending_domain"
    | "webhook_health"
    | "controlled_test"
    | "stripe_communication_overlap";
  label: string;
  status: "complete" | "required" | "warning";
};

export type ActivationReadinessInput = {
  approvedTestRecipient: string | null;
  controlledTestCompleted: boolean;
  emailIdentityConfigured: boolean;
  mode: RecoveryMode;
  recoveryConfigurationPersisted: boolean;
  sendingDomainStatus: SendingDomainStatus | "not_configured";
  stripeCommunicationOverlapReviewed: boolean;
  stripeConnected: boolean;
  webhookHealth: "healthy" | "unknown" | "stale" | "failing";
};

export type ActivationReadiness = {
  checks: ActivationReadinessCheck[];
  state: ActivationReadinessState;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function check(
  id: ActivationReadinessCheck["id"],
  label: string,
  status: ActivationReadinessCheck["status"],
  detail: string,
): ActivationReadinessCheck {
  return { detail, id, label, status };
}

export function evaluateActivationReadiness(
  input: ActivationReadinessInput,
): ActivationReadiness {
  const validTestRecipient = Boolean(
    input.approvedTestRecipient && EMAIL_PATTERN.test(input.approvedTestRecipient),
  );
  const stripeReady = input.stripeConnected;
  const recoveryReady = input.recoveryConfigurationPersisted;
  const identityReady = input.emailIdentityConfigured;
  const domainReady = input.sendingDomainStatus === "verified";
  const webhookReady = input.webhookHealth === "healthy";
  const degraded =
    input.webhookHealth === "failing" ||
    (input.mode === "live" &&
      ["failed", "disabled"].includes(input.sendingDomainStatus));

  const checks: ActivationReadinessCheck[] = [
    check(
      "stripe_connection",
      "Stripe connection",
      stripeReady ? "complete" : "required",
      stripeReady
        ? "Stripe is connected."
        : "Connect Stripe before monitoring failed subscription payments.",
    ),
    check(
      "recovery_configuration",
      "Recovery configuration",
      recoveryReady ? "complete" : "required",
      recoveryReady
        ? "A saved recovery schedule and operating mode are available."
        : "Save a recovery schedule, timezone, and operating mode.",
    ),
    check(
      "email_identity",
      "Email identity and messages",
      identityReady ? "complete" : "required",
      identityReady
        ? "Sender details and recovery messages are configured."
        : "Complete the sender, reply-to, support, and message settings.",
    ),
    check(
      "test_recipient",
      "Approved test recipient",
      validTestRecipient ? "complete" : "required",
      validTestRecipient
        ? "A valid recipient is available for controlled tests."
        : "Add a valid approved test-recipient email address.",
    ),
    check(
      "sending_domain",
      "Sending domain",
      domainReady
        ? "complete"
        : input.sendingDomainStatus === "failed" ||
            input.sendingDomainStatus === "disabled"
          ? "required"
          : "warning",
      domainReady
        ? "The customer-facing sending domain is verified."
        : input.sendingDomainStatus === "pending"
          ? "Finish DNS verification before live recovery."
          : "Configure and verify a sending domain before live recovery.",
    ),
    check(
      "webhook_health",
      "Stripe webhook health",
      webhookReady
        ? "complete"
        : input.webhookHealth === "failing"
          ? "required"
          : "warning",
      webhookReady
        ? "Stripe events are being received successfully."
        : input.webhookHealth === "failing"
          ? "Stripe webhook processing is failing and needs attention."
          : "Webhook health has not yet been confirmed recently.",
    ),
    check(
      "controlled_test",
      "Controlled recovery test",
      input.controlledTestCompleted ? "complete" : "warning",
      input.controlledTestCompleted
        ? "A controlled failed-payment journey has been verified."
        : "Complete a controlled test before enabling live recovery.",
    ),
    check(
      "stripe_communication_overlap",
      "Stripe communication overlap",
      input.stripeCommunicationOverlapReviewed ? "complete" : "warning",
      input.stripeCommunicationOverlapReviewed
        ? "Stripe and RevRecovery customer communications have been reviewed."
        : "Review Stripe's own failed-payment emails to avoid duplicate messages.",
    ),
  ];

  if (degraded) {
    return { checks, state: "attention_required" };
  }

  if (
    stripeReady &&
    recoveryReady &&
    identityReady &&
    validTestRecipient &&
    domainReady &&
    webhookReady &&
    input.controlledTestCompleted
  ) {
    return { checks, state: "ready_for_live" };
  }

  if (stripeReady && recoveryReady && identityReady && validTestRecipient) {
    return { checks, state: "ready_for_test" };
  }

  return { checks, state: "not_ready" };
}
