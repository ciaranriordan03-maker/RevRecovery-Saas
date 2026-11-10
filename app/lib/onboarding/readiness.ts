import { onboardingSteps, type OnboardingStep } from "../data";

export type OnboardingReadinessCheck = {
  complete: boolean;
  detail: string;
  id: "stripe_connection" | "email_identity";
  label: string;
  step: OnboardingStep;
};

export type OnboardingReadiness = {
  checks: OnboardingReadinessCheck[];
  ready: boolean;
};

export type OnboardingReadinessInput = {
  emailIdentityConfigured: boolean;
  stripeConnected: boolean;
};

export function evaluateOnboardingReadiness(
  input: OnboardingReadinessInput,
): OnboardingReadiness {
  const checks: OnboardingReadinessCheck[] = [
    {
      complete: input.stripeConnected,
      detail: input.stripeConnected
        ? "Stripe is securely connected."
        : "Connect Stripe before finishing setup.",
      id: "stripe_connection",
      label: "Stripe account",
      step: "Connect Stripe",
    },
    {
      complete: input.emailIdentityConfigured,
      detail: input.emailIdentityConfigured
        ? "Your sender name and customer reply addresses are saved."
        : "Save a sender name and valid reply-to and support emails.",
      id: "email_identity",
      label: "Customer email identity",
      step: "Email Setup",
    },
  ];

  return {
    checks,
    ready: checks.every((check) => check.complete),
  };
}

export function clampOnboardingStep(
  requestedStep: OnboardingStep,
  readiness: OnboardingReadiness,
): OnboardingStep {
  const firstIncompleteCheck = readiness.checks.find((check) => !check.complete);
  const maximumStep = firstIncompleteCheck?.step ?? onboardingSteps.at(-1)!;
  const requestedIndex = onboardingSteps.indexOf(requestedStep);
  const maximumIndex = onboardingSteps.indexOf(maximumStep);

  return onboardingSteps[Math.min(requestedIndex, maximumIndex)];
}
