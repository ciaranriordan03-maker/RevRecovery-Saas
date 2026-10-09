import { describe, expect, it } from "vitest";
import { classifyWebhookHealth } from "../app/lib/server/activation-readiness";

describe("activation readiness server evidence", () => {
  const now = new Date("2026-09-23T12:00:00.000Z");

  it("classifies recent completed webhook processing as healthy", () => {
    expect(
      classifyWebhookHealth(
        { created_at: "2026-09-23T11:00:00.000Z", status: "processed" },
        now,
      ),
    ).toBe("healthy");
  });

  it("does not claim health when evidence is absent or stale", () => {
    expect(classifyWebhookHealth(null, now)).toBe("unknown");
    expect(
      classifyWebhookHealth(
        { created_at: "2026-09-01T11:00:00.000Z", status: "processed" },
        now,
      ),
    ).toBe("stale");
  });

  it("surfaces a failed webhook immediately", () => {
    expect(
      classifyWebhookHealth(
        { created_at: "2026-09-23T11:00:00.000Z", status: "failed" },
        now,
      ),
    ).toBe("failing");
  });
});
