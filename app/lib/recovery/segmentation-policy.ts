import {
  buildRecoveryScheduleSnapshot,
  isRecoveryScheduleId,
  type RecoveryScheduleId,
  type RecoveryScheduleSnapshot,
} from "./schedule-policy";

export const RECOVERY_AUDIENCE_SEGMENTS = [
  "subscription",
  "standalone",
  "unknown",
] as const;

export type RecoveryAudienceSegment = (typeof RECOVERY_AUDIENCE_SEGMENTS)[number];

export type RecoverySegmentationSettings = {
  enabled: boolean;
  standaloneScheduleId: RecoveryScheduleId;
  subscriptionScheduleId: RecoveryScheduleId;
  unknownScheduleId: RecoveryScheduleId;
};

export const defaultRecoverySegmentationSettings: RecoverySegmentationSettings = {
  enabled: false,
  standaloneScheduleId: "day_5_10",
  subscriptionScheduleId: "legacy_24_72",
  unknownScheduleId: "day_3_7",
};

export function normalizeRecoverySegmentationSettings(
  source: Partial<RecoverySegmentationSettings> | null | undefined,
): RecoverySegmentationSettings {
  return {
    enabled: source?.enabled === true,
    standaloneScheduleId: isRecoveryScheduleId(source?.standaloneScheduleId)
      ? source.standaloneScheduleId
      : defaultRecoverySegmentationSettings.standaloneScheduleId,
    subscriptionScheduleId: isRecoveryScheduleId(source?.subscriptionScheduleId)
      ? source.subscriptionScheduleId
      : defaultRecoverySegmentationSettings.subscriptionScheduleId,
    unknownScheduleId: isRecoveryScheduleId(source?.unknownScheduleId)
      ? source.unknownScheduleId
      : defaultRecoverySegmentationSettings.unknownScheduleId,
  };
}

export function getRecoveryAudienceSegment(
  invoiceKind: string | null | undefined,
): RecoveryAudienceSegment {
  if (invoiceKind === "subscription") return "subscription";
  if (invoiceKind === "standalone") return "standalone";
  return "unknown";
}

export function getSegmentSchedule({
  fallback,
  segment,
  settings,
}: {
  fallback: RecoveryScheduleSnapshot;
  segment: RecoveryAudienceSegment;
  settings: RecoverySegmentationSettings;
}) {
  if (!settings.enabled) return fallback;

  const scheduleIdBySegment: Record<RecoveryAudienceSegment, RecoveryScheduleId> = {
    standalone: settings.standaloneScheduleId,
    subscription: settings.subscriptionScheduleId,
    unknown: settings.unknownScheduleId,
  };

  return buildRecoveryScheduleSnapshot({
    scheduleId: scheduleIdBySegment[segment],
    timezone: fallback.timezone,
  });
}
