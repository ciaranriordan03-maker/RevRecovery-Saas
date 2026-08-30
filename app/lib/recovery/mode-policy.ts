export const RECOVERY_MODES = ["off", "test", "live", "paused"] as const;

export type RecoveryMode = (typeof RECOVERY_MODES)[number];

export function isRecoveryMode(value: unknown): value is RecoveryMode {
  return typeof value === "string" && RECOVERY_MODES.includes(value as RecoveryMode);
}

export function isRecoveryDeliveryKillSwitchEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export function canScheduleRecoveryMessages(mode: RecoveryMode) {
  return mode !== "off";
}

export function getRecoveryDeliveryRecipient({
  approvedTestRecipient,
  customerRecipient,
  mode,
}: {
  approvedTestRecipient: string | null;
  customerRecipient: string | null;
  mode: RecoveryMode;
}) {
  if (mode === "test") {
    return approvedTestRecipient?.trim() || null;
  }

  if (mode === "live") {
    return customerRecipient?.trim() || null;
  }

  return null;
}
