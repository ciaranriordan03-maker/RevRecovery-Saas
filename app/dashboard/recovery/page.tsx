import type { Metadata } from "next";
import { AppShell } from "../../components/dashboard/app-shell";
import { RecoveryContent } from "../../components/dashboard/recovery-content";
import { requireCompletedOnboarding } from "../../lib/auth";

export const metadata: Metadata = {
  title: "Recovery Flow | RecoverFlow",
  description: "Review and activate the RecoverFlow email recovery sequence.",
};

type RecoveryPageProps = {
  searchParams?: Promise<{
    step?: string;
  }>;
};

const pageCopy = {
  activate: {
    subtitle: "Review and launch your recovery flow",
    title: "Ready to Activate",
  },
  customize: {
    subtitle: "Adjust tone and audience for your brand",
    title: "Customize Recovery",
  },
  sequence: {
    subtitle: "Pre-built email sequence ready to activate",
    title: "Recovery Flow",
  },
} as const;

export default async function RecoveryPage({ searchParams }: RecoveryPageProps) {
  await requireCompletedOnboarding();
  const params = await searchParams;
  const mode =
    params?.step === "activate"
      ? "activate"
      : params?.step === "customize"
        ? "customize"
        : "sequence";

  return (
    <AppShell
      active="Recovery"
      subtitle={pageCopy[mode].subtitle}
      title={pageCopy[mode].title}
    >
      <RecoveryContent mode={mode} />
    </AppShell>
  );
}
