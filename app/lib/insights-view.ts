export const INSIGHTS_VIEWS = ["overview", "performance", "evidence"] as const;

export type InsightsView = (typeof INSIGHTS_VIEWS)[number];

export function getInsightsView(value?: string | string[]): InsightsView {
  const normalized = Array.isArray(value) ? value[0] : value;

  return INSIGHTS_VIEWS.includes(normalized as InsightsView)
    ? normalized as InsightsView
    : "overview";
}
