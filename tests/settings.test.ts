import { describe, expect, it } from "vitest";
import { defaultUserSettings, mergeUserSettings } from "../app/lib/settings";

describe("user settings", () => {
  it("uses RevRecovery for new sender settings", () => {
    expect(defaultUserSettings.email.senderName).toBe("RevRecovery");
  });

  it("upgrades the legacy RecoverFlow sender name without replacing custom names", () => {
    expect(
      mergeUserSettings({
        email: {
          ...defaultUserSettings.email,
          senderName: "RecoverFlow Team",
        },
      }).email.senderName,
    ).toBe("RevRecovery");

    expect(
      mergeUserSettings({
        email: {
          ...defaultUserSettings.email,
          senderName: "Acme Billing",
        },
      }).email.senderName,
    ).toBe("Acme Billing");
  });
});
