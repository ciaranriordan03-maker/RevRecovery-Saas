import type { RecoveryModeSettings } from "../server/recovery-account-settings";
import type { UserSettings } from "../settings";
import { RECOVERY_MESSAGE_TEMPLATES } from "./message-templates";
import { getRecoverySchedule } from "./schedule-policy";

export type RecoveryFlowView = ReturnType<typeof buildRecoveryFlowView>;
export type RecoveryStatusSummary = ReturnType<typeof buildRecoveryStatusSummary>;

export function formatRecoveryOffset(offsetMinutes: number) {
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

export function buildRecoveryStatusSummary(
  recoverySettings: RecoveryModeSettings,
) {
  const schedule = getRecoverySchedule(recoverySettings.scheduleId);
  const timings = schedule.offsetsMinutes.map(formatRecoveryOffset);
  const scheduleDescription = `Your three-message schedule is ${schedule.label.toLowerCase()}.`;

  if (!recoverySettings.connected) {
    return {
      description:
        "Connect Stripe before RevRecovery can monitor failed payments or send recovery emails.",
      scheduleLabel: schedule.label,
      timings,
      title: "Connect Stripe to finish recovery setup",
    };
  }

  if (recoverySettings.mode === "test") {
    return {
      description: `${scheduleDescription} Messages go only to your approved test recipient.`,
      scheduleLabel: schedule.label,
      timings,
      title: "Recovery test mode is set up",
    };
  }

  if (recoverySettings.mode === "live") {
    return {
      description: `RevRecovery is monitoring Stripe. ${scheduleDescription}`,
      scheduleLabel: schedule.label,
      timings,
      title: "Recovery is set up and live",
    };
  }

  if (recoverySettings.mode === "paused") {
    return {
      description: `Your setup is preserved and no recovery emails are being sent. ${scheduleDescription}`,
      scheduleLabel: schedule.label,
      timings,
      title: "Recovery is safely paused",
    };
  }

  return {
    description: `Failed payments can be recorded, but recovery emails are not scheduled while recovery is off. ${scheduleDescription}`,
    scheduleLabel: schedule.label,
    timings,
    title: "Recovery monitoring is off",
  };
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
      timing: formatRecoveryOffset(schedule.offsetsMinutes[index] ?? 0),
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
