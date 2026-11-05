import type { Metadata } from "next";
import { AppShell } from "../../components/dashboard/app-shell";
import { RecoveryContent } from "../../components/dashboard/recovery-content";
import { requireCompletedOnboarding } from "../../lib/auth";
import {
  getRecoveryPageMode,
  getRecoveryWorkspaceView,
  loadRecoveryPageData,
} from "../../lib/server/recovery-page-data";

export const metadata: Metadata = {
  title: "Recovery Flow | RevRecovery",
  description: "Review the RevRecovery email recovery sequence.",
};

type RecoveryPageProps = {
  searchParams?: Promise<{ step?: string; view?: string }>;
};

const pageCopy = {
  review: { subtitle: "Confirm how automated recovery operates", title: "Review Recovery Flow" },
  customize: { subtitle: "Review the settings currently used for recovery", title: "Recovery Settings" },
  sequence: { subtitle: "Monitor failed-payment recovery", title: "Recovery" },
} as const;

export default async function RecoveryPage({ searchParams }: RecoveryPageProps) {
  const { claims } = await requireCompletedOnboarding();
  const params = await searchParams;
  const mode = getRecoveryPageMode(params?.step);
  const view = getRecoveryWorkspaceView(params?.view);
  const accountEmail = typeof claims.email === "string" ? claims.email : "Account owner email unavailable";
  const content = await loadRecoveryPageData({
    accountEmail,
    mode,
    userId: claims.sub,
  });

  return (
    <AppShell
      active="Recovery"
      showPageHeading={mode !== "sequence"}
      subtitle={pageCopy[mode].subtitle}
      title={pageCopy[mode].title}
    >
      <RecoveryContent {...content} view={view} />
    </AppShell>
  );
}
