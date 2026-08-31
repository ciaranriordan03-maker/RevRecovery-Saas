import type { Metadata } from "next";
import { AppShell } from "../../components/dashboard/app-shell";
import { RecoveryContent } from "../../components/dashboard/recovery-content";
import { requireCompletedOnboarding } from "../../lib/auth";
import { getAtRiskCustomers } from "../../lib/server/at-risk-customers";

export const metadata: Metadata = {
  title: "Recovery Flow | RevRecovery",
  description: "Review the RevRecovery email recovery sequence.",
};

type RecoveryPageProps = {
  searchParams?: Promise<{
    step?: string;
  }>;
};

const pageCopy = {
  review: {
    subtitle: "Confirm how automated recovery operates",
    title: "Review Recovery Flow",
  },
  customize: {
    subtitle: "Adjust tone and audience for your brand",
    title: "Customize Recovery",
  },
  sequence: {
    subtitle: "Automated email sequence for failed payments",
    title: "Recovery Flow",
  },
} as const;

export default async function RecoveryPage({ searchParams }: RecoveryPageProps) {
  const { claims } = await requireCompletedOnboarding();
  const params = await searchParams;
  const mode =
    params?.step === "review" || params?.step === "activate"
      ? "review"
      : params?.step === "customize"
        ? "customize"
        : "sequence";
  const atRiskCustomers = mode === "sequence"
    ? await getAtRiskCustomers(claims.sub)
    : [];

  return (
    <AppShell
      active="Recovery"
      subtitle={pageCopy[mode].subtitle}
      title={pageCopy[mode].title}
    >
      <RecoveryContent atRiskCustomers={atRiskCustomers} mode={mode} />
    </AppShell>
  );
}
