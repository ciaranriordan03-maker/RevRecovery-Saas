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

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-10 text-[var(--foreground)] sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <AuthMarketingPanel />

          <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-card)]">
            <div>
              <AuthProgressLabel isCheckEmail={isCheckEmail} />
              <h2 className="text-2xl font-medium tracking-[-0.02em]">
                {isCheckEmail ? "Check your inbox" : "Sign in or create account"}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {isCheckEmail
                  ? "Your account is almost ready. Open the confirmation email, then you will continue into setup."
                  : "Use your work email to access RecoverFlow or start a new workspace."}
              </p>
            </div>

            <AuthStatusPanel
              email={email}
              isCheckEmail={isCheckEmail}
              isError={isError}
              message={params?.message}
            />

            <AuthForm email={email} isCheckEmail={isCheckEmail} next={next} />

            {isCheckEmail ? (
              <p className="mt-5 text-center text-xs leading-5 text-[var(--muted)]">
                No email yet? Check spam, then use Sign Up again with the same email
                to request a fresh confirmation link.
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
