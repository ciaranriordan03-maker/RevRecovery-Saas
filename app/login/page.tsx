import type { Metadata } from "next";
import { AuthMarketingPanel } from "../components/auth/auth-marketing-panel";
import { AuthProgressLabel, AuthStatusPanel } from "../components/auth/auth-status-panel";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = {
  title: "Login | RecoverFlow",
  description: "Sign in to RecoverFlow to manage recovery settings and dashboard data.",
};

type LoginPageProps = {
  searchParams?: Promise<{
    email?: string;
    message?: string;
    next?: string;
    status?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params?.next ?? "/onboarding";
  const status = params?.status ?? "default";
  const email = params?.email ?? "";
  const isCheckEmail = status === "check-email";
  const isError = status === "error";
  const isVerified = status === "verified";

  return (
    <main className="min-h-screen bg-[var(--auth-background)] text-[var(--foreground)]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.16fr)_minmax(440px,1fr)]">
        <AuthMarketingPanel />

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[440px]">
            <div className="rounded-[14px] border border-[var(--border)] bg-white px-8 py-9 shadow-[0_1px_2px_rgb(16_24_40_/_0.04)] sm:px-8">
              <div>
                <AuthProgressLabel isCheckEmail={isCheckEmail} isVerified={isVerified} />
                <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[var(--auth-heading)]">
                  {isVerified
                    ? "You're verified"
                    : isCheckEmail
                      ? "Check your inbox"
                      : "Welcome back"}
                </h2>
                <p className="mt-2 text-sm font-medium text-[var(--auth-copy)]">
                  {isVerified
                    ? "Your email is confirmed. Continue into setup to finish creating your workspace."
                    : isCheckEmail
                      ? "Your account is almost ready. Open the confirmation email, then you will continue into setup."
                      : "Sign in to continue to RevRecover"}
                </p>
              </div>

              <AuthStatusPanel
                email={email}
                isCheckEmail={isCheckEmail}
                isError={isError}
                isVerified={isVerified}
                message={params?.message}
                next={next}
              />

              {isVerified ? null : (
                <AuthForm email={email} isCheckEmail={isCheckEmail} next={next} />
              )}

              {isCheckEmail ? (
                <p className="mt-5 text-center text-xs leading-5 text-[var(--muted)]">
                  No email yet? Check spam, then use Sign Up again with the same
                  email to request a fresh confirmation link.
                </p>
              ) : null}
            </div>

            <p className="mt-7 text-center text-xs leading-5 text-[var(--auth-fine-print)]">
              By continuing, you agree to our{" "}
              <span className="font-medium underline">Terms of Service</span> and{" "}
              <span className="font-medium underline">Privacy Policy</span>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
