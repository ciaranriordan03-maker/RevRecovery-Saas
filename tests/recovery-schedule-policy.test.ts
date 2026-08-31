import { describe, expect, it } from "vitest";
import {
  buildRecoveryScheduleSnapshot,
  getRecoverySchedule,
  isRecoveryScheduleId,
  isValidTimezone,
  scheduleFromOffset,
} from "../app/lib/recovery/schedule-policy";

describe("recovery schedule policy", () => {
  it("defines canonical elapsed-minute offsets", () => {
    expect(getRecoverySchedule("legacy_24_72").offsetsMinutes).toEqual([0, 1440, 4320]);
    expect(getRecoverySchedule("day_3_7").offsetsMinutes).toEqual([0, 4320, 10080]);
  });

  it("validates schedule identifiers and IANA timezones", () => {
    expect(isRecoveryScheduleId("day_2_5")).toBe(true);
    expect(isRecoveryScheduleId("custom")).toBe(false);
    expect(isValidTimezone("Europe/Dublin")).toBe(true);
    expect(isValidTimezone("Dublin")).toBe(false);
  });

  it("snapshots schedule configuration without sharing mutable offsets", () => {
    const snapshot = buildRecoveryScheduleSnapshot({
      policyVersion: 3,
      scheduleId: "day_5_10",
      timezone: "Europe/Dublin",
    });

    snapshot.offsetsMinutes[1] = 1;
    expect(getRecoverySchedule("day_5_10").offsetsMinutes[1]).toBe(7200);
  });

  it("uses elapsed time rather than local clock arithmetic", () => {
    expect(scheduleFromOffset("2026-03-29T00:30:00.000Z", 1440)).toBe(
      "2026-03-30T00:30:00.000Z",
    );
  });
});
