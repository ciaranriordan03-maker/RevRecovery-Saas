import type {
  RecoveryCaseEnvironmentFilter,
  RecoveryCaseFilters,
  RecoveryCaseSegmentFilter,
  RecoveryCaseStatusFilter,
} from "./server/recovery-cases";

export type CasesQueryFilterOverrides = {
  currency?: string | null;
  environment?: RecoveryCaseEnvironmentFilter;
  minimumAmountInput?: string;
  page?: number;
  segment?: RecoveryCaseSegmentFilter;
  status?: RecoveryCaseStatusFilter;
};

export function getCasesHref(
  filters: RecoveryCaseFilters,
  overrides: CasesQueryFilterOverrides = {},
) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (next.status !== "open") params.set("status", next.status);
  if (next.segment !== "all") params.set("segment", next.segment);
  if (next.environment !== "all") params.set("environment", next.environment);
  if (next.currency) params.set("currency", next.currency.toUpperCase());
  if (next.minimumAmountInput) {
    params.set("minimumAmount", next.minimumAmountInput);
  }
  if (next.page > 1) params.set("page", String(next.page));

  const query = params.toString();
  return query ? `/dashboard/cases?${query}` : "/dashboard/cases";
}

export function getCasesEnvironmentLabel(
  environment: RecoveryCaseEnvironmentFilter,
) {
  if (environment === "all") return "All environments";
  if (environment === "unknown") return "Unknown";
  return environment.charAt(0).toUpperCase() + environment.slice(1);
}
