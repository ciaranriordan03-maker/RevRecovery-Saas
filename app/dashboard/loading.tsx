import {
  DashboardLoadingShell,
  LoadingBlock,
} from "../components/dashboard/dashboard-loading-shell";

export default function DashboardLoading() {
  return (
    <DashboardLoadingShell
      activeLabel="Dashboard"
      ariaLabel="Loading dashboard"
      contextLabel="Stripe"
      showPageHeading={false}
      subtitle="Your failed payments and next actions"
      title="Dashboard"
    >
      <div className="px-5 py-5 sm:px-8 sm:py-8 lg:px-8 xl:px-10">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-[22px] lg:gap-[26px]">
          <section>
            <h1 className="text-[28px] font-normal tracking-[-0.035em] text-[var(--foreground)] lg:text-[30px]">
              Dashboard
            </h1>
            <p className="mt-2 text-[13px] text-[var(--muted)] lg:text-sm">
              See failed payments, priorities, and what to do next.
            </p>
          </section>

          <LoadingBlock className="h-28 border border-[var(--primary-border)] bg-[var(--primary-soft)]" />

          <section className="hidden grid-cols-2 gap-4 md:grid xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <LoadingBlock
                className="h-32 border border-[var(--border)] bg-[var(--surface)]"
                key={index}
              />
            ))}
          </section>

          <LoadingBlock className="h-28 border border-[var(--border)] bg-[var(--surface)] md:hidden" />

          <section className="hidden overflow-hidden rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)] md:block">
            <div className="flex items-end justify-between gap-4 p-6">
              <div>
                <LoadingBlock className="h-5 w-44" />
                <LoadingBlock className="mt-3 h-3 w-64" />
              </div>
              <LoadingBlock className="h-4 w-24" />
            </div>
            <div className="border-y border-[var(--border)] bg-[var(--surface-muted)] px-5 py-3">
              <LoadingBlock className="h-3 w-full bg-[var(--border)]" />
            </div>
            {Array.from({ length: 3 }, (_, index) => (
              <div
                className="grid grid-cols-[1.1fr_0.6fr_1fr_0.8fr_1.4fr] gap-4 border-b border-[var(--border)] px-5 py-5 last:border-b-0"
                key={index}
              >
                {Array.from({ length: 5 }, (_, cellIndex) => (
                  <LoadingBlock
                    className={cellIndex === 4 ? "h-10" : "h-7"}
                    key={cellIndex}
                  />
                ))}
              </div>
            ))}
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <LoadingBlock className="h-48 border border-[var(--border)] bg-[var(--surface)]" />
            <LoadingBlock className="h-48 border border-[var(--border)] bg-[var(--surface)]" />
          </section>
        </div>
      </div>
    </DashboardLoadingShell>
  );
}
