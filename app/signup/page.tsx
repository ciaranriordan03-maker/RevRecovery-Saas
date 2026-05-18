import type { Metadata } from "next";
import { AuthMarketingPanel } from "../components/auth/auth-marketing-panel";
import { AuthStatusPanel } from "../components/auth/auth-status-panel";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Sign Up | RecoverFlow",
  description: "Create a RecoverFlow account to start recovering failed payments.",
};

type SignupPageProps = {
  searchParams?: Promise<{
    email?: string;
    message?: string;
    next?: string;
    status?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const next = params?.next ?? "/onboarding";
  const status = params?.status ?? "default";
  const email = params?.email ?? "";
  const isError = status === "error";

  return (
    <main className="min-h-screen bg-[var(--auth-background)] text-[var(--foreground)]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.16fr)_minmax(440px,1fr)]">
        <AuthMarketingPanel variant="signup" />

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[448px]">
            <div className="rounded-[14px] bg-white px-8 py-8 sm:px-9">
              <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[var(--auth-heading)]">
                Create your account
              </h1>
              <p className="mt-2 text-sm font-medium text-[var(--auth-copy)]">
                Start recovering failed payments with RevRecovery.
              </p>

              <AuthStatusPanel
                isError={isError}
                message={params?.message}
              />

              <SignupForm email={email} next={next} />
            </div>

            <p className="mx-auto mt-7 max-w-[390px] text-center text-xs leading-5 text-[var(--auth-fine-print)]">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
