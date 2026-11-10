import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(
  new URL("../app/components/dashboard/recovery-workspace.tsx", import.meta.url),
  "utf8",
);
const settings = readFileSync(
  new URL("../app/components/dashboard/settings-content.tsx", import.meta.url),
  "utf8",
);
const accountAlerts = readFileSync(
  new URL(
    "../app/components/dashboard/notification-test-recipient-settings.tsx",
    import.meta.url,
  ),
  "utf8",
);
const content = readFileSync(
  new URL("../app/components/dashboard/recovery-content.tsx", import.meta.url),
  "utf8",
);
const pageData = readFileSync(
  new URL("../app/lib/server/recovery-page-data.ts", import.meta.url),
  "utf8",
);

describe("Account alert settings", () => {
  it("keeps Recovery focused and places operational alerts in Settings", () => {
    expect(workspace).not.toContain("Account alerts");
    expect(workspace).not.toContain('view=notifications');
    expect(content).not.toContain("NotificationsWorkspace");
    expect(content).not.toContain('title="Notifications"');
    expect(pageData).not.toContain('value === "notifications"');
    expect(settings).toContain('id="account-alerts"');
    expect(settings).toContain('title="Account alerts"');
    expect(settings).toContain("AccountAlertsSettings");
  });

  it("uses honest states and does not expose an activation control", () => {
    expect(accountAlerts).toContain("Not configured");
    expect(accountAlerts).toContain("Ready but disabled");
    expect(accountAlerts).toContain("Test alerts active");
    expect(accountAlerts).toContain("Needs attention");
    expect(accountAlerts).toContain("No account alerts are being delivered");
    expect(accountAlerts).not.toContain("Enable alerts");
  });

  it("keeps the three supported alert categories understandable", () => {
    expect(accountAlerts).toContain("Stripe connection or event-processing problems");
    expect(accountAlerts).toContain("Sending-domain problems that may affect recovery");
    expect(accountAlerts).toContain("A daily summary when recovery cases need personal attention");
  });

  it("uses the existing recipient API without exposing technical authorization UI", () => {
    expect(accountAlerts).toContain('/api/recovery/notifications/test-recipient');
    expect(accountAlerts).toContain("Review alert settings");
    expect(accountAlerts).toContain("Approve recipient");
    expect(accountAlerts).not.toContain("quarantine");
    expect(accountAlerts).not.toContain("authorization");
  });
});
