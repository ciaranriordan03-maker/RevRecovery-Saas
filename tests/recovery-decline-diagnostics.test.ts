import { describe, expect, it } from "vitest";
import { getRecoveryDeclineDiagnostic } from "../app/lib/recovery/decline-diagnostics";

describe("recovery decline diagnostics", () => {
  it("prioritizes a specific Stripe decline code over a generic failure code", () => {
    const diagnostic = getRecoveryDeclineDiagnostic({
      declineCode: "insufficient_funds",
      failureCode: "card_declined",
      failureMessage: "The card has insufficient funds.",
    });

    expect(diagnostic).toMatchObject({
      category: "insufficient_funds",
      confidence: "high",
      rawDeclineCode: "insufficient_funds",
      rawFailureCode: "card_declined",
      source: "decline_code",
      title: "Insufficient funds",
    });
  });

  it.each([
    ["expired_card", "expired_card"],
    ["incorrect_cvc", "card_details"],
    ["authentication_required", "authentication_required"],
    ["processing_error", "processing_error"],
  ] as const)("classifies the %s Stripe failure code", (failureCode, category) => {
    expect(getRecoveryDeclineDiagnostic({ failureCode }).category).toBe(category);
  });

  it.each([
    ["lost_card", "fraud_or_security"],
    ["stolen_card", "fraud_or_security"],
    ["transaction_not_allowed", "not_permitted"],
    ["generic_decline", "generic_decline"],
    ["try_again_later", "processing_error"],
  ] as const)("classifies the %s Stripe decline code", (declineCode, category) => {
    expect(getRecoveryDeclineDiagnostic({ declineCode }).category).toBe(category);
  });

  it("does not claim fraud occurred for a security-related decline", () => {
    const diagnostic = getRecoveryDeclineDiagnostic({ declineCode: "lost_card" });

    expect(diagnostic.title).toBe("Security-related decline");
    expect(diagnostic.explanation.toLowerCase()).not.toContain("fraud occurred");
    expect(diagnostic.merchantAction).toContain("Avoid stating that fraud occurred");
  });

  it("keeps unknown Stripe codes visible without guessing", () => {
    const diagnostic = getRecoveryDeclineDiagnostic({
      declineCode: "future_network_code",
      failureCode: "future_failure_code",
      failureMessage: "Issuer response unavailable.",
    });

    expect(diagnostic).toMatchObject({
      category: "unknown",
      confidence: "unknown",
      rawDeclineCode: "future_network_code",
      rawFailureCode: "future_failure_code",
      rawMessage: "Issuer response unavailable.",
      source: "unavailable",
      title: "Failure reason not provided",
    });
  });

  it("handles legacy cases with no failure facts", () => {
    expect(getRecoveryDeclineDiagnostic({})).toMatchObject({
      category: "unknown",
      rawDeclineCode: null,
      rawFailureCode: null,
      rawMessage: null,
      source: "unavailable",
    });
  });

  it("normalizes code whitespace and casing but preserves the Stripe message", () => {
    expect(getRecoveryDeclineDiagnostic({
      declineCode: "  INSUFFICIENT_FUNDS ",
      failureMessage: "  Bank supplied context.  ",
    })).toMatchObject({
      category: "insufficient_funds",
      rawDeclineCode: "insufficient_funds",
      rawMessage: "Bank supplied context.",
    });
  });
});
