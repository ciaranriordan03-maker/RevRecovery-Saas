import {
  DashboardLoadingShell,
  LoadingBlock,
} from "../../components/dashboard/dashboard-loading-shell";

export default function OptimizeLoading() {
  return (
    <DashboardLoadingShell
      activeLabel="Recommendations"
      ariaLabel="Loading recommendations"
      subtitle="Practical next actions based on your current recovery state"
      title="Recommendations"
    >
      <div className="px-5 pb-8 sm:px-8 xl:px-20">
        <div className="mx-auto flex max-w-[1024px] flex-col gap-4 pt-6">
          <LoadingBlock className="h-32 border border-[var(--border)] bg-[var(--surface)]" />
          <LoadingBlock className="h-28 border border-[var(--border)] bg-[var(--surface)]" />
          {Array.from({ length: 3 }, (_, index) => (
            <LoadingBlock
              className="h-44 border border-[var(--border)] bg-[var(--surface)]"
              key={index}
            />
          ))}
        </div>
      </div>
    </DashboardLoadingShell>
  );
}
