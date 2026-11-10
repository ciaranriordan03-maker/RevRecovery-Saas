"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "../brand";
import { Button } from "../button";
import { Icon } from "../ui-icon";
import { onboardingSteps, type OnboardingStep } from "../../lib/data";
import {
  evaluateOnboardingReadiness,
  type OnboardingReadiness,
} from "../../lib/onboarding/readiness";
import { getStripeConnectHref } from "../../lib/stripe/connect-url";
import type { RecoveryStatusSummary } from "../../lib/recovery/recovery-view";
import type { UserSettings } from "../../lib/settings";

type EmailSettings = UserSettings["email"];

const stepLabels: Record<OnboardingStep, string> = {
  Activate: "Review setup",
  "Connect Stripe": "Connect Stripe",
  "Email Setup": "Email identity",
  "Recovery Preview": "Review sequence",
  Success: "Finish",
  Welcome: "Start",
};

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
  disabled,
  furthestStepIndex,
  setActiveStep,
}: {
  activeStep: OnboardingStep;
  disabled: boolean;
  furthestStepIndex: number;
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
              aria-label={`${index + 1}. ${stepLabels[step]}${index > furthestStepIndex ? ", unavailable" : ""}`}
              className={`flex min-w-max items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${
                step === activeStep
                  ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                  : index <= furthestStepIndex
                    ? "text-[var(--muted-strong)] hover:bg-[var(--background)]"
                    : "text-[var(--muted)] opacity-55"
              }`}
              key={step}
              disabled={disabled || index > furthestStepIndex}
              onClick={() => setActiveStep(step)}
              type="button"
            >
              <span className="flex size-6 items-center justify-center rounded-full border border-current text-xs">
                {index + 1}
              </span>
              {stepLabels[step]}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function StepContent({
  activeStep,
  completionError,
  emailSettings,
  emailSettingsError,
  isCompleting,
  readiness,
  recoverySummary,
  setEmailSettings,
}: {
  activeStep: OnboardingStep;
  completionError: string | null;
  emailSettings: EmailSettings;
  emailSettingsError: string | null;
  isCompleting: boolean;
  readiness: OnboardingReadiness;
  recoverySummary: RecoveryStatusSummary;
  setEmailSettings: (settings: EmailSettings) => void;
}) {
  if (activeStep === "Welcome") {
    return (
      <OnboardingCard
        icon="bolt"
        subtitle="Connect Stripe, add the email identity customers will see, and review your default sequence."
        title="Set up failed-payment recovery"
      >
        <p className="text-sm leading-6 text-[var(--muted)]">
          Finishing setup will not enable delivery or send an email.
        </p>
      </OnboardingCard>
    );
  }

  if (activeStep === "Connect Stripe") {
    return (
      <OnboardingCard
        icon="card"
        subtitle={
          readiness.checks[0].complete
            ? "Your Stripe account is securely connected."
            : "RevRecovery needs a secure connection to identify failed subscription payments."
        }
        title={readiness.checks[0].complete ? "Stripe connected" : "Connect Stripe"}
      >
        {readiness.checks[0].complete ? (
          <div className="flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--success-soft)] px-4 py-3 text-sm font-medium text-[var(--success)]">
            <Icon name="check" className="size-4" />
            Connection confirmed
          </div>
        ) : (
          <>
            <Button
              className="w-full"
              onClick={() => {
                window.location.href = getStripeConnectHref(
                  "/onboarding?step=email-setup",
                );
              }}
            >
              Connect Stripe securely
            </Button>
            <p className="mt-8 text-xs text-[var(--muted)]">
              You will return here after connecting.
            </p>
          </>
        )}
      </OnboardingCard>
    );
  }

  if (activeStep === "Email Setup") {
    return (
      <OnboardingCard
        icon="mail"
        subtitle="Choose the name and email addresses customers will see when recovery is enabled."
        title="Set your customer email identity"
      >
        <div className="space-y-5 text-left">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Sender name
            <input
              className="mt-2 h-[54px] w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-normal text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)]"
              onChange={(event) =>
                setEmailSettings({ ...emailSettings, senderName: event.target.value })
              }
              placeholder="RevRecovery"
              required
              type="text"
              value={emailSettings.senderName}
            />
          </label>
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Reply-to email
            <input
              className="mt-2 h-[54px] w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-normal text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)]"
              onChange={(event) =>
                setEmailSettings({ ...emailSettings, replyToEmail: event.target.value })
              }
              placeholder="you@company.com"
              required
              type="email"
              value={emailSettings.replyToEmail}
            />
          </label>
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Support email
            <input
              className="mt-2 h-[54px] w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-normal text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)]"
              onChange={(event) =>
                setEmailSettings({ ...emailSettings, supportEmail: event.target.value })
              }
              placeholder="support@company.com"
              required
              type="email"
              value={emailSettings.supportEmail}
            />
          </label>
          {emailSettingsError ? (
            <p aria-live="polite" className="text-sm text-[var(--danger)]" role="alert">
              {emailSettingsError}
            </p>
          ) : null}
        </div>
      </OnboardingCard>
    );
  }

  if (activeStep === "Recovery Preview") {
    return (
      <OnboardingCard
        icon="flow"
        subtitle={`Your default schedule is ${recoverySummary.scheduleLabel.toLowerCase()}. You can edit it later in Recovery.`}
        title="Review your recovery sequence"
      >
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-center gap-3">
            {recoverySummary.timings.map((timing, index) => (
              <div className="flex items-center gap-3" key={timing}>
                {index > 0 ? <div className="h-px w-8 bg-[var(--border-strong)]" /> : null}
                <div>
                  <div className="flex size-10 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-medium text-white">
                    {index + 1}
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted)]">{timing}</p>
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
        subtitle="These are the two requirements for opening your RevRecovery workspace."
        title="Review your setup"
      >
        <div className="space-y-3 text-left">
          {readiness.checks.map((check) => (
            <div
              className={`rounded-[var(--radius-control)] border px-4 py-3 ${
                check.complete
                  ? "border-[var(--border)] bg-[var(--surface)]"
                  : "border-[var(--danger-border)] bg-[var(--danger-soft)]"
              }`}
              key={check.id}
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={`mt-0.5 size-4 ${check.complete ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
                  name={check.complete ? "check" : "alert"}
                />
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {check.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    {check.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
          Completing onboarding does not turn on recovery delivery.
        </p>
      </OnboardingCard>
    );
  }

  return (
    <OnboardingCard
      icon="check"
      subtitle="Your setup is saved. Open the workspace to review recovery settings before enabling any delivery."
      title="Ready to open your workspace"
    >
      <div className="rounded-[var(--radius-control)] bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]">
        Stripe and your customer email identity are ready.
      </div>
      {completionError ? (
        <p
          aria-live="assertive"
          className="mt-4 rounded-[var(--radius-control)] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]"
          role="alert"
        >
          {completionError}
        </p>
      ) : null}
      {isCompleting ? (
        <p aria-live="polite" className="mt-4 text-sm text-[var(--muted)]">
          Opening your workspace…
        </p>
      ) : null}
    </OnboardingCard>
  );
}

export function OnboardingFlow({
  initialEmailSettings,
  initialReadiness,
  initialStep = "Welcome",
  recoverySummary,
}: {
  initialEmailSettings: EmailSettings;
  initialReadiness: OnboardingReadiness;
  initialStep?: OnboardingStep;
  recoverySummary: RecoveryStatusSummary;
}) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<OnboardingStep>(initialStep);
  const [emailSettings, setEmailSettings] = useState(initialEmailSettings);
  const [emailSettingsError, setEmailSettingsError] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSavingEmailSettings, setIsSavingEmailSettings] = useState(false);
  const [readiness, setReadiness] = useState(initialReadiness);
  const [furthestStepIndex, setFurthestStepIndex] = useState(() =>
    onboardingSteps.indexOf(initialStep),
  );
  const activeIndex = onboardingSteps.indexOf(activeStep);
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === onboardingSteps.length - 1;
  const stripeConnected = readiness.checks.find(
    (check) => check.id === "stripe_connection",
  )?.complete ?? false;

  function goPrevious() {
    setActiveStep(onboardingSteps[Math.max(activeIndex - 1, 0)]);
  }

  async function saveEmailSettings() {
    if (isSavingEmailSettings) {
      return false;
    }

    setIsSavingEmailSettings(true);
    setEmailSettingsError(null);

    try {
      const response = await fetch("/api/settings", {
        body: JSON.stringify({ email: emailSettings }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const result = (await response.json()) as {
        error?: string;
        settings?: UserSettings;
      };

      if (!response.ok) {
        setEmailSettingsError(result.error ?? "Unable to save email settings.");
        return false;
      }

      if (result.settings?.email) {
        setEmailSettings(result.settings.email);
      }

      setReadiness((currentReadiness) =>
        evaluateOnboardingReadiness({
          emailIdentityConfigured: true,
          stripeConnected:
            currentReadiness.checks.find(
              (check) => check.id === "stripe_connection",
            )?.complete ?? false,
        }),
      );

      return true;
    } catch {
      setEmailSettingsError("Unable to save email settings. Please try again.");
      return false;
    } finally {
      setIsSavingEmailSettings(false);
    }
  }

  async function requestStep(nextStep: OnboardingStep) {
    const nextIndex = onboardingSteps.indexOf(nextStep);

    if (
      activeStep === "Email Setup" &&
      nextIndex > activeIndex &&
      !(await saveEmailSettings())
    ) {
      return;
    }

    setActiveStep(nextStep);
    setFurthestStepIndex((currentIndex) => Math.max(currentIndex, nextIndex));
  }

  function goNext() {
    const nextStep = onboardingSteps[
      Math.min(activeIndex + 1, onboardingSteps.length - 1)
    ];
    void requestStep(nextStep);
  }

  async function completeOnboarding() {
    if (isCompleting) {
      return;
    }

    setCompletionError(null);
    setIsCompleting(true);

    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setCompletionError(
          result.error ?? "We could not finish setup. Review the required steps and try again.",
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setCompletionError("We could not finish setup. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  }

  const isBusy = isSavingEmailSettings || isCompleting;
  const canContinue = activeStep !== "Connect Stripe" || stripeConnected;
  const nextLabel =
    activeStep === "Welcome"
      ? "Start setup"
      : activeStep === "Email Setup"
        ? "Save and continue"
        : activeStep === "Activate"
          ? "Review and finish"
          : "Continue";

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <StepNav
        activeStep={activeStep}
        disabled={isBusy}
        furthestStepIndex={furthestStepIndex}
        setActiveStep={(step) => void requestStep(step)}
      />
      <StepContent
        activeStep={activeStep}
        completionError={completionError}
        emailSettings={emailSettings}
        emailSettingsError={emailSettingsError}
        isCompleting={isCompleting}
        readiness={readiness}
        recoverySummary={recoverySummary}
        setEmailSettings={setEmailSettings}
      />
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Button disabled={isFirst} onClick={goPrevious} variant="secondary">
            Previous
          </Button>
          {isLast ? (
            <Button disabled={isBusy || !readiness.ready} onClick={() => void completeOnboarding()}>
              {isCompleting ? "Opening workspace…" : "Open workspace"}
            </Button>
          ) : (
            <Button disabled={isBusy || !canContinue} onClick={goNext}>
              {isSavingEmailSettings ? "Saving…" : nextLabel}
            </Button>
          )}
        </div>
      </footer>
    </main>
  );
}
