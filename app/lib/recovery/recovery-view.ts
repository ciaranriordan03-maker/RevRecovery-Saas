import type { RecoveryModeSettings } from "../server/recovery-account-settings";
import type { UserSettings } from "../settings";
import { RECOVERY_MESSAGE_TEMPLATES } from "./message-templates";
import { getRecoverySchedule } from "./schedule-policy";

export type RecoveryFlowView = ReturnType<typeof buildRecoveryFlowView>;

function formatOffset(offsetMinutes: number) {
  if (offsetMinutes === 0) {
    return "Immediately";
  }

  if (offsetMinutes % (24 * 60) === 0) {
    const days = offsetMinutes / (24 * 60);
    return days === 1 ? "After 1 day" : `After ${days} days`;
  }

  if (offsetMinutes % 60 === 0) {
    const hours = offsetMinutes / 60;
    return hours === 1 ? "After 1 hour" : `After ${hours} hours`;
  }

  return `After ${offsetMinutes} minutes`;
}

export function buildRecoveryFlowView(
  userSettings: UserSettings,
  recoverySettings: RecoveryModeSettings,
) {
  const schedule = getRecoverySchedule(recoverySettings.scheduleId);

  return {
    approvedTestRecipient: recoverySettings.approvedTestRecipient,
    audience: "All failed-payment customers",
    connected: recoverySettings.connected,
    editable: recoverySettings.editable,
    environment:
      recoverySettings.livemode === null
        ? "Not connected"
        : recoverySettings.livemode
          ? "Live Stripe data"
          : "Stripe sandbox data",
    messages: RECOVERY_MESSAGE_TEMPLATES.map((template, index) => ({
      ...template,
      timing: formatOffset(schedule.offsetsMinutes[index] ?? 0),
    })),
    mode: recoverySettings.mode,
    replyToEmail: userSettings.email.replyToEmail || "Not configured",
    scheduleId: recoverySettings.scheduleId,
    scheduleLabel: schedule.label,
    senderName: userSettings.email.senderName,
    supportEmail: userSettings.email.supportEmail || "Not configured",
    timezone: recoverySettings.timezone,
    tone: userSettings.recovery.defaultEmailTone,
  };
}
