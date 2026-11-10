import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalsSource = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const buttonSource = readFileSync(
  new URL("../app/components/button.tsx", import.meta.url),
  "utf8",
);
const shellSource = readFileSync(
  new URL("../app/components/dashboard/app-shell.tsx", import.meta.url),
  "utf8",
);
const authStatusSource = readFileSync(
  new URL("../app/components/auth/auth-status-panel.tsx", import.meta.url),
  "utf8",
);
const recommendationsSource = readFileSync(
  new URL("../app/components/dashboard/optimize-content.tsx", import.meta.url),
  "utf8",
);
const recommendationSummarySource = readFileSync(
  new URL("../app/components/dashboard/recommendation-impact-summary.tsx", import.meta.url),
  "utf8",
);

describe("shared UI foundations", () => {
  it("uses one dashboard card radius and defines both shared shadows", () => {
    expect(globalsSource).toContain("--radius-card: 12px");
    expect(globalsSource).toContain("--radius-dashboard-card: var(--radius-card)");
    expect(globalsSource).toContain("--shadow-subtle:");
    expect(globalsSource).toContain("--shadow-card:");
  });

  it("gives shared controls a visible focus state and touch-friendly minimum height", () => {
    expect(globalsSource).toContain(":where(button, a, input, select, textarea, summary):focus-visible");
    expect(buttonSource).toContain("min-h-11");
    expect(buttonSource).toContain("focus-visible:outline-[var(--primary)]");
    expect(shellSource).toContain("Recommendations");
    expect(shellSource).toContain("min-h-11");
  });

  it("announces authentication feedback with the appropriate live role", () => {
    expect(authStatusSource).toContain('role={isError ? "alert" : "status"}');
    expect(authStatusSource).toContain('aria-live={isError ? "assertive" : "polite"}');
    expect(authStatusSource).toContain("border-[var(--danger-border)]");
  });

  it("keeps recommendations on calm, neutral surfaces", () => {
    expect(recommendationsSource).not.toContain("bg-gradient");
    expect(recommendationsSource).toContain("Recommended next steps");
    expect(recommendationSummarySource).toContain("Revenue at risk");
    expect(recommendationSummarySource).toContain("bg-[var(--surface)]");
  });
});
