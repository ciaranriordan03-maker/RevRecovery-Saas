import type { Metadata } from "next";
import { OnboardingFlow } from "../components/onboarding/onboarding-flow";
import { requireIncompleteOnboarding } from "../lib/auth";
import { onboardingSteps, type OnboardingStep } from "../lib/data";

export const metadata: Metadata = {
  title: "Onboarding | RecoverFlow",
  description: "Set up automated failed payment recovery in RecoverFlow.",
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
  await requireIncompleteOnboarding();
  const params = await searchParams;
  return <OnboardingFlow initialStep={getInitialStep(params?.step)} />;
}
