import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const globalsSource = readSource("../app/globals.css");
const buttonSource = readSource("../app/components/button.tsx");
const dashboardSource = readSource(
  "../app/components/dashboard/dashboard-content.tsx",
);
const casesSource = readSource(
  "../app/components/dashboard/cases-content.tsx",
);
const caseDetailFrameSource = readSource(
  "../app/components/dashboard/case-detail-frame.tsx",
);

describe("core dashboard page polish", () => {
  it("uses one subtle page entrance and disables it for reduced motion", () => {
    expect(globalsSource).toContain("@keyframes dashboard-page-enter");
    expect(globalsSource).toContain(".dashboard-page-enter");
    expect(globalsSource).toContain("@media (prefers-reduced-motion: reduce)");
    expect(dashboardSource).toContain("dashboard-page-enter");
    expect(casesSource).toContain("dashboard-page-enter");
    expect(caseDetailFrameSource).toContain("dashboard-page-enter");
  });

  it("keeps button feedback quick and reduced-motion aware", () => {
    expect(buttonSource).toContain("motion-safe:duration-150");
    expect(buttonSource).toContain("motion-safe:active:translate-y-px");
    expect(buttonSource).toContain("disabled:translate-y-0");
  });

  it("uses plain, action-oriented page descriptions", () => {
    expect(dashboardSource).toContain(
      "See failed payments, priorities, and what to do next.",
    );
    expect(casesSource).toContain(
      "Review failed payments and decide what to do next.",
    );
  });
});
