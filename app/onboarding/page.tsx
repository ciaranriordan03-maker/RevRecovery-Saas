import type { Metadata } from "next";
import { OnboardingFlow } from "../components/onboarding/onboarding-flow";
import { requireIncompleteOnboarding } from "../lib/auth";
import { onboardingSteps, type OnboardingStep } from "../lib/data";
import { getRecoveryModeSettingsForUser } from "../lib/server/recovery-account-settings";
import { buildRecoveryStatusSummary } from "../lib/recovery/recovery-view";
import { getUserSettings } from "../lib/server/settings-store";

export const metadata: Metadata = {
  title: "Onboarding | RevRecovery",
  description: "Set up automated failed payment recovery in RevRecovery.",
};

type OnboardingPageProps = {
  searchParams?: Promise<{
    step?: string;
  }>;
};

function getInitialStep(step: string | undefined): OnboardingStep {
  const mapping: Record<string, OnboardingStep> = {
    activate: "Activate",
    "connect-stripe": "Connect Stripe",
    "email-setup": "Email Setup",
    "recovery-preview": "Recovery Preview",
    success: "Success",
    welcome: "Welcome",
  };

  return mapping[step ?? ""] ?? onboardingSteps[0];
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const { claims } = await requireIncompleteOnboarding();
  const params = await searchParams;
  const accountEmail = typeof claims.email === "string" ? claims.email : "";
  const [recoverySettings, userSettingsRecord] = await Promise.all([
    getRecoveryModeSettingsForUser(claims.sub),
    getUserSettings(claims.sub),
  ]);
  const savedEmailSettings = userSettingsRecord.settings.email;

  return (
    <OnboardingFlow
      initialEmailSettings={{
        replyToEmail: savedEmailSettings.replyToEmail || accountEmail,
        senderName: savedEmailSettings.senderName,
        supportEmail: savedEmailSettings.supportEmail || accountEmail,
      }}
      initialStep={getInitialStep(params?.step)}
      recoverySummary={buildRecoveryStatusSummary(recoverySettings)}
    />
  );
}
