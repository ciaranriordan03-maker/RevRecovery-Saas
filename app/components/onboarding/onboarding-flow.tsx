"use client";

import { useState } from "react";
import { BrandMark } from "../brand";
import { Button } from "../button";
import { Icon } from "../ui-icon";
import { onboardingSteps, type OnboardingStep } from "../../lib/data";
import { getStripeConnectHref } from "../../lib/stripe/connect-url";

function OnboardingCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-[calc(100vh-188px)] items-center justify-center px-5 py-10">
      <div className="w-full max-w-[448px] text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
          <Icon name={icon} className="size-7" />
        </div>
        <h1 className="mt-8 text-2xl font-medium tracking-[-0.02em] text-[var(--foreground)]">
          {title}
        </h1>
        <p className="mt-3 text-base text-[var(--muted)]">{subtitle}</p>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

function StepNav({
  activeStep,
  setActiveStep,
}: {
  activeStep: OnboardingStep;
  setActiveStep: (step: OnboardingStep) => void;
}) {
  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <BrandMark />
        <nav aria-label="Onboarding steps" className="flex gap-2 overflow-x-auto">
          {onboardingSteps.map((step, index) => (
            <button
              aria-current={step === activeStep ? "step" : undefined}
              className={`flex min-w-max items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium transition ${
                step === activeStep
                  ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "text-[var(--muted-strong)] hover:bg-[var(--background)]"
              }`}
              key={step}
              onClick={() => setActiveStep(step)}
              type="button"
            >
              <span className="flex size-6 items-center justify-center rounded-full border border-current text-xs">
                {index + 1}
              </span>
              {step}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function StepContent({
  activeStep,
  completeOnboarding,
  goNext,
}: {
  activeStep: OnboardingStep;
  completeOnboarding: () => void;
  goNext: () => void;
}) {
  if (activeStep === "Welcome") {
    return (
      <OnboardingCard
        icon="bolt"
        subtitle="Setup takes 2 minutes"
        title="Recover failed payments automatically"
      >
        <Button className="w-full" onClick={goNext}>
          Get started
        </Button>
      </OnboardingCard>
    );
  }

  if (activeStep === "Connect Stripe") {
    return (
      <OnboardingCard
        icon="card"
        subtitle="We'll detect failed payments automatically"
        title="Connect Stripe"
      >
        <Button
          className="w-full"
          onClick={() => {
            window.location.href = getStripeConnectHref(
              "/onboarding?step=email-setup",
            );
          }}
        >
          Connect Stripe
        </Button>
        <p className="mt-8 text-xs text-[var(--muted)]">
          Secure Stripe connection
        </p>
      </OnboardingCard>
    );
  }

  if (activeStep === "Email Setup") {
    return (
      <OnboardingCard
        icon="mail"
        subtitle="One email for customer replies"
        title="Email setup"
      >
        <input
          className="h-[54px] w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-left text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)]"
          defaultValue="support@yourcompany.com"
        />
      </OnboardingCard>
    );
  }

  if (activeStep === "Recovery Preview") {
    return (
      <OnboardingCard
        icon="flow"
        subtitle="3 emails, proven to recover 71% of failed payments"
        title="Recovery flow ready"
      >
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-center gap-3">
            {["Day 1", "Day 3", "Day 7"].map((day, index) => (
              <div className="flex items-center gap-3" key={day}>
                {index > 0 ? <div className="h-px w-8 bg-[var(--border-strong)]" /> : null}
                <div>
                  <div className="flex size-10 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-medium text-white">
                    {index + 1}
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted)]">{day}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </OnboardingCard>
    );
  }

  if (activeStep === "Activate") {
    return (
      <OnboardingCard
        icon="check"
        subtitle="Ready to start recovering failed payments"
        title="You're all set"
      >
        <Button className="w-full" onClick={goNext}>
          Activate recovery
        </Button>
      </OnboardingCard>
    );
  }

  return (
    <OnboardingCard
      icon="check"
      subtitle="Recovery is running. We'll email you when we recover your first failed payment."
      title="You're live"
    >
      <Button
        className="w-full"
        onClick={completeOnboarding}
      >
        Go to dashboard
      </Button>
    </OnboardingCard>
  );
}

export function OnboardingFlow({
  initialStep = "Welcome",
}: {
  initialStep?: OnboardingStep;
}) {
  const [activeStep, setActiveStep] = useState<OnboardingStep>(initialStep);
  const activeIndex = onboardingSteps.indexOf(activeStep);
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === onboardingSteps.length - 1;

  function goPrevious() {
    setActiveStep(onboardingSteps[Math.max(activeIndex - 1, 0)]);
  }

  function goNext() {
    setActiveStep(onboardingSteps[Math.min(activeIndex + 1, onboardingSteps.length - 1)]);
  }

  async function completeOnboarding() {
    const response = await fetch("/api/onboarding/complete", {
      method: "POST",
    });

    if (!response.ok) {
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <StepNav activeStep={activeStep} setActiveStep={setActiveStep} />
      <StepContent
        activeStep={activeStep}
        completeOnboarding={() => void completeOnboarding()}
        goNext={goNext}
      />
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Button disabled={isFirst} onClick={goPrevious} variant="secondary">
            Previous
          </Button>
          {isLast ? (
            <Button onClick={() => void completeOnboarding()}>
              Go to dashboard
            </Button>
          ) : (
            <Button onClick={goNext}>Next</Button>
          )}
        </div>
      </footer>
    </main>
  );
}
