export const RECOVERY_SCHEDULES = [
  {
    id: "legacy_24_72",
    label: "Immediate, 24 hours, 72 hours",
    offsetsMinutes: [0, 24 * 60, 72 * 60],
  },
  {
    id: "day_3_7",
    label: "Immediate, Day 3, Day 7",
    offsetsMinutes: [0, 3 * 24 * 60, 7 * 24 * 60],
  },
  {
    id: "day_2_5",
    label: "Immediate, Day 2, Day 5",
    offsetsMinutes: [0, 2 * 24 * 60, 5 * 24 * 60],
  },
  {
    id: "day_5_10",
    label: "Immediate, Day 5, Day 10",
    offsetsMinutes: [0, 5 * 24 * 60, 10 * 24 * 60],
  },
] as const;

export type RecoveryScheduleId = (typeof RECOVERY_SCHEDULES)[number]["id"];

export type RecoveryScheduleSnapshot = {
  offsetSemantics: "elapsed_minutes";
  offsetsMinutes: number[];
  policyVersion: number | null;
  scheduleId: RecoveryScheduleId;
  timezone: string;
};

export const DEFAULT_RECOVERY_SCHEDULE_ID: RecoveryScheduleId = "legacy_24_72";

export const RECOVERY_TIMEZONES = [
  "UTC",
  "Europe/Dublin",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Singapore",
  "Australia/Sydney",
] as const;

export function isRecoveryScheduleId(value: unknown): value is RecoveryScheduleId {
  return RECOVERY_SCHEDULES.some((schedule) => schedule.id === value);
}

export function isValidTimezone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function getRecoverySchedule(scheduleId: RecoveryScheduleId) {
  return RECOVERY_SCHEDULES.find((schedule) => schedule.id === scheduleId)!;
}

export function buildRecoveryScheduleSnapshot({
  policyVersion = null,
  scheduleId,
  timezone,
}: {
  policyVersion?: number | null;
  scheduleId: RecoveryScheduleId;
  timezone: string;
}): RecoveryScheduleSnapshot {
  const schedule = getRecoverySchedule(scheduleId);

  return {
    offsetSemantics: "elapsed_minutes",
    offsetsMinutes: [...schedule.offsetsMinutes],
    policyVersion,
    scheduleId,
    timezone,
  };
}

export function scheduleFromOffset(baseTimestamp: string, offsetMinutes: number) {
  const base = new Date(baseTimestamp);

  if (Number.isNaN(base.getTime())) {
    throw new Error("Recovery schedule anchor is invalid.");
  }

  return new Date(base.getTime() + offsetMinutes * 60_000).toISOString();
}
