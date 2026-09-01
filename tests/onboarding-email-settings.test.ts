import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const onboardingSource = readFileSync(
  new URL("../app/components/onboarding/onboarding-flow.tsx", import.meta.url),
  "utf8",
);
const settingsRouteSource = readFileSync(
  new URL("../app/api/settings/route.ts", import.meta.url),
  "utf8",
);

describe("onboarding email identity", () => {
  it("collects and saves all customer-facing email identity fields", () => {
    expect(onboardingSource).toContain("Sender name");
    expect(onboardingSource).toContain("Reply-to email");
    expect(onboardingSource).toContain("Support email");
    expect(onboardingSource).toContain('method: "PATCH"');
    expect(onboardingSource).toContain("JSON.stringify({ email: emailSettings })");
  });

  it("prevents forward navigation when saving fails", () => {
    expect(onboardingSource).toContain("!(await saveEmailSettings())");
    expect(onboardingSource).toContain("setEmailSettingsError");
  });

  it("merges the email patch with the latest persisted settings", () => {
    expect(settingsRouteSource).toContain("export async function PATCH");
    expect(settingsRouteSource).toContain("const currentRecord = await getUserSettings(userId)");
    expect(settingsRouteSource).toContain("...currentRecord.settings");
    expect(settingsRouteSource).toContain("...currentRecord.settings.email");
  });
});
