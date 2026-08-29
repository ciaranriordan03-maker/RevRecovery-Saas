import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import {
  decideInvoiceEvent,
  getInvoiceKind,
  getInvoicePaymentContext,
} from "../app/lib/stripe/recovery-state";

describe("Stripe recovery event policy", () => {
  it("only creates a case for invoice.payment_failed", () => {
    expect(decideInvoiceEvent("invoice.payment_failed", "open", false)).toMatchObject({
      createsCase: true,
      targetStatus: "active",
    });
    expect(decideInvoiceEvent("invoice.updated", "open", false)).toEqual({
      createsCase: false,
      targetStatus: null,
      terminalReason: null,
    });
    expect(decideInvoiceEvent("invoice.paid", "paid", false).createsCase).toBe(false);
  });

  it("reconciles existing cases without treating ordinary invoices as failures", () => {
    expect(decideInvoiceEvent("invoice.updated", "open", true).targetStatus).toBe(
      null,
    );
    expect(decideInvoiceEvent("invoice.updated", "paid", true).targetStatus).toBe(
      "recovered",
    );
  });

  it("recognizes void and uncollectible invoices as no longer applicable", () => {
    expect(decideInvoiceEvent("invoice.updated", "void", true)).toMatchObject({
      targetStatus: "no_longer_applicable",
      terminalReason: "invoice_void",
    });
    expect(decideInvoiceEvent("invoice.updated", "uncollectible", true)).toMatchObject({
      targetStatus: "no_longer_applicable",
      terminalReason: "invoice_uncollectible",
    });
  });

  it("resolves existing cases from both Stripe success events", () => {
    expect(decideInvoiceEvent("invoice.paid", "paid", true).targetStatus).toBe(
      "recovered",
    );
    expect(
      decideInvoiceEvent("invoice.payment_succeeded", "paid", true).targetStatus,
    ).toBe("recovered");
  });

  it("classifies recurring and standalone invoices", () => {
    expect(getInvoiceKind({ subscription: "sub_123" } as unknown as Stripe.Invoice)).toBe(
      "subscription",
    );
    expect(getInvoiceKind({} as Stripe.Invoice)).toBe("standalone");
  });

  it("retains PaymentIntent, charge, and normalized failure context when expanded", () => {
    const context = getInvoicePaymentContext({
      payment_intent: {
        id: "pi_123",
        latest_charge: "ch_123",
        last_payment_error: {
          code: "card_declined",
          decline_code: "insufficient_funds",
          message: "The card has insufficient funds.",
        },
      },
    } as unknown as Stripe.Invoice);

    expect(context).toEqual({
      declineCode: "insufficient_funds",
      failureCode: "card_declined",
      failureMessage: "The card has insufficient funds.",
      stripeChargeId: "ch_123",
      stripePaymentIntentId: "pi_123",
    });
  });
});
