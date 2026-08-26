import type { Metadata } from "next";
import { OnboardingFlow } from "../components/onboarding/onboarding-flow";
import { requireIncompleteOnboarding } from "../lib/auth";
import { onboardingSteps, type OnboardingStep } from "../lib/data";

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

  return (
    <OnboardingFlow
      accountEmail={accountEmail}
      initialStep={getInitialStep(params?.step)}
    />
  );
}
