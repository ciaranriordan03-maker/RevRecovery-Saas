import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import {
  decideCancellationEvent,
  getCancellationSubscriptionSnapshot,
} from "../app/lib/cancellation-rescue/state";

function subscription(
  overrides: Record<string, unknown> = {},
): Stripe.Subscription {
  return {
    id: "sub_123",
    cancel_at: 1_800_000_000,
    cancel_at_period_end: true,
    canceled_at: 1_799_000_000,
    cancellation_details: {
      comment: "Temporary budget pressure",
      feedback: "too_expensive",
      reason: "cancellation_requested",
    },
    created: 1_700_000_000,
    currency: "eur",
    current_period_end: 1_800_000_000,
    customer: "cus_123",
    items: {
      data: [
        {
          price: {
            billing_scheme: "per_unit",
            currency: "eur",
            recurring: { interval: "month", interval_count: 1 },
            unit_amount: 7900,
          },
          quantity: 1,
        },
      ],
    },
    status: "active",
    ...overrides,
  } as unknown as Stripe.Subscription;
}

describe("cancellation rescue state policy", () => {
  it("creates the first episode when cancellation is scheduled", () => {
    expect(
      decideCancellationEvent({
        cancelAtPeriodEnd: true,
        caseIsOpen: false,
        eventCreatedAt: "2026-11-13T10:00:00.000Z",
        eventType: "customer.subscription.updated",
        lastEventCreatedAt: null,
        previousCancelAtPeriodEnd: false,
      }),
    ).toBe("create_episode");
  });

  it("updates rather than duplicates a repeated scheduled cancellation", () => {
    expect(
      decideCancellationEvent({
        cancelAtPeriodEnd: true,
        caseIsOpen: true,
        eventCreatedAt: "2026-11-13T11:00:00.000Z",
        eventType: "customer.subscription.updated",
        lastEventCreatedAt: "2026-11-13T10:00:00.000Z",
        previousCancelAtPeriodEnd: true,
      }),
    ).toBe("update_episode");
  });

  it("reverses an open episode when Stripe returns to false", () => {
    expect(
      decideCancellationEvent({
        cancelAtPeriodEnd: false,
        caseIsOpen: true,
        eventCreatedAt: "2026-11-13T11:00:00.000Z",
        eventType: "customer.subscription.updated",
        lastEventCreatedAt: "2026-11-13T10:00:00.000Z",
        previousCancelAtPeriodEnd: true,
      }),
    ).toBe("reverse_episode");
  });

  it("creates a new episode after a prior reversal", () => {
    expect(
      decideCancellationEvent({
        cancelAtPeriodEnd: true,
        caseIsOpen: false,
        eventCreatedAt: "2026-11-14T10:00:00.000Z",
        eventType: "customer.subscription.updated",
        lastEventCreatedAt: "2026-11-13T11:00:00.000Z",
        previousCancelAtPeriodEnd: false,
      }),
    ).toBe("create_episode");
  });

  it("terminates an open episode when Stripe deletes the subscription", () => {
    expect(
      decideCancellationEvent({
        cancelAtPeriodEnd: false,
        caseIsOpen: true,
        eventCreatedAt: "2026-11-14T10:00:00.000Z",
        eventType: "customer.subscription.deleted",
        lastEventCreatedAt: "2026-11-13T11:00:00.000Z",
        previousCancelAtPeriodEnd: true,
      }),
    ).toBe("terminate_episode");
  });

  it("ignores an older out-of-order event", () => {
    expect(
      decideCancellationEvent({
        cancelAtPeriodEnd: true,
        caseIsOpen: false,
        eventCreatedAt: "2026-11-13T09:59:59.000Z",
        eventType: "customer.subscription.updated",
        lastEventCreatedAt: "2026-11-13T10:00:00.000Z",
        previousCancelAtPeriodEnd: false,
      }),
    ).toBe("ignore_stale");
  });

  it("retains supported evidence and a conservative recurring list price", () => {
    expect(getCancellationSubscriptionSnapshot(subscription())).toEqual({
      cancelAt: "2027-01-15T08:00:00.000Z",
      cancelAtPeriodEnd: true,
      canceledAt: "2027-01-03T18:13:20.000Z",
      cancellationComment: "Temporary budget pressure",
      cancellationFeedback: "too_expensive",
      cancellationReason: "cancellation_requested",
      currency: "eur",
      currentPeriodEnd: "2027-01-15T08:00:00.000Z",
      recurringInterval: "month",
      recurringIntervalCount: 1,
      recurringValueCents: 7900,
      recurringValueSource: "subscription_items_list_price",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      subscriptionStatus: "active",
    });
  });

  it("does not fabricate value for mixed currencies or unsupported pricing", () => {
    const snapshot = getCancellationSubscriptionSnapshot(
      subscription({
        items: {
          data: [
            {
              price: {
                billing_scheme: "per_unit",
                currency: "eur",
                recurring: { interval: "month", interval_count: 1 },
                unit_amount: 7900,
              },
              quantity: 1,
            },
            {
              price: {
                billing_scheme: "per_unit",
                currency: "usd",
                recurring: { interval: "month", interval_count: 1 },
                unit_amount: 1000,
              },
              quantity: 1,
            },
          ],
        },
      }),
    );

    expect(snapshot.currency).toBeNull();
    expect(snapshot.recurringValueCents).toBeNull();
    expect(snapshot.recurringValueSource).toBeNull();
  });

  it("handles missing customer and cancellation dates without inventing them", () => {
    const snapshot = getCancellationSubscriptionSnapshot(
      subscription({ cancel_at: null, current_period_end: null, customer: null }),
    );

    expect(snapshot.stripeCustomerId).toBeNull();
    expect(snapshot.cancelAt).toBeNull();
    expect(snapshot.currentPeriodEnd).toBeNull();
  });
});
