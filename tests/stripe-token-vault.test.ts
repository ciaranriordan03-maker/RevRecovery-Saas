import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decryptStripeToken,
  encryptStripeToken,
  isEncryptedStripeToken,
} from "../app/lib/server/stripe-token-vault";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Stripe token vault", () => {
  it("round-trips tokens using authenticated encryption", () => {
    vi.stubEnv("STRIPE_TOKEN_ENCRYPTION_KEY", "dedicated-test-key");
    const encrypted = encryptStripeToken("oauth-access-token");

    expect(encrypted).not.toContain("oauth-access-token");
    expect(isEncryptedStripeToken(encrypted)).toBe(true);
    expect(decryptStripeToken(encrypted)).toBe("oauth-access-token");
  });

  it("does not encrypt an already encrypted token twice", () => {
    vi.stubEnv("STRIPE_TOKEN_ENCRYPTION_KEY", "dedicated-test-key");
    const encrypted = encryptStripeToken("oauth-access-token");

    expect(encryptStripeToken(encrypted)).toBe(encrypted);
  });

  it("rejects ciphertext when the encryption key changes", () => {
    vi.stubEnv("STRIPE_TOKEN_ENCRYPTION_KEY", "first-key");
    const encrypted = encryptStripeToken("oauth-access-token");
    vi.stubEnv("STRIPE_TOKEN_ENCRYPTION_KEY", "different-key");

    expect(() => decryptStripeToken(encrypted)).toThrow();
  });

  it("requires an encryption secret", () => {
    vi.stubEnv("STRIPE_TOKEN_ENCRYPTION_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");

    expect(() => encryptStripeToken("oauth-access-token")).toThrow(
      "STRIPE_TOKEN_ENCRYPTION_KEY is required",
    );
  });
});
