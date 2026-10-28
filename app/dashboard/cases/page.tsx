import type { Metadata } from "next";
import { AppShell } from "../../components/dashboard/app-shell";
import { CasesContent } from "../../components/dashboard/cases-content";
import { requireCompletedOnboarding } from "../../lib/auth";
import {
  getRecoveryCasesPage,
  normalizeRecoveryCaseFilters,
} from "../../lib/server/recovery-cases";
import { getCasesEnvironmentLabel } from "../../lib/cases-query";

export const metadata: Metadata = {
  title: "Cases | RevRecovery",
  description: "Investigate failed Stripe subscription-payment recovery cases.",
};

type CasesPageProps = {
  searchParams?: Promise<{
    currency?: string | string[];
    environment?: string | string[];
    minimumAmount?: string | string[];
    page?: string | string[];
    segment?: string | string[];
    status?: string | string[];
  }>;
};

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const { claims } = await requireCompletedOnboarding();
  const filters = normalizeRecoveryCaseFilters(await searchParams);
  const casesPage = await getRecoveryCasesPage(claims.sub, filters);
  const environment = getCasesEnvironmentLabel(filters.environment);

  return (
    <AppShell
      active="Cases"
      contextLabel={`Stripe · ${environment}`}
      showPageHeading={false}
      subtitle="Investigate failed payments and their next recovery action"
      title="Cases"
    >
      <CasesContent page={casesPage} />
    </AppShell>
  );
}
