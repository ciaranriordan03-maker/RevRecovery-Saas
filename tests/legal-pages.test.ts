import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const privacySource = readSource("../app/privacy/page.tsx");
const termsSource = readSource("../app/terms/page.tsx");
const cookiesSource = readSource("../app/cookies/page.tsx");
const dataProcessingSource = readSource("../app/data-processing/page.tsx");
const legalSource = readSource("../app/lib/legal.ts");
const marketingSource = readSource(
  "../app/components/marketing/marketing-page.tsx",
);
const loginSource = readSource("../app/login/page.tsx");
const signupSource = readSource("../app/signup/page.tsx");

describe("public legal pages", () => {
  it("publishes the core legal documents", () => {
    expect(privacySource).toContain('title="Privacy Notice"');
    expect(termsSource).toContain('title="Terms of Service"');
    expect(cookiesSource).toContain('title="Cookie Notice"');
    expect(dataProcessingSource).toContain(
      'title="Data Processing Addendum"',
    );
  });

  it("identifies the legal operator and postal contact", () => {
    expect(legalSource).toContain('LEGAL_OPERATOR_NAME = "Ciarán Riordan"');
    expect(legalSource).toContain(
      "20 McDowell Ave, Mount Brown, Dublin, D08 ET9X, Ireland",
    );
    expect(privacySource).toContain("LEGAL_POSTAL_ADDRESS");
    expect(termsSource).toContain("LEGAL_OPERATOR_NAME");
    expect(dataProcessingSource).toContain("LEGAL_POSTAL_ADDRESS");
  });

  it("describes the actual service providers and controller-processor roles", () => {
    expect(privacySource).toContain("acts as its processor");
    expect(privacySource).toContain("Supabase");
    expect(privacySource).toContain("Stripe");
    expect(privacySource).toContain("Resend");
    expect(privacySource).toContain("Sentry");
    expect(privacySource).toContain("Plausible Analytics");
    expect(privacySource).toContain("Botpress");
    expect(dataProcessingSource).toContain("Article 28 GDPR");
    expect(dataProcessingSource).toContain("Standard Contractual Clauses");
  });

  it("documents essential storage and optional browser technologies", () => {
    expect(cookiesSource).toContain("stripe_connect_state");
    expect(cookiesSource).toContain("does not set analytics cookies");
    expect(cookiesSource).toContain("Botpress may use local or session storage");
    expect(cookiesSource).toContain("We do not use advertising cookies");
  });

  it("links the legal documents from marketing and account entry points", () => {
    expect(marketingSource).toContain('aria-label="Legal"');
    expect(marketingSource).toContain("legalLinks.map");
    expect(loginSource).toContain('href="/terms"');
    expect(loginSource).toContain('href="/privacy"');
    expect(signupSource).toContain('href="/terms"');
    expect(signupSource).toContain('href="/privacy"');
  });

  it("keeps material product and reporting limitations explicit", () => {
    expect(termsSource).toContain("does not guarantee");
    expect(termsSource).toContain("Observed outcomes are not proof of causation");
    expect(termsSource).toContain("does not by itself enable delivery");
  });
});
