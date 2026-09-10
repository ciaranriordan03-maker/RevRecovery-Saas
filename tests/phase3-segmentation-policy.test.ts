import { describe, expect, it } from "vitest";
import {
  defaultRecoverySegmentationSettings,
  getRecoveryAudienceSegment,
  getSegmentSchedule,
  normalizeRecoverySegmentationSettings,
} from "../app/lib/recovery/segmentation-policy";
import { buildRecoveryScheduleSnapshot } from "../app/lib/recovery/schedule-policy";

describe("Phase 3 recovery segmentation", () => {
  it("classifies invoice audiences deterministically", () => {
    expect(getRecoveryAudienceSegment("subscription")).toBe("subscription");
    expect(getRecoveryAudienceSegment("standalone")).toBe("standalone");
    expect(getRecoveryAudienceSegment(null)).toBe("unknown");
  });

  it("keeps the published account schedule while segmentation is disabled", () => {
    const fallback = buildRecoveryScheduleSnapshot({
      scheduleId: "day_3_7",
      timezone: "Europe/Dublin",
    });
    expect(getSegmentSchedule({
      fallback,
      segment: "subscription",
      settings: defaultRecoverySegmentationSettings,
    })).toEqual(fallback);
  });

  it("selects a persisted schedule for each enabled segment", () => {
    const fallback = buildRecoveryScheduleSnapshot({ scheduleId: "day_3_7", timezone: "UTC" });
    const settings = normalizeRecoverySegmentationSettings({
      enabled: true,
      standaloneScheduleId: "day_5_10",
      subscriptionScheduleId: "legacy_24_72",
      unknownScheduleId: "day_2_5",
    });
    expect(getSegmentSchedule({ fallback, segment: "subscription", settings }).scheduleId)
      .toBe("legacy_24_72");
    expect(getSegmentSchedule({ fallback, segment: "standalone", settings }).scheduleId)
      .toBe("day_5_10");
  });
});
