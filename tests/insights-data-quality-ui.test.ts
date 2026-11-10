import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contentSource = readFileSync(
  new URL("../app/components/dashboard/insights-content.tsx", import.meta.url),
  "utf8",
);
const dataQualitySource = readFileSync(
  new URL("../app/components/dashboard/insights-data-quality.tsx", import.meta.url),
  "utf8",
);
const methodologySource = readFileSync(
  new URL("../app/components/dashboard/insights-methodology-dialog.tsx", import.meta.url),
  "utf8",
);
const dataReportingSource = readFileSync(
  new URL("../app/components/dashboard/insights-data-reporting.tsx", import.meta.url),
  "utf8",
);
const insightsPageSource = readFileSync(
  new URL("../app/dashboard/insights/page.tsx", import.meta.url),
  "utf8",
);
const settingsSource = readFileSync(
  new URL("../app/components/dashboard/settings-content.tsx", import.meta.url),
  "utf8",
);

describe("Insights reporting explanation and advanced evidence", () => {
  it("keeps the primary navigation focused on Overview and Performance", () => {
    expect(contentSource).toContain('{ hrefLabel: "Overview", label: "Overview", value: "overview" }');
    expect(contentSource).toContain('{ hrefLabel: "Performance", label: "Performance", value: "performance" }');
    expect(contentSource).not.toContain('label: "Evidence & methodology"');
    expect(contentSource).toContain("InsightsMethodologyDialog");
    expect(contentSource).not.toContain('view === "evidence"');
  });

  it("replaces the standalone customer page with an accessible concise dialog", () => {
    expect(methodologySource).toContain("showModal");
    expect(methodologySource).toContain("<dialog");
    expect(methodologySource).toContain("What is included");
    expect(methodologySource).toContain("When comparisons appear");
    expect(methodologySource).toContain("What the figures cannot prove");
    expect(methodologySource).toContain("at least 30 cases");
    expect(methodologySource).toContain("at least 80%");
  });

  it("moves advanced evidence into a secondary settings destination", () => {
    expect(settingsSource).toContain("Data &amp; reporting");
    expect(settingsSource).toContain('/dashboard/settings/data-reporting');
    expect(dataReportingSource).toContain("AdvancedMeasurementEvidence");
    expect(insightsPageSource).toContain('view === "evidence"');
    expect(insightsPageSource).toContain('/dashboard/settings/data-reporting?');
    expect(dataQualitySource).toContain("Advanced technical evidence");
    expect(dataQualitySource).toContain("Download JSON");
    expect(dataQualitySource).toContain("Preview sanitized JSON");
    expect(dataQualitySource).toContain("MeasurementManifestVerification");
    expect(dataReportingSource).not.toMatch(/<details[^>]*\sopen(?:=|\s|>)/);
  });

  it("retains accurate non-causal reporting limits", () => {
    expect(methodologySource).toContain("Reporting is descriptive, not causal.");
    expect(methodologySource).toContain("does not prove it caused the recovery");
    expect(methodologySource).toContain("not automatically confirmed collected revenue");
  });
});
