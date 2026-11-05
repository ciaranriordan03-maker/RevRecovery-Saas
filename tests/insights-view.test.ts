import { describe, expect, it } from "vitest";
import { getInsightsView } from "../app/lib/insights-view";

describe("Insights workspace view", () => {
  it("defaults unknown or missing values to the overview", () => {
    expect(getInsightsView()).toBe("overview");
    expect(getInsightsView("unknown")).toBe("overview");
  });

  it("accepts each supported workspace view", () => {
    expect(getInsightsView("overview")).toBe("overview");
    expect(getInsightsView("performance")).toBe("performance");
    expect(getInsightsView("evidence")).toBe("evidence");
    expect(getInsightsView(["performance", "evidence"])).toBe("performance");
  });
});
