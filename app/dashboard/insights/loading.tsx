import {
  DashboardLoadingShell,
  LoadingBlock,
} from "../../components/dashboard/dashboard-loading-shell";

export default function InsightsLoading() {
  return (
    <DashboardLoadingShell
      activeLabel="Insights"
      ariaLabel="Loading insights"
      showPageHeading={false}
      subtitle="Performance breakdown and key learnings"
      title="Insights"
    >
      <div className="px-5 py-7 sm:px-8 lg:px-8 lg:py-8 xl:px-10">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-7">
          <header className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">
                  Insights
                </h1>
                <LoadingBlock className="h-6 w-20 bg-[var(--primary-soft)]" />
              </div>
              <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
                See what is at risk, what has recovered, and where your recovery flow needs attention.
              </p>
            </div>
            <LoadingBlock className="hidden h-9 w-40 sm:block" />
          </header>

          <div className="flex gap-6 border-b border-[var(--border)]">
            <LoadingBlock className="h-9 w-20 rounded-none border-b-2 border-[var(--primary)] bg-transparent" />
            <LoadingBlock className="h-9 w-24 rounded-none bg-transparent" />
          </div>

          <section className="grid gap-3 rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end sm:p-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index}>
                <LoadingBlock className="h-3 w-20" />
                <LoadingBlock className="mt-2 h-10 w-full" />
              </div>
            ))}
            <LoadingBlock className="h-10 w-full sm:w-20 bg-[var(--primary-soft)]" />
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <LoadingBlock
                className="h-32 border border-[var(--border)] bg-[var(--surface)]"
                key={index}
              />
            ))}
          </section>

          <section className="overflow-hidden rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]">
            <div className="p-5 sm:p-6">
              <LoadingBlock className="h-5 w-44" />
              <LoadingBlock className="mt-3 h-3 w-72 max-w-full" />
            </div>
            {Array.from({ length: 3 }, (_, index) => (
              <div
                className="grid gap-4 border-t border-[var(--border)] px-5 py-5 sm:grid-cols-[0.8fr_1.2fr]"
                key={index}
              >
                <LoadingBlock className="h-10" />
                <LoadingBlock className="h-12" />
              </div>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <LoadingBlock className="h-52 border border-[var(--border)] bg-[var(--surface)]" />
            <LoadingBlock className="h-52 border border-[var(--border)] bg-[var(--surface)]" />
          </section>
        </div>
      </div>
    </DashboardLoadingShell>
  );
}
