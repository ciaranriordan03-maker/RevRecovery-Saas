import { BrandMark } from "../brand";

const authHighlights = [
  "Secure email and password authentication with Supabase",
  "Recovery settings saved per authenticated user",
  "Dashboard pages protected with server-validated sessions",
];

export function AuthMarketingPanel() {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--primary-border)] bg-gradient-to-br from-[var(--primary-soft)] to-[var(--purple-soft)] p-8 shadow-[var(--shadow-card)]">
      <BrandMark />
      <h1 className="mt-10 text-4xl font-medium tracking-[-0.03em]">
        Recover failed revenue without losing the thread.
      </h1>
      <p className="mt-4 max-w-lg text-sm leading-6 text-[var(--muted-strong)]">
        Sign in to manage your onboarding, recovery flow, insights, and settings
        from one place.
      </p>
      <div className="mt-8 space-y-4">
        {authHighlights.map((item) => (
          <div className="flex items-center gap-3" key={item}>
            <span className="size-2 rounded-full bg-[var(--primary)]" />
            <p className="text-sm text-[var(--primary-text)]">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
