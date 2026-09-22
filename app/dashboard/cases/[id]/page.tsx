import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/dashboard/app-shell";
import { CaseDetailContent } from "../../../components/dashboard/case-detail-content";
import { requireCompletedOnboarding } from "../../../lib/auth";
import { getRecoveryCaseTimeline } from "../../../lib/server/recovery-case-events";
import { getRecoveryCaseById } from "../../../lib/server/recovery-cases";

export const metadata: Metadata = {
  title: "Recovery Case | RevRecovery",
  description: "Review a failed-payment recovery case and its event timeline.",
};

type RecoveryCasePageProps = {
  params: Promise<{ id: string }>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function RecoveryCasePage({ params }: RecoveryCasePageProps) {
  const { claims } = await requireCompletedOnboarding();
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  const recoveryCase = await getRecoveryCaseById(claims.sub, id);
  if (!recoveryCase) {
    notFound();
  }

  const timeline = await getRecoveryCaseTimeline({
    failedPaymentId: recoveryCase.id,
    userId: claims.sub,
  });

  return (
    <AppShell
      active="Cases"
      subtitle="Review the complete failed-payment recovery history"
      title="Case details"
    >
      <CaseDetailContent recoveryCase={recoveryCase} timeline={timeline} />
    </AppShell>
  );
}
