import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../app/components/dashboard/settings-content.tsx", import.meta.url),
  "utf8",
);

describe("settings content truthfulness", () => {
  it("shows the recovery preference that is actually used by delivery", () => {
    expect(source).toContain("Default Email Tone");
    expect(source).toContain("settings.recovery.defaultEmailTone");
  });

  it("does not promise unsupported payment retries or customer prioritization", () => {
    expect(source).not.toContain("Payment Retry Attempts");
    expect(source).not.toContain("paymentRetryOptions");
    expect(source).not.toContain("Prioritize high-value customers");
    expect(source).not.toContain("Send recovery emails within 1 hour");
  });
});
