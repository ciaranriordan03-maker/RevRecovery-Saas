import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../app/components/dashboard/insights-content.tsx", import.meta.url),
  "utf8",
);
const loading = readFileSync(
  new URL("../app/dashboard/insights/loading.tsx", import.meta.url),
  "utf8",
);
const error = readFileSync(
  new URL("../app/dashboard/insights/error.tsx", import.meta.url),
  "utf8",
);

describe("Insights overview UI", () => {
  it("keeps the founder overview focused on outcomes, trend, trust, and genuine attention", () => {
    expect(source).toContain("Revenue at risk");
    expect(source).toContain("Value on recovered cases");
    expect(source).toContain("Case outcomes");
    expect(source).toContain("Trend not measurable yet");
    expect(source).toContain("Data confidence");
    expect(source).toContain("Needs attention");
    expect(source).not.toContain("function ReportingReadiness");
  });

  it("keeps technical reporting detail under Evidence and methodology", () => {
    expect(source).toContain('title="Descriptive reporting"');
    expect(source).toContain("DescriptiveBaselinePanel");
    expect(source).toContain("CohortComparisonPanel");
    expect(source).toContain('title="Audit record"');
  });

  it("provides calm loading and recoverable error states", () => {
    expect(loading).toContain('aria-label="Loading insights"');
    expect(error).toContain("Insights are temporarily unavailable");
    expect(error).toContain("No recovery settings");
    expect(error).toContain("onClick={reset}");
  });
});
