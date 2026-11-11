import Link from "next/link";
import { Icon } from "../ui-icon";

export function CaseDetailFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-5 sm:px-8 sm:py-8 lg:px-8 lg:py-10 xl:px-10">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6">{children}</div>
    </div>
  );
}

export function CaseDetailHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-4">
      <Link
        className="inline-flex min-h-11 w-fit items-center gap-2 text-[13px] font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] focus-visible:rounded-[var(--radius-control)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        href="/dashboard/cases"
      >
        <Icon className="size-4" name="arrow-left" />
        Back to cases
      </Link>
      <h1 className="text-[26px] font-normal tracking-[-0.035em] text-[var(--foreground)] lg:text-[30px]">
        Payment recovery case
      </h1>
      {children}
    </header>
  );
}

export function CaseDetailFeedback({
  action,
  body,
  title,
}: {
  action?: React.ReactNode;
  body: string;
  title: string;
}) {
  return (
    <section
      aria-live="polite"
      className="rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-6"
    >
      <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>
      <p className="mt-3 max-w-3xl text-[13px] leading-5 text-[var(--foreground)]">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}

export function CaseDetailLoadingSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading case details"
      className="flex flex-col gap-5"
    >
      <span className="sr-only" role="status">Loading case details</span>
      <section className="rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="h-5 w-48 motion-safe:animate-pulse rounded bg-[var(--surface-muted)]" />
            <div className="mt-3 h-4 w-64 max-w-full motion-safe:animate-pulse rounded bg-[var(--surface-muted)]" />
          </div>
          <div className="h-7 w-24 motion-safe:animate-pulse rounded-[6px] bg-[var(--primary-soft)]" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              className="h-24 motion-safe:animate-pulse rounded-[var(--radius-control)] bg-[var(--surface-muted)]"
              key={index}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="h-64 motion-safe:animate-pulse rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]" />
        <div className="h-64 motion-safe:animate-pulse rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]" />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-48 motion-safe:animate-pulse rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]" />
        <div className="h-48 motion-safe:animate-pulse rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]" />
      </div>
    </div>
  );
}
