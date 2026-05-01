import type { Metadata } from "next";
import { Button } from "../components/button";
import { AuthMarketingPanel } from "../components/auth/auth-marketing-panel";
import { login, signup } from "./actions";

export const metadata: Metadata = {
  title: "Login | RecoverFlow",
  description: "Sign in to RecoverFlow to manage recovery settings and dashboard data.",
};

type LoginPageProps = {
  searchParams?: Promise<{
    message?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params?.next ?? "/onboarding";

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-10 text-[var(--foreground)] sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <AuthMarketingPanel />

          <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-card)]">
            <div>
              <h2 className="text-2xl font-medium tracking-[-0.02em]">Sign in or create account</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Use the same form for login and sign-up while we keep the auth flow nice
                and lean.
              </p>
            </div>

            {params?.message ? (
              <div className="mt-6 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--muted-strong)]">
                {params.message}
              </div>
            ) : null}

            <form className="mt-6 space-y-4">
              <input name="next" type="hidden" value={next} />
              <label className="block">
                <span className="mb-2 block text-sm text-[var(--foreground)]">Email</span>
                <input
                  className="h-12 w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm outline-none transition focus:border-[var(--primary)]"
                  name="email"
                  placeholder="you@company.com"
                  required
                  type="email"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-[var(--foreground)]">Password</span>
                <input
                  className="h-12 w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm outline-none transition focus:border-[var(--primary)]"
                  minLength={8}
                  name="password"
                  placeholder="Minimum 8 characters"
                  required
                  type="password"
                />
              </label>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button className="h-11 flex-1 text-sm" formAction={login} type="submit">
                  Log In
                </Button>
                <Button
                  className="h-11 flex-1 text-sm"
                  formAction={signup}
                  type="submit"
                  variant="secondary"
                >
                  Sign Up
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
