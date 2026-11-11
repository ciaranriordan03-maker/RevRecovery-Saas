import {
  DashboardLoadingShell,
  LoadingBlock,
} from "../../components/dashboard/dashboard-loading-shell";

export default function SettingsLoading() {
  return (
    <DashboardLoadingShell
      activeLabel="Settings"
      ariaLabel="Loading settings"
      subtitle="Manage your account and preferences"
      title="Settings"
    >
      <div className="px-5 pb-8 sm:px-8 lg:px-8 xl:px-10">
        <div className="mx-auto grid max-w-[1120px] gap-5 pt-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-5">
            <LoadingBlock className="h-72 border border-[var(--border)] bg-[var(--surface)]" />
            <LoadingBlock className="h-52 border border-[var(--border)] bg-[var(--surface)]" />
          </div>
          <div className="flex flex-col gap-5">
            <LoadingBlock className="h-60 border border-[var(--border)] bg-[var(--surface)]" />
            <LoadingBlock className="h-64 border border-[var(--border)] bg-[var(--surface)]" />
          </div>
        </div>
      </div>
    </DashboardLoadingShell>
  );
}
