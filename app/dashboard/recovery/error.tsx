"use client";

export default function RecoveryError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-10 sm:px-8 lg:px-10">
      <section
        aria-live="polite"
        className="mx-auto max-w-2xl rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8"
      >
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">
          Recovery is temporarily unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted-strong)]">
          We couldn’t confirm the latest recovery status. No settings or delivery
          state changed. Try loading the page again.
        </p>
        <button
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
