import type { Metadata } from "next";
import Link from "next/link";
import { AuthMarketingPanel } from "../components/auth/auth-marketing-panel";
import { Button } from "../components/button";
import { Icon } from "../components/ui-icon";
import { requestPasswordReset } from "../login/actions";

export const metadata: Metadata = {
  title: "Reset Password | RevRecovery",
  description: "Request a secure RevRecovery password reset link.",
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[var(--auth-background)] text-[var(--foreground)]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.16fr)_minmax(440px,1fr)]">
        <AuthMarketingPanel />

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[440px] rounded-[14px] border border-[var(--border)] bg-white px-8 py-9 shadow-[0_1px_2px_rgb(16_24_40_/_0.04)]">
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[var(--auth-heading)]">
              Reset your password
            </h1>
            <p className="mt-2 text-sm font-medium text-[var(--auth-copy)]">
              Enter your email and we&apos;ll send a secure reset link.
            </p>

            <form className="mt-8">
              <label className="block">
                <span className="mb-2.5 block text-sm font-medium text-[var(--auth-label)]">
                  Email address
                </span>
                <span className="relative block">
                  <Icon
                    className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--auth-icon)]"
                    name="mail"
                  />
                  <input
                    className="h-[46px] w-full rounded-[14px] border border-[var(--auth-input-border)] bg-white px-12 text-sm text-[var(--auth-heading)] outline-none transition placeholder:text-[var(--auth-placeholder)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)]"
                    name="email"
                    placeholder="you@company.com"
                    required
                    type="email"
                  />
                </span>
              </label>

              <Button
                className="mt-5 h-[46px] w-full gap-2 rounded-[14px] text-sm font-semibold shadow-sm"
                formAction={requestPasswordReset}
                type="submit"
              >
                Send reset link
                <Icon className="size-4" name="arrow-right" />
              </Button>
            </form>

            <p className="mt-7 text-center text-sm font-medium text-[var(--muted-strong)]">
              Remember your password?{" "}
              <Link className="font-semibold text-[var(--primary)]" href="/login">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
