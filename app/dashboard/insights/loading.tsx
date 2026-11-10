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
        <div className="h-20 animate-pulse rounded-[var(--radius-dashboard-card)] bg-[var(--surface-muted)]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="h-32 animate-pulse rounded-[var(--radius-dashboard-card)] bg-[var(--surface-muted)]" key={index} />
          ))}
        </div>
        <div className="h-52 animate-pulse rounded-[var(--radius-dashboard-card)] bg-[var(--surface-muted)]" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-36 animate-pulse rounded-[var(--radius-dashboard-card)] bg-[var(--surface-muted)]" />
          <div className="h-36 animate-pulse rounded-[var(--radius-dashboard-card)] bg-[var(--surface-muted)]" />
        </div>
      </div>
    </main>
  );
}
