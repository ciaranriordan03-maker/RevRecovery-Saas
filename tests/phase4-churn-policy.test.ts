import { describe, expect, it } from "vitest";
import { decideSubscriptionChurn } from "../app/lib/retention/churn-policy";

const activeSubscription = {
  cancelAt: null,
  cancelAtPeriodEnd: false,
  canceledAt: null,
  cancellationReason: null,
  eventType: "customer.subscription.updated" as const,
  status: "active",
};

describe("Phase 4 voluntary churn policy", () => {
  it("detects a cancellation scheduled for the period end", () => {
    expect(
      decideSubscriptionChurn({
        ...activeSubscription,
        cancelAtPeriodEnd: true,
        cancellationReason: "cancellation_requested",
      }),
    ).toEqual({
      cancellationReason: "cancellation_requested",
      cancellationType: "scheduled",
      disposition: "cancellation_scheduled",
    });
  });

  it("detects a scheduled cancellation with an explicit cancel date", () => {
    expect(
      decideSubscriptionChurn({ ...activeSubscription, cancelAt: 1_800_000_000 }),
    ).toMatchObject({
      cancellationType: "scheduled",
      disposition: "cancellation_scheduled",
    });
  });

  it("recognizes active state so an open case can be reversed", () => {
    expect(decideSubscriptionChurn(activeSubscription).disposition).toBe("active");
  });

  it("records an immediate terminal cancellation", () => {
    expect(
      decideSubscriptionChurn({
        ...activeSubscription,
        eventType: "customer.subscription.deleted",
        status: "canceled",
      }),
    ).toMatchObject({
      cancellationType: "immediate",
      disposition: "canceled",
    });
  });

  it("does not misclassify payment failure or disputes as voluntary churn", () => {
    for (const cancellationReason of ["payment_failed", "payment_disputed"]) {
      expect(
        decideSubscriptionChurn({
          ...activeSubscription,
          cancellationReason,
          eventType: "customer.subscription.deleted",
          status: "canceled",
        }).disposition,
      ).toBe("ignored_nonvoluntary");
    }
  });
});

