export default function InsightsLoading() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-7 sm:px-8 lg:px-10">
      <div
        aria-busy="true"
        aria-label="Loading insights"
        className="mx-auto flex max-w-[1120px] flex-col gap-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="h-8 w-32 animate-pulse rounded bg-[var(--border)]" />
            <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-[var(--border)]" />
          </div>
          <div className="hidden h-9 w-40 animate-pulse rounded-[var(--radius-control)] bg-[var(--border)] sm:block" />
        </div>
        <div className="h-10 w-80 max-w-full animate-pulse rounded bg-[var(--border)]" />
        <div className="h-20 animate-pulse rounded-[var(--radius-card)] bg-[var(--surface-muted)]" />
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
          <div className="h-20 animate-pulse border-b border-[var(--border)] bg-[var(--surface-muted)]" />
          {Array.from({ length: 3 }, (_, index) => (
            <div
              className="grid gap-4 border-b border-[var(--border)] px-5 py-5 last:border-b-0 sm:grid-cols-[0.8fr_1.2fr]"
              key={index}
            >
              <div className="h-10 animate-pulse rounded bg-[var(--surface-muted)]" />
              <div className="h-12 animate-pulse rounded bg-[var(--surface-muted)]" />
            </div>
          ))}
        </div>
        <div className="h-56 animate-pulse rounded-[var(--radius-card)] bg-[var(--surface-muted)]" />
        <div className="h-48 animate-pulse rounded-[var(--radius-card)] bg-[var(--surface-muted)]" />
      </div>
    </main>
  );
}
