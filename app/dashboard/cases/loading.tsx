import {
  DashboardLoadingShell,
  LoadingBlock,
} from "../../components/dashboard/dashboard-loading-shell";

export default function CasesLoading() {
  return (
    <DashboardLoadingShell
      activeLabel="Cases"
      ariaLabel="Loading cases"
      contextLabel="Stripe"
      showPageHeading={false}
      subtitle="Review failed payments and decide what to do next"
      title="Cases"
    >
      <div className="px-5 py-5 sm:px-8 sm:py-8 lg:px-8 xl:px-10">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-[22px] lg:gap-[26px]">
          <section>
            <h1 className="text-[28px] font-normal tracking-[-0.035em] text-[var(--foreground)] lg:text-[30px]">
              Cases
            </h1>
            <p className="mt-2 text-[13px] text-[var(--muted)] lg:text-sm">
              Review failed payments and decide what to do next.
            </p>
          </section>

          <section className="overflow-hidden rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-5 lg:px-6">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  Recovery queue
                </h2>
                <LoadingBlock className="mt-3 h-3 w-80 max-w-full" />
              </div>
              <LoadingBlock className="h-5 w-28" />
            </div>

            <div className="grid gap-3 border-t border-[var(--border)] px-4 py-4 sm:grid-cols-4 sm:px-5 lg:px-6">
              {Array.from({ length: 4 }, (_, index) => (
                <LoadingBlock className="h-10" key={index} />
              ))}
            </div>

            <div className="hidden border-t border-[var(--border)] lg:block">
              <div className="grid grid-cols-[1.2fr_1.2fr_1fr_0.8fr_0.5fr] gap-4 bg-[var(--surface-muted)] px-5 py-3">
                {Array.from({ length: 5 }, (_, index) => (
                  <LoadingBlock className="h-3 bg-[var(--border)]" key={index} />
                ))}
              </div>
              {Array.from({ length: 4 }, (_, rowIndex) => (
                <div
                  className="grid grid-cols-[1.2fr_1.2fr_1fr_0.8fr_0.5fr] gap-4 border-t border-[var(--border)] px-5 py-5"
                  key={rowIndex}
                >
                  {Array.from({ length: 5 }, (_, cellIndex) => (
                    <LoadingBlock
                      className={cellIndex < 3 ? "h-14" : "h-8"}
                      key={cellIndex}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--background)] p-3 lg:hidden">
              {Array.from({ length: 3 }, (_, index) => (
                <LoadingBlock
                  className="h-48 border border-[var(--border)] bg-[var(--surface)]"
                  key={index}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </DashboardLoadingShell>
  );
}
