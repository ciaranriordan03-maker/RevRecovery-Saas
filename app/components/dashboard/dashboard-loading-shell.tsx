import type { ReactNode } from "react";
import { BrandMark } from "../brand";
import { Icon } from "../ui-icon";

type LoadingNavigationItem = {
  icon: string;
  label: string;
};

const navigationItems: readonly LoadingNavigationItem[] = [
  { icon: "grid", label: "Dashboard" },
  { icon: "users", label: "Cases" },
  { icon: "refresh", label: "Recovery" },
  { icon: "chart", label: "Insights" },
  { icon: "target", label: "Recommendations" },
  { icon: "grid", label: "Settings" },
];

export function LoadingBlock({
  className = "",
}: {
  className?: string;
}) {
  const backgroundClass = className.includes("bg-")
    ? ""
    : "bg-[var(--surface-muted)]";
  const radiusClass = className.includes("rounded-")
    ? ""
    : "rounded-[var(--radius-control)]";

  return (
    <div
      aria-hidden="true"
      className={`motion-safe:animate-pulse ${radiusClass} ${backgroundClass} ${className}`}
    />
  );
}

function LoadingNavigation({ activeLabel }: { activeLabel: string }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-1">
      {navigationItems.map((item) => (
        <div
          className={`flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-medium ${
            item.label === activeLabel
              ? "bg-[var(--primary-soft)] text-[var(--primary)]"
              : "text-[var(--muted-strong)]"
          }`}
          key={item.label}
        >
          <Icon className="size-[18px]" name={item.icon} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

export function DashboardLoadingShell({
  activeLabel,
  ariaLabel,
  children,
  contextLabel,
  showPageHeading = true,
  subtitle,
  title,
}: {
  activeLabel: string;
  ariaLabel: string;
  children: ReactNode;
  contextLabel?: string;
  showPageHeading?: boolean;
  subtitle: string;
  title: string;
}) {
  return (
    <main
      aria-busy="true"
      aria-label={ariaLabel}
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)] lg:h-screen lg:overflow-hidden"
    >
      <span className="sr-only" role="status">
        {ariaLabel}
      </span>
      <div className="flex min-h-screen lg:h-screen lg:min-h-0">
        <aside
          aria-hidden="true"
          className="sticky top-0 hidden h-screen w-[var(--dashboard-sidebar-width)] shrink-0 border-r border-[var(--border)] bg-[var(--surface)] lg:flex lg:flex-col"
        >
          <div className="flex h-[68px] items-center border-b border-[var(--border)] px-5">
            <BrandMark variant="dashboard" />
          </div>
          <div className="flex-1 px-3 py-4">
            <LoadingNavigation activeLabel={activeLabel} />
          </div>
          <div className="border-t border-[var(--border)] p-3">
            <div className="flex items-center gap-2.5 px-2 py-2">
              <LoadingBlock className="size-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <LoadingBlock className="h-3 w-28" />
                <LoadingBlock className="mt-2 h-3 w-20" />
              </div>
            </div>
            <LoadingBlock className="mt-1 h-10 w-full" />
          </div>
        </aside>

        <section className="min-w-0 flex-1 lg:h-screen lg:overflow-y-auto">
          <header
            aria-hidden="true"
            className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5 lg:hidden"
          >
            <BrandMark variant="mobile" />
            <div className="flex min-h-11 items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-sm font-medium text-[var(--foreground)]">
              <Icon className="size-[18px]" name="menu" />
              Menu
            </div>
          </header>

          <div
            aria-hidden="true"
            className="hidden h-[68px] items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-8 lg:flex xl:px-10"
          >
            <p className="text-xs text-[var(--muted)]">
              RevRecovery
              <span className="px-2 text-[var(--border-strong)]">/</span>
              <span className="font-medium text-[var(--foreground)]">{title}</span>
            </p>
            {contextLabel ? (
              <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)]">
                <span className="size-[5px] rounded-full bg-[var(--primary)]" />
                {contextLabel}
              </span>
            ) : null}
          </div>

          {showPageHeading ? (
            <header className="px-5 pt-7 sm:px-8 lg:px-8 lg:pt-8 xl:px-10">
              <h1 className="text-[26px] font-semibold leading-8 tracking-[-0.025em] text-[var(--foreground)] sm:text-[30px] sm:leading-9">
                {title}
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
            </header>
          ) : null}

          {children}
        </section>
      </div>
    </main>
  );
}
