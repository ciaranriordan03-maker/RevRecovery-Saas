import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../app/components/dashboard/insights-content.tsx", import.meta.url),
  "utf8",
);
const methodology = readFileSync(
  new URL("../app/components/dashboard/insights-methodology-dialog.tsx", import.meta.url),
  "utf8",
);
const dataReporting = readFileSync(
  new URL("../app/components/dashboard/insights-data-reporting.tsx", import.meta.url),
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
  it("keeps the founder overview focused on outcomes, contextual confidence, and genuine attention", () => {
    expect(source).toContain("Revenue at risk");
    expect(source).toContain("Value on recovered cases");
    expect(source).toContain("Case outcomes");
    expect(source).toContain("A period trend will appear after both periods have enough completed cases.");
    expect(source).toContain("Early data — based on");
    expect(source).not.toContain("Data confidence");
    expect(source).toContain("Needs attention");
    expect(source).not.toContain("function ReportingReadiness");
  });

  it("uses lightweight methodology help while preserving advanced evidence under settings", () => {
    expect(source).toContain("InsightsMethodologyDialog");
    expect(source).not.toContain("InsightsDataQuality");
    expect(source).not.toContain('label: "Evidence & methodology"');
    expect(methodology).toContain("How these numbers work");
    expect(methodology).toContain("What is included");
    expect(methodology).toContain("When comparisons appear");
    expect(methodology).toContain("What the figures cannot prove");
    expect(dataReporting).toContain("Data &amp; reporting");
    expect(dataReporting).toContain("AdvancedMeasurementEvidence");
  });

  it("provides calm loading and recoverable error states", () => {
    expect(loading).toContain('aria-label="Loading insights"');
    expect(error).toContain("Insights are temporarily unavailable");
    expect(error).toContain("No recovery settings");
    expect(error).toContain("onClick={reset}");
  });
});
