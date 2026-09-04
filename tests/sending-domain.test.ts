import { describe, expect, it } from "vitest";
import {
  canTransitionSendingDomainStatus,
  getSendingDomainValidationError,
  isSendingDomainEligibleForDelivery,
  normalizeSendingDomain,
} from "../app/lib/email/sending-domain";

describe("sending-domain policy", () => {
  it("normalizes ordinary domains without accepting URLs or email addresses", () => {
    expect(normalizeSendingDomain("  Mail.Example.COM. ")).toBe(
      "mail.example.com",
    );
    expect(getSendingDomainValidationError("https://example.com")).not.toBeNull();
    expect(getSendingDomainValidationError("sender@example.com")).not.toBeNull();
    expect(getSendingDomainValidationError("localhost")).not.toBeNull();
    expect(getSendingDomainValidationError("127.0.0.1")).not.toBeNull();
    expect(getSendingDomainValidationError("mail.example.com")).toBeNull();
  });

  it("requires DNS-safe labels", () => {
    expect(getSendingDomainValidationError("-mail.example.com")).not.toBeNull();
    expect(getSendingDomainValidationError("mail_.example.com")).not.toBeNull();
    expect(getSendingDomainValidationError("example")).not.toBeNull();
    expect(getSendingDomainValidationError("xn--bcher-kva.example")).toBeNull();
  });

  it("permits verification, failure, disablement, and explicit re-verification", () => {
    expect(canTransitionSendingDomainStatus("pending", "verified")).toBe(true);
    expect(canTransitionSendingDomainStatus("verified", "failed")).toBe(true);
    expect(canTransitionSendingDomainStatus("failed", "verified")).toBe(false);
    expect(canTransitionSendingDomainStatus("failed", "pending")).toBe(true);
    expect(canTransitionSendingDomainStatus("disabled", "pending")).toBe(true);
    expect(canTransitionSendingDomainStatus("verified", "disabled")).toBe(true);
    expect(canTransitionSendingDomainStatus("disabled", "verified")).toBe(false);
  });

  it("allows delivery only through a verified provider-backed domain", () => {
    const domain = "mail.example.com";

    expect(
      isSendingDomainEligibleForDelivery({
        domain,
        providerDomainId: "domain_123",
        status: "verified",
      }),
    ).toBe(true);
    expect(
      isSendingDomainEligibleForDelivery({
        domain,
        providerDomainId: "domain_123",
        status: "pending",
      }),
    ).toBe(false);
    expect(
      isSendingDomainEligibleForDelivery({
        domain,
        providerDomainId: "domain_123",
        status: "disabled",
      }),
    ).toBe(false);
    expect(
      isSendingDomainEligibleForDelivery({
        domain,
        providerDomainId: null,
        status: "verified",
      }),
    ).toBe(false);
  });
});
