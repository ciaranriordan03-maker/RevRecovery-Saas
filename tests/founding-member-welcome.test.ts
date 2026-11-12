import { describe, expect, it } from "vitest";
import { buildSignupUrl, buildWelcomeEmail } from "../app/lib/billing/welcome-email";

describe("founding member welcome", () => {
  it("builds an onboarding signup URL with the checkout email", () => {
    expect(
      buildSignupUrl("https://rev-recovery-saas.vercel.app", "founder@example.com"),
    ).toBe(
      "https://rev-recovery-saas.vercel.app/signup?email=founder%40example.com&next=%2Fonboarding",
    );
  });

  it("includes the account and customer setup links in both email formats", () => {
    const email = buildWelcomeEmail({
      customerName: "Ada Founder",
      setupUrl: "https://calendly.com/ciaran-revrecovery/customer-setup",
      signupUrl: "https://app.example.com/signup",
    });

    expect(email.subject).toContain("Welcome to RevRecovery");
    expect(email.text).toContain("https://app.example.com/signup");
    expect(email.text).toContain(
      "https://calendly.com/ciaran-revrecovery/customer-setup",
    );
    expect(email.html).toContain("Create your RevRecovery account");
    expect(email.html).toContain("Book your customer setup call");
  });
});
