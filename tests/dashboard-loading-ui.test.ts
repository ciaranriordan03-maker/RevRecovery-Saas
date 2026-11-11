import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sharedShell = readFileSync(
  new URL(
    "../app/components/dashboard/dashboard-loading-shell.tsx",
    import.meta.url,
  ),
  "utf8",
);

const routeLoaders = [
  ["Dashboard", "../app/dashboard/loading.tsx", "Loading dashboard"],
  ["Cases", "../app/dashboard/cases/loading.tsx", "Loading cases"],
  ["Recovery", "../app/dashboard/recovery/loading.tsx", "Loading recovery"],
  ["Insights", "../app/dashboard/insights/loading.tsx", "Loading insights"],
  [
    "Recommendations",
    "../app/dashboard/optimize/loading.tsx",
    "Loading recommendations",
  ],
  ["Settings", "../app/dashboard/settings/loading.tsx", "Loading settings"],
] as const;

describe("dashboard loading UI", () => {
  it("keeps the recognizable application shell while route data streams", () => {
    expect(sharedShell).toContain("BrandMark");
    expect(sharedShell).toContain("LoadingNavigation");
    expect(sharedShell).toContain("--dashboard-sidebar-width");
    expect(sharedShell).toContain('aria-label={ariaLabel}');
    expect(sharedShell).toContain('aria-busy="true"');
  });

  it("respects reduced-motion preferences", () => {
    expect(sharedShell).toContain("motion-safe:animate-pulse");
    expect(sharedShell).not.toContain('className="animate-pulse');
  });

  it.each(routeLoaders)(
    "gives %s a route-shaped loading state",
    (activeLabel, path, ariaLabel) => {
      const source = readFileSync(new URL(path, import.meta.url), "utf8");

      expect(source).toContain("DashboardLoadingShell");
      expect(source).toContain(`activeLabel="${activeLabel}"`);
      expect(source).toContain(`ariaLabel="${ariaLabel}"`);
      expect(source).toContain("LoadingBlock");
    },
  );
});
