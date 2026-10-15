import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../app/components/dashboard/essential-notification-preview.tsx", import.meta.url),
  "utf8",
);

describe("essential notification preview", () => {
  it("is visibly non-operational", () => {
    expect(source).toContain("Proposed alert policy");
    expect(source).toContain("Preview only");
    expect(source).toContain("Noise protection");
    expect(source).toContain("No notifications are enabled or sent");
    expect(source).toContain("Recorded preview events");
    expect(source).toContain("Preview only — nothing sent");
    expect(source).toContain("No preview events recorded yet");
    expect(source).toContain("Duplicates ignored until");
    expect(source).toContain("Delivery reconciliation");
    expect(source).toContain("No retry actions");
    expect(source).toContain("This view never retries a message or contacts the email provider.");
    expect(source).toContain("View audit evidence");
    expect(source).toContain("Evidence only. No resolution, retry, or provider action is available here.");
    expect(source).toContain("D4r · Reviewed resolution plan");
    expect(source).toContain("Policy preview only");
    expect(source).toContain("No resolution action is implemented or authorized by this preview.");
    expect(source).toContain("D4s · Reviewed request workflow");
    expect(source).toContain("Audit preview only");
    expect(source).toContain("No request action, approval action, retry, or provider contact is available in D4s.");
  });
});
