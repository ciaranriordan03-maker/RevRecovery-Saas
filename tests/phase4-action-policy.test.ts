import { describe, expect, it } from "vitest";
import { recommendRetentionActions } from "../app/lib/retention/action-policy";

const allActionsAvailable = {
  downgradePlanIds: ["price_lower"],
  pauseSupported: true,
  supportAvailable: true,
};

describe("Phase 4 deterministic retention action policy", () => {
  it("recommends a downgrade before pause for price objections", () => {
    expect(
      recommendRetentionActions({
        availability: allActionsAvailable,
        reason: "too_expensive",
      }).map(({ action }) => action),
    ).toEqual(["downgrade", "pause", "continue_canceling"]);
  });

  it("recommends support for resolvable product and billing problems", () => {
    for (const reason of [
      "billing_issues",
      "missing_features",
      "support_issues",
      "technical_issues",
    ] as const) {
      expect(
        recommendRetentionActions({
          availability: allActionsAvailable,
          reason,
        })[0]?.action,
      ).toBe("support");
    }
  });

  it("does not present unavailable actions", () => {
    expect(
      recommendRetentionActions({
        availability: {
          downgradePlanIds: [],
          pauseSupported: false,
          supportAvailable: false,
        },
        reason: "too_expensive",
      }).map(({ action }) => action),
    ).toEqual(["continue_canceling"]);
  });

  it("always keeps continue canceling available", () => {
    for (const reason of ["business_closed", "prefer_not_to_say"] as const) {
      expect(
        recommendRetentionActions({
          availability: allActionsAvailable,
          reason,
        }),
      ).toEqual([
        expect.objectContaining({ action: "continue_canceling" }),
      ]);
    }
  });
});
