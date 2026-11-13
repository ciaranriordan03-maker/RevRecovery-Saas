import { describe, expect, it } from "vitest";
import { projectCancellationSequence } from "../app/lib/cancellation-rescue/sequence-policy";

const detectedAt = "2026-11-13T10:00:00.000Z";
const projectedAt = "2026-11-13T10:00:00.000Z";

describe("cancellation rescue draft sequence policy", () => {
  it("creates three bounded drafts for a long cancellation window", () => {
    const projection = projectCancellationSequence({
      detectedAt,
      projectedAt,
      scheduledEndAt: "2026-11-23T10:00:00.000Z",
    });

    expect(projection.status).toBe("draft");
    expect(projection.messages.map((message) => message.scheduledFor)).toEqual([
      "2026-11-13T10:15:00.000Z",
      "2026-11-20T10:00:00.000Z",
      "2026-11-22T10:00:00.000Z",
    ]);
    expect(projection.messages.every((message) =>
      new Date(message.scheduledFor) < new Date("2026-11-23T10:00:00.000Z"),
    )).toBe(true);
  });

  it("collapses safely to two drafts when the window is short", () => {
    const projection = projectCancellationSequence({
      detectedAt,
      projectedAt,
      scheduledEndAt: "2026-11-15T10:00:00.000Z",
    });

    expect(projection.status).toBe("draft");
    expect(projection.messages.map((message) => message.scheduledFor)).toEqual([
      "2026-11-13T10:15:00.000Z",
      "2026-11-14T10:00:00.000Z",
    ]);
  });

  it("collapses to one draft when additional reminders cannot be spaced safely", () => {
    const projection = projectCancellationSequence({
      detectedAt,
      projectedAt,
      scheduledEndAt: "2026-11-13T22:00:00.000Z",
    });

    expect(projection.status).toBe("draft");
    expect(projection.messages).toHaveLength(1);
    expect(projection.messages[0].scheduledFor).toBe("2026-11-13T10:15:00.000Z");
  });

  it("does not schedule after a delayed projection or in the past", () => {
    const projection = projectCancellationSequence({
      detectedAt: "2026-11-01T10:00:00.000Z",
      projectedAt: "2026-11-13T10:00:00.000Z",
      scheduledEndAt: "2026-11-23T10:00:00.000Z",
    });

    expect(projection.status).toBe("draft");
    expect(projection.messages[0].scheduledFor).toBe("2026-11-13T10:15:00.000Z");
  });

  it("marks a case without a scheduled end ineligible", () => {
    expect(
      projectCancellationSequence({
        detectedAt,
        projectedAt,
        scheduledEndAt: null,
      }),
    ).toMatchObject({
      messages: [],
      reason: "missing_scheduled_end",
      status: "ineligible",
    });
  });

  it("marks an expired or extremely short window ineligible", () => {
    expect(
      projectCancellationSequence({
        detectedAt,
        projectedAt,
        scheduledEndAt: "2026-11-13T10:29:00.000Z",
      }),
    ).toMatchObject({
      messages: [],
      reason: "insufficient_window",
      status: "ineligible",
    });
  });

  it("produces a deterministic configuration and copy snapshot", () => {
    const first = projectCancellationSequence({
      detectedAt,
      projectedAt,
      scheduledEndAt: "2026-11-23T10:00:00.000Z",
    });
    const second = projectCancellationSequence({
      detectedAt,
      projectedAt,
      scheduledEndAt: "2026-11-23T10:00:00.000Z",
    });

    expect(first).toEqual(second);
    expect(first.configurationSnapshot).toMatchObject({
      copyVersion: "cancellation_rescue_draft_v1",
      policyVersion: 1,
      scheduleSemantics: "bounded_before_subscription_end",
    });
  });
});
