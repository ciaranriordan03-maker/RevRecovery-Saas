export default function RecoveryLoading() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-7 sm:px-8 lg:px-10">
      <div
        aria-busy="true"
        aria-label="Loading recovery"
        className="mx-auto flex max-w-[1120px] flex-col gap-6"
      >
        <div>
          <div className="h-8 w-32 animate-pulse rounded bg-[var(--border)]" />
          <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-[var(--border)]" />
        </div>
        <div className="h-11 w-72 max-w-full animate-pulse rounded bg-[var(--border)]" />
        <div className="h-28 animate-pulse rounded-[var(--radius-dashboard-card)] bg-[var(--surface-muted)]" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-28 animate-pulse rounded-[var(--radius-dashboard-card)] bg-[var(--surface-muted)]" />
          <div className="h-28 animate-pulse rounded-[var(--radius-dashboard-card)] bg-[var(--surface-muted)]" />
          <div className="h-28 animate-pulse rounded-[var(--radius-dashboard-card)] bg-[var(--surface-muted)]" />
        </div>
        <div className="h-64 animate-pulse rounded-[var(--radius-dashboard-card)] bg-[var(--surface-muted)]" />
      </div>
    </main>
  );
}
