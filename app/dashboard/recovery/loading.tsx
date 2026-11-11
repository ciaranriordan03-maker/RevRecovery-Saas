import {
  DashboardLoadingShell,
  LoadingBlock,
} from "../../components/dashboard/dashboard-loading-shell";

export default function RecoveryLoading() {
  return (
    <DashboardLoadingShell
      activeLabel="Recovery"
      ariaLabel="Loading recovery"
      showPageHeading={false}
      subtitle="Monitor failed-payment recovery"
      title="Recovery"
    >
      <div className="px-5 py-7 sm:px-8 lg:px-8 lg:py-8 xl:px-10">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-7">
          <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">
                  Recovery
                </h1>
                <LoadingBlock className="h-6 w-20 bg-[var(--primary-soft)]" />
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Monitor failed payments, recovery activity, and anything requiring attention.
              </p>
              <LoadingBlock className="mt-4 h-4 w-full max-w-lg" />
            </div>
            <div className="flex gap-2">
              <LoadingBlock className="h-10 w-28" />
              <LoadingBlock className="h-10 w-28 bg-[var(--primary-soft)]" />
            </div>
          </header>

          <div className="flex gap-6 border-b border-[var(--border)]">
            <LoadingBlock className="h-9 w-20 rounded-none border-b-2 border-[var(--primary)] bg-transparent" />
            <LoadingBlock className="h-9 w-36 rounded-none bg-transparent" />
          </div>

          <LoadingBlock className="h-32 border border-[var(--border)] bg-[var(--surface)]" />

          <section className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <LoadingBlock
                className="h-32 border border-[var(--border)] bg-[var(--surface)]"
                key={index}
              />
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <LoadingBlock className="h-72 border border-[var(--border)] bg-[var(--surface)]" />
            <LoadingBlock className="h-72 border border-[var(--border)] bg-[var(--surface)]" />
          </section>
        </div>
      </div>
    </DashboardLoadingShell>
  );
}
