import { describe, expect, it } from "vitest";
import { buildEssentialNotificationPreview } from "../app/lib/recovery/essential-notification-policy";

describe("essential notification policy", () => {
  const preview = buildEssentialNotificationPreview("owner@example.com");

  it("uses only three high-signal rules", () => {
    expect(preview.rules.map((rule) => rule.id)).toEqual([
      "webhook_failure",
      "sending_domain_failure",
      "attention_digest",
    ]);
  });

  it("defines cooldowns for every proposed alert", () => {
    expect(preview.rules.every((rule) => rule.cooldownLabel.length > 0)).toBe(true);
  });

  it("avoids noisy per-payment alerts", () => {
    expect(preview.exclusions).toContain("No alert for every failed payment.");
    expect(preview.exclusions).toContain("No alert for every recovered payment.");
  });

  it("shows the account owner as the proposed recipient", () => {
    expect(preview.recipient).toBe("owner@example.com");
  });
});
