import { describe, expect, it } from "vitest";
import { stripeWebhookEventTypes } from "../app/lib/stripe/webhook-events";

describe("Stripe webhook event contract", () => {
  it("subscribes to every event handled by the webhook route", () => {
    expect(stripeWebhookEventTypes).toEqual([
      "account.application.deauthorized",
      "invoice.paid",
      "invoice.payment_failed",
      "invoice.payment_succeeded",
      "invoice.updated",
      "customer.subscription.deleted",
      "customer.subscription.updated",
      "payment_method.updated",
    ]);
  });
});
