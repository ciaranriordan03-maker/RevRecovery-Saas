import type { EssentialNotificationRule } from "./essential-notification-policy";

const COOLDOWN_MINUTES: Record<EssentialNotificationRule["id"], number> = {
  attention_digest: 24 * 60,
  sending_domain_failure: 24 * 60,
  webhook_failure: 60,
};

export type RecoveryNotificationEventDraft = {
  cooldownUntil: string;
  deduplicationKey: string;
  deliveryEnabledSnapshot: false;
  fingerprint: string;
  occurredAt: string;
  recipientEmail: string;
  ruleId: EssentialNotificationRule["id"];
  status: "recorded";
};

function normalizeFingerprint(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9:_-]+/g, "-");
}

export function buildRecoveryNotificationEventDraft({
  fingerprint,
  occurredAt,
  recipientEmail,
  ruleId,
}: {
  fingerprint: string;
  occurredAt: string;
  recipientEmail: string;
  ruleId: EssentialNotificationRule["id"];
}): RecoveryNotificationEventDraft {
  const occurred = new Date(occurredAt);
  if (Number.isNaN(occurred.getTime())) {
    throw new Error("Notification event time is invalid.");
  }

  const normalizedFingerprint = normalizeFingerprint(fingerprint);
  if (!normalizedFingerprint) {
    throw new Error("Notification fingerprint is required.");
  }

  const cooldownMinutes = COOLDOWN_MINUTES[ruleId];
  const cooldownMilliseconds = cooldownMinutes * 60_000;
  const bucketStart = Math.floor(occurred.getTime() / cooldownMilliseconds) * cooldownMilliseconds;

  return {
    cooldownUntil: new Date(occurred.getTime() + cooldownMilliseconds).toISOString(),
    deduplicationKey: `${ruleId}:${normalizedFingerprint}:${new Date(bucketStart).toISOString()}`,
    deliveryEnabledSnapshot: false,
    fingerprint: normalizedFingerprint,
    occurredAt: occurred.toISOString(),
    recipientEmail,
    ruleId,
    status: "recorded",
  };
}
