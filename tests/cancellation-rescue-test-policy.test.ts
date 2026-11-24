import { describe, expect, it } from "vitest";
import {
  evaluateCancellationTestRescueSubscription,
  type CancellationTestRescueSubscription,
} from "../app/lib/cancellation-rescue/test-rescue-policy";

const now = 1_800_000_000;
const eligibleSubscription = {
  cancelAtPeriodEnd: true,
  livemode: false,
  scheduledEndEpochSeconds: now + 3600,
  status: "active",
  stripeCustomerId: "cus_test",
  stripeSubscriptionId: "sub_test",
};

function evaluate(overrides: Partial<CancellationTestRescueSubscription> = {}) {
  return evaluateCancellationTestRescueSubscription({
    expectedCustomerId: "cus_test",
    expectedSubscriptionId: "sub_test",
    nowEpochSeconds: now,
    subscription: { ...eligibleSubscription, ...overrides },
  });
}

describe("cancellation test rescue policy", () => {
  it("allows an eligible scheduled test subscription", () => {
    expect(evaluate()).toEqual({ eligible: true });
  });

  it.each(["active", "past_due", "trialing", "unpaid"])(
    "allows supported status %s",
    (status) => {
      expect(evaluate({ status })).toEqual({ eligible: true });
    },
  );

  it("fails closed for live mode, mismatched ownership, or changed state", () => {
    expect(evaluate({ livemode: true })).toEqual({
      eligible: false,
      reason: "environment_mismatch",
    });
    expect(evaluate({ stripeCustomerId: "cus_other" })).toEqual({
      eligible: false,
      reason: "customer_mismatch",
    });
    expect(evaluate({ stripeSubscriptionId: "sub_other" })).toEqual({
      eligible: false,
      reason: "subscription_mismatch",
    });
    expect(evaluate({ cancelAtPeriodEnd: false })).toEqual({
      eligible: false,
      reason: "not_scheduled_for_cancellation",
    });
  });

  it("rejects ended, undated, and unsupported subscriptions", () => {
    expect(evaluate({ scheduledEndEpochSeconds: now })).toEqual({
      eligible: false,
      reason: "invalid_scheduled_end",
    });
    expect(evaluate({ scheduledEndEpochSeconds: null })).toEqual({
      eligible: false,
      reason: "invalid_scheduled_end",
    });
    expect(evaluate({ status: "canceled" })).toEqual({
      eligible: false,
      reason: "subscription_status_not_supported",
    });
  });
});
