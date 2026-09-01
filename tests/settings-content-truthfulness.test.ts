import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../app/components/dashboard/settings-content.tsx", import.meta.url),
  "utf8",
);

describe("settings content truthfulness", () => {
  it("keeps recovery configuration editing in the Recovery workspace", () => {
    expect(source).toContain('title="Recovery Configuration"');
    expect(source).toContain('href="/dashboard/recovery?step=customize"');
    expect(source).toContain("Customize recovery");
    expect(source).toContain("settings.recovery.defaultEmailTone");
    expect(source).toContain("settings.email.senderName");
    expect(source).toContain("getRecoverySchedule");
    expect(source).not.toContain("Save Recovery Delivery");
    expect(source).not.toContain('title="Email Settings"');
    expect(source).not.toContain('title="Recovery Preferences"');
  });

  it("does not promise unsupported payment retries or customer prioritization", () => {
    expect(source).not.toContain("Payment Retry Attempts");
    expect(source).not.toContain("paymentRetryOptions");
    expect(source).not.toContain("Prioritize high-value customers");
    expect(source).not.toContain("Send recovery emails within 1 hour");
  });

  it("does not present stored team metadata as a working invitation system", () => {
    expect(source).not.toContain('title="Team Members"');
    expect(source).not.toContain("Invite Member");
    expect(source).not.toContain("addTeamMember");
    expect(source).not.toContain("updateMemberRole");
  });

  it("does not present stored notification preferences as working alerts", () => {
    expect(source).not.toContain('title="Notifications"');
    expect(source).not.toContain("Failed Payment Alerts");
    expect(source).not.toContain("Recovered Revenue Alerts");
    expect(source).not.toContain("Weekly Summary Emails");
    expect(source).not.toContain("Optimization Suggestions");
  });
});
