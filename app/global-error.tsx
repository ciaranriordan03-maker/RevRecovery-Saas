"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[var(--background)] text-[var(--foreground)]">
        <main className="flex min-h-screen items-center justify-center px-6">
          <section className="w-full max-w-lg rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-card)]">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="mt-3 text-sm text-[var(--muted)]">
              The error has been reported. Please try again.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
