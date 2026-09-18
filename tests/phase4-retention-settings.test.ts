import { describe, expect, it } from "vitest";
import {
  RetentionSettingsInputError,
  validateRetentionSettingsInput,
} from "../app/lib/retention/settings-policy";

describe("Phase 4 retention settings validation", () => {
  it("normalizes safe, explicitly enabled actions", () => {
    expect(
      validateRetentionSettingsInput({
        downgradeActionEnabled: true,
        eligibleDowngradePriceIds: [" price_basic ", "price_basic", "price_starter"],
        pauseActionEnabled: true,
        supportActionEnabled: true,
        supportContactEmail: " SUPPORT@EXAMPLE.COM ",
      }),
    ).toEqual({
      downgradeActionEnabled: true,
      eligibleDowngradePriceIds: ["price_basic", "price_starter"],
      pauseActionEnabled: true,
      supportActionEnabled: true,
      supportContactEmail: "support@example.com",
    });
  });

  it("requires configuration before enabling support or downgrade actions", () => {
    expect(() =>
      validateRetentionSettingsInput({
        downgradeActionEnabled: false,
        eligibleDowngradePriceIds: [],
        pauseActionEnabled: false,
        supportActionEnabled: true,
        supportContactEmail: "",
      }),
    ).toThrowError(RetentionSettingsInputError);

    expect(() =>
      validateRetentionSettingsInput({
        downgradeActionEnabled: true,
        eligibleDowngradePriceIds: [],
        pauseActionEnabled: false,
        supportActionEnabled: false,
        supportContactEmail: null,
      }),
    ).toThrow("Add an eligible Stripe price");
  });

  it("rejects malformed price IDs and non-boolean action flags", () => {
    expect(() =>
      validateRetentionSettingsInput({
        downgradeActionEnabled: false,
        eligibleDowngradePriceIds: ["prod_not_a_price"],
        pauseActionEnabled: false,
        supportActionEnabled: false,
        supportContactEmail: null,
      }),
    ).toThrow("valid Stripe price IDs");

    expect(() =>
      validateRetentionSettingsInput({
        downgradeActionEnabled: false,
        eligibleDowngradePriceIds: [],
        pauseActionEnabled: "yes",
        supportActionEnabled: false,
        supportContactEmail: null,
      }),
    ).toThrow("Pause actions must be enabled or disabled");
  });
});
