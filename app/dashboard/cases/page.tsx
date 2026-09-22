import type { Metadata } from "next";
import { AppShell } from "../../components/dashboard/app-shell";
import { CasesContent } from "../../components/dashboard/cases-content";
import { requireCompletedOnboarding } from "../../lib/auth";
import {
  getRecoveryCasesPage,
  normalizeRecoveryCaseFilters,
} from "../../lib/server/recovery-cases";

export const metadata: Metadata = {
  title: "Cases | RevRecovery",
  description: "Investigate failed Stripe subscription-payment recovery cases.",
};

type CasesPageProps = {
  searchParams?: Promise<{
    environment?: string | string[];
    page?: string | string[];
    segment?: string | string[];
    status?: string | string[];
  }>;
};

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const { claims } = await requireCompletedOnboarding();
  const filters = normalizeRecoveryCaseFilters(await searchParams);
  const casesPage = await getRecoveryCasesPage(claims.sub, filters);

  return (
    <AppShell
      active="Cases"
      subtitle="Investigate failed payments and their next recovery action"
      title="Cases"
    >
      <CasesContent page={casesPage} />
    </AppShell>
  );
}
