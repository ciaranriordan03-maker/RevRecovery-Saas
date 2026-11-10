import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const performanceSource = readFileSync(
  new URL("../app/components/dashboard/insights-performance.tsx", import.meta.url),
  "utf8",
);
const contentSource = readFileSync(
  new URL("../app/components/dashboard/insights-content.tsx", import.meta.url),
  "utf8",
);
const loadingSource = readFileSync(
  new URL("../app/dashboard/insights/loading.tsx", import.meta.url),
  "utf8",
);

describe("Insights performance UI", () => {
  it("uses a concise page heading and a single performance ledger", () => {
    expect(contentSource).toContain("See whether recovery messages are reaching customers and what happened afterward.");
    expect(contentSource).toContain("<InsightsPerformance filter={filter} insights={insights} />");
    expect(performanceSource).toContain("Performance snapshot");
    expect(performanceSource).toContain("Message delivery");
    expect(performanceSource).toContain("Customer engagement");
    expect(performanceSource).toContain("Payment outcomes");
    expect(performanceSource).not.toContain("Communication journey");
  });

  it("keeps descriptive metrics direct and explicitly non-causal", () => {
    expect(performanceSource).toContain("Messages accepted");
    expect(performanceSource).toContain("Confirmed delivered");
    expect(performanceSource).toContain("Unique clicks");
    expect(performanceSource).toContain("Value on recovered cases");
    expect(performanceSource).toContain("These figures are descriptive, not causal.");
    expect(performanceSource).toContain("How these numbers work");
  });

  it("only promotes delivery problems when a recorded outcome needs attention", () => {
    expect(performanceSource).toContain("Delivery needs attention");
    expect(performanceSource).toContain("row.value > 0");
    expect(performanceSource).toContain('href="#delivery-details"');
  });

  it("shows audience and message outcomes without hiding them in dropdowns", () => {
    expect(performanceSource).toContain("Audience comparison");
    expect(performanceSource).toContain("Only one audience has cases in this view.");
    expect(performanceSource).toContain("Message outcomes");
    expect(performanceSource).toContain("Recoveries observed afterward");
    expect(performanceSource).not.toContain('title="Message-by-message outcomes"');
  });

  it("keeps only supporting operational evidence collapsed", () => {
    expect(performanceSource).toContain("Operational detail");
    expect(performanceSource).toContain("Message and case states");
    expect(performanceSource).toContain("should not be read as one funnel");
    expect(performanceSource).toContain('<details');
    expect(performanceSource).not.toContain("h-7 overflow-hidden");
  });

  it("provides honest empty states and a ledger-shaped loading state", () => {
    expect(performanceSource).toContain("No performance data matches this view");
    expect(performanceSource).toContain("Test and Live evidence remain separate.");
    expect(performanceSource).toContain('getInsightsHref(filter, "performance", { period: "all" })');
    expect(loadingSource).toContain("length: 3");
    expect(loadingSource).toContain("sm:grid-cols-[0.8fr_1.2fr]");
  });
});
