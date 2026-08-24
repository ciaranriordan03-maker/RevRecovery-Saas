import type Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildMessageCopy,
  buildRecoveryEmailVariables,
  getHostedInvoiceUrl,
  getRecoveryEmailFrom,
} from "../app/lib/server/recovery-delivery";

function invoice(overrides: Partial<Stripe.Invoice> = {}) {
  return {
    amount_due: 2000,
    customer_email: "customer@example.com",
    hosted_invoice_url: "https://invoice.stripe.com/i/test_invoice",
    id: "in_test",
    ...overrides,
  } as Stripe.Invoice;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("recovery email delivery", () => {
  it("uses Stripe's hosted invoice page for the customer action", () => {
    const variables = buildRecoveryEmailVariables({
      amountDue: 2000,
      currency: "usd",
      latestInvoice: invoice(),
      originalPayload: invoice(),
    });
    const copy = buildMessageCopy(1, "Friendly", variables);

    expect(variables.portalUrl).toBe(
      "https://invoice.stripe.com/i/test_invoice",
    );
    expect(copy.html).toContain(variables.portalUrl);
    expect(copy.text).toContain(variables.portalUrl);
    expect(copy.html).not.toContain("/dashboard/recovery");
  });

  it("refuses to send when Stripe has not provided a hosted invoice page", () => {
    expect(() =>
      buildRecoveryEmailVariables({
        amountDue: 2000,
        currency: "usd",
        latestInvoice: invoice({ hosted_invoice_url: null }),
        originalPayload: invoice({ hosted_invoice_url: null }),
      }),
    ).toThrow("secure hosted invoice URL");
  });

  it("rejects non-Stripe and non-HTTPS invoice links", () => {
    expect(
      getHostedInvoiceUrl(
        invoice({ hosted_invoice_url: "https://example.com/pay" }),
      ),
    ).toBeNull();
    expect(
      getHostedInvoiceUrl(
        invoice({ hosted_invoice_url: "http://invoice.stripe.com/i/test" }),
      ),
    ).toBeNull();
  });

  it("normalizes the legacy RecoverFlow sender name", () => {
    vi.stubEnv(
      "RECOVERY_EMAIL_FROM",
      "RecoverFlow <recoveries@revrecovery.io>",
    );

    expect(getRecoveryEmailFrom()).toBe(
      "RevRecovery <recoveries@revrecovery.io>",
    );
  });
});
