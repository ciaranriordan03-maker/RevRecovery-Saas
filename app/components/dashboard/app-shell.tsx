import Link from "next/link";
import { BrandMark } from "../brand";
import { Icon } from "../ui-icon";
import { dashboardNavItems, type DashboardNavItem } from "../../lib/data";
import { getCurrentUserClaims } from "../../lib/auth";
import { getOrCreateUserOnboardingProfile } from "../../lib/server/onboarding-store";

const navHref: Record<DashboardNavItem, string> = {
  Setup: "/onboarding",
  Dashboard: "/dashboard",
  Recovery: "/dashboard/recovery",
  Insights: "/dashboard/insights",
  Optimize: "/dashboard/optimize",
  Settings: "/dashboard/settings",
};

const navIcon: Record<DashboardNavItem, string> = {
  Setup: "card",
  Dashboard: "grid",
  Recovery: "refresh",
  Insights: "chart",
  Optimize: "target",
  Settings: "grid",
};

export async function AppShell({
  active,
  children,
  subtitle,
  title,
}: {
  active: DashboardNavItem;
  children: React.ReactNode;
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

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] lg:h-screen lg:overflow-hidden">
      <div className="flex min-h-screen lg:h-screen lg:min-h-0">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] lg:flex lg:flex-col">
          <div className="flex h-20 items-center border-b border-[var(--border)] px-6">
            <BrandMark />
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-4 py-4">
            {navItems.map((item) => (
              <Link
                className={`flex h-9 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition ${
                  item === active
                    ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "text-[var(--muted-strong)] hover:bg-[var(--background)]"
                }`}
                href={navHref[item]}
                key={item}
              >
                <Icon name={navIcon[item]} />
                {item}
              </Link>
            ))}
          </nav>
          <div className="border-t border-[var(--border)] p-4">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-[var(--border)] text-xs text-[var(--muted-strong)]">
                AC
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-[var(--foreground)]">Account</p>
                <p className="truncate text-xs text-[var(--muted)]">account@company.com</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 lg:h-screen lg:overflow-y-auto">
          <header className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:px-8 lg:flex lg:h-20 lg:items-center lg:py-0">
            <div className="lg:hidden">
              <BrandMark />
            </div>
            <div className="mt-4 lg:mt-0">
              <h1 className="text-xl font-medium tracking-[-0.02em]">{title}</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
