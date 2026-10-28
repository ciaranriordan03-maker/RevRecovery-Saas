import Link from "next/link";
import { DiceBearAvatar } from "../avatar";
import { BrandMark } from "../brand";
import { Icon } from "../ui-icon";
import { dashboardNavItems, type DashboardNavItem } from "../../lib/data";
import { getCurrentUserClaims } from "../../lib/auth";
import { getOrCreateUserOnboardingProfile } from "../../lib/server/onboarding-store";
import { SignOutForm } from "./sign-out-form";

const navHref: Record<DashboardNavItem, string> = {
  Setup: "/onboarding",
  Dashboard: "/dashboard",
  Cases: "/dashboard/cases",
  Recovery: "/dashboard/recovery",
  Insights: "/dashboard/insights",
  Optimize: "/dashboard/optimize",
  Settings: "/dashboard/settings",
};

const navIcon: Record<DashboardNavItem, string> = {
  Setup: "card",
  Dashboard: "grid",
  Cases: "users",
  Recovery: "refresh",
  Insights: "chart",
  Optimize: "target",
  Settings: "grid",
};

function getDisplayName({
  email,
  fullName,
}: {
  email: string;
  fullName?: string | null;
}) {
  const normalizedName = fullName?.trim();

  if (normalizedName) {
    return normalizedName;
  }

  const username = email.split("@")[0]?.trim();

  if (!username) {
    return "Account";
  }

  return username
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function Navigation({
  active,
  navItems,
}: {
  active: DashboardNavItem;
  navItems: readonly DashboardNavItem[];
}) {
  return (
    <nav aria-label="Dashboard navigation" className="flex flex-col gap-1">
      {navItems.map((item) => (
        <Link
          aria-current={item === active ? "page" : undefined}
          className={`flex h-[42px] items-center gap-3 rounded-[8px] px-3 text-sm font-medium transition-colors ${
            item === active
              ? "bg-[var(--primary-soft)] text-[var(--primary)]"
              : "text-[var(--muted-strong)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
          }`}
          href={navHref[item]}
          key={item}
        >
          <Icon className="size-[18px]" name={navIcon[item]} />
          {item}
        </Link>
      ))}
    </nav>
  );
}

function ContextBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)]">
      <span aria-hidden className="size-[5px] rounded-full bg-[var(--primary)]" />
      {label}
    </span>
  );
}

export async function AppShell({
  active,
  children,
  contextLabel,
  showPageHeading = true,
  subtitle,
  title,
}: {
  active: DashboardNavItem;
  children: React.ReactNode;
  contextLabel?: string;
  showPageHeading?: boolean;
  subtitle: string;
  title: string;
}) {
  const claims = await getCurrentUserClaims();
  const profile = claims?.sub
    ? await getOrCreateUserOnboardingProfile(claims.sub)
    : null;
  const navItems = profile?.onboardingCompleted
    ? dashboardNavItems.filter((item) => item !== "Setup")
    : dashboardNavItems;
  const accountEmail =
    claims && typeof claims.email === "string" ? claims.email : "account@company.com";
  const avatarSeed = profile?.avatarSeed ?? claims?.sub ?? accountEmail;
  const displayName = getDisplayName({
    email: accountEmail,
    fullName: profile?.fullName,
  });

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] lg:h-screen lg:overflow-hidden">
      <div className="flex min-h-screen lg:h-screen lg:min-h-0">
        <aside className="sticky top-0 hidden h-screen w-[var(--dashboard-sidebar-width)] shrink-0 border-r border-[var(--border)] bg-[var(--surface)] lg:flex lg:flex-col">
          <div className="flex h-[68px] items-center border-b border-[var(--border)] px-5">
            <BrandMark variant="dashboard" />
          </div>
          <div className="flex-1 px-3 py-4">
            <Navigation active={active} navItems={navItems} />
          </div>
          <div className="border-t border-[var(--border)] p-3">
            <div className="flex items-center gap-2.5 rounded-[8px] px-2 py-2">
              <DiceBearAvatar
                alt="Account avatar"
                className="size-8"
                seed={avatarSeed}
                size={32}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[var(--foreground)]">
                  {displayName}
                </p>
                <Link
                  className="mt-0.5 block truncate text-[11px] text-[var(--muted)] hover:text-[var(--primary)]"
                  href="/dashboard/settings"
                >
                  Account settings
                </Link>
              </div>
            </div>
            <SignOutForm />
          </div>
        </aside>

        <section className="min-w-0 flex-1 lg:h-screen lg:overflow-y-auto">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5 lg:hidden">
            <BrandMark variant="mobile" />
            <details className="group relative">
              <summary className="flex list-none items-center gap-1.5 text-xs text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
                <Icon className="size-[18px]" name="menu" />
                Menu
              </summary>
              <div className="fixed inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
                <Navigation active={active} navItems={navItems} />
                <div className="mt-4 border-t border-[var(--border)] pt-4">
                  <div className="mb-3 flex items-center gap-3">
                    <DiceBearAvatar
                      alt="Account avatar"
                      className="size-9"
                      seed={avatarSeed}
                      size={36}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                        {displayName}
                      </p>
                      <p className="truncate text-xs text-[var(--muted)]">{accountEmail}</p>
                    </div>
                  </div>
                  <SignOutForm compact />
                </div>
              </div>
            </details>
          </header>

          <div className="hidden h-[68px] items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-8 lg:flex xl:px-10">
            <p className="text-xs text-[var(--muted)]">
              <Link className="hover:text-[var(--primary)]" href="/dashboard">
                RevRecovery
              </Link>
              <span className="px-2 text-[var(--border-strong)]">/</span>
              <span className="font-medium text-[var(--foreground)]">{title}</span>
            </p>
            {contextLabel ? <ContextBadge label={contextLabel} /> : null}
          </div>

          {showPageHeading ? (
            <header className="px-5 pt-7 sm:px-8 lg:px-8 lg:pt-8 xl:px-10">
              <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">
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
