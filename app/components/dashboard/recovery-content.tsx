import Link from "next/link";
import { Button } from "../button";
import { Icon } from "../ui-icon";
import {
  activationBenefits,
  recoveryAudienceOptions,
  recoveryEmails,
  recoveryEmailTabs,
  recoveryToneOptions,
} from "../../lib/data";

type RecoveryContentProps = {
  mode?: "sequence" | "customize" | "activate";
};

type ChoiceOptionProps = {
  body: string;
  selected: boolean;
  title: string;
};

function ChoiceOption({ body, selected, title }: ChoiceOptionProps) {
  return (
    <button
      className={`w-full rounded-[var(--radius-control)] border p-4 text-left transition ${
        selected
          ? "border-[var(--primary)] bg-[var(--primary-soft)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
      }`}
      type="button"
    >
      <span className="block text-sm font-medium text-[var(--muted-strong)]">
        {title}
      </span>
      <span className="mt-1 block text-xs text-[var(--muted)]">{body}</span>
    </button>
  );
}

function SmartDefaultsCard() {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-[var(--foreground)]">
            Use smart defaults
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            AI-optimized settings for best results
          </p>
        </div>
        <button
          aria-pressed="true"
          className="flex h-6 w-10 shrink-0 items-center justify-end rounded-full bg-[var(--primary)] p-1"
          type="button"
        >
          <span className="size-4 rounded-full bg-[var(--surface)]" />
        </button>
      </div>
    </section>
  );
}

function RecoverySettingsCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <h2 className="text-sm font-medium text-[var(--muted-strong)]">
        {title}
      </h2>
      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function EmailPreviewTabs() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {recoveryEmailTabs.map((tab) => {
        const selected = tab === "Email 3";

        return (
          <button
            className={`h-10 rounded-[var(--radius-control)] border text-sm font-medium transition ${
              selected
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-subtle)] hover:border-[var(--border-strong)]"
            }`}
            key={tab}
            type="button"
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

function Token({
  children,
  tone = "primary",
}: {
  children: React.ReactNode;
  tone?: "primary" | "warning";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-[var(--token-soft)] text-[var(--token-text)]"
      : "bg-[var(--token-warning-soft)] text-[var(--token-warning-text)]";

  return (
    <span className={`rounded px-1.5 py-0.5 font-medium ${toneClass}`}>
      {children}
    </span>
  );
}

function EmailPreviewCard() {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-medium text-[var(--foreground)]">
          Email Preview{" "}
          <span className="font-normal text-[var(--muted)]">· Day 7</span>
        </h2>
        <button
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--primary-soft)] px-3 text-sm font-medium text-[var(--primary)] transition hover:bg-[var(--primary-border)]"
          type="button"
        >
          <Icon name="edit" className="size-4" />
          Edit Email
        </button>
      </div>

      <div className="mt-6 space-y-3 text-sm">
        <div>
          <p className="text-xs text-[var(--muted)]">From:</p>
          <p className="mt-1 text-[var(--foreground)]">
            billing@yourcompany.com
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--muted)]">Subject:</p>
          <p className="mt-1 text-[var(--foreground)]">
            Final notice: Account will be paused soon
          </p>
        </div>
      </div>

      <div className="my-5 border-t border-[var(--border)]" />

      <div className="space-y-4 text-sm leading-6 text-[var(--text-subtle)]">
        <p>
          Hi <Token>{"{name}"}</Token>,
        </p>
        <p>
          Your account will be paused in <Token tone="warning">48 hours</Token>{" "}
          if we don&apos;t receive payment.
        </p>
        <p>Please update your payment method to avoid any interruption:</p>
        <Button className="h-10 px-4 text-sm">Update Payment Method</Button>
        <p>
          <span className="text-[var(--muted)]">Amount due: </span>
          <Token>{"{amount}"}</Token>
        </p>
        <p>Questions? We&apos;re here to help - just reply to this email.</p>
        <div>
          <p>Thanks,</p>
          <p>The Team</p>
        </div>
      </div>
    </section>
  );
}

function RecoverySequence() {
  return (
    <div className="px-5 py-8 sm:px-8 xl:px-[143px]">
      <div className="mx-auto flex max-w-[896px] flex-col gap-8">
        <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <p className="text-sm leading-5 text-[var(--muted-strong)]">
            We&apos;ve created a proven 3-step email sequence that recovers 65%
            of failed payments on average. Each email is timed to maximize
            recovery while maintaining customer trust.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          {recoveryEmails.map((email) => (
            <article
              className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
              key={email.title}
            >
              <div className="flex gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary-soft)] text-[var(--primary)]">
                  <Icon name={email.icon} className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-base font-medium tracking-[-0.02em]">
                      {email.title}
                    </h2>
                    <span className={`rounded px-2 py-1 text-xs leading-4 ${email.badgeClass}`}>
                      {email.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-[var(--muted-strong)]">
                    {email.description}
                  </p>
                  <div className="mt-4 rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-4">
                    <p className="text-xs text-[var(--muted)]">Subject line:</p>
                    <p className="mt-1 text-sm text-[var(--foreground)]">
                      {email.subject}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            className="inline-flex h-[50px] items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-6 text-base font-medium text-[var(--text-subtle)] transition hover:bg-[var(--background)]"
            href="/dashboard/recovery?step=customize"
          >
            Customize
          </Link>
          <Link
            className="inline-flex h-[50px] items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-6 text-base font-medium text-white transition hover:bg-[var(--primary-hover)]"
            href="/dashboard/recovery?step=activate"
          >
            Activate Flow
          </Link>
        </div>
      </div>
    </div>
  );
}

function CustomizeRecoveryStep() {
  return (
    <div className="px-5 py-7 sm:px-8 xl:px-10">
      <div className="grid gap-7 xl:grid-cols-[minmax(360px,496px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <SmartDefaultsCard />

          <RecoverySettingsCard title="Email Tone">
            {recoveryToneOptions.map((option) => (
              <ChoiceOption
                body={option.body}
                key={option.title}
                selected={option.selected}
                title={option.title}
              />
            ))}
          </RecoverySettingsCard>

          <RecoverySettingsCard title="Target Audience">
            {recoveryAudienceOptions.map((option) => (
              <ChoiceOption
                body={option.body}
                key={option.title}
                selected={option.selected}
                title={option.title}
              />
            ))}
          </RecoverySettingsCard>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <EmailPreviewTabs />
          <EmailPreviewCard />
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Link
              className="inline-flex h-[50px] items-center text-base font-medium text-[var(--muted-strong)] hover:text-[var(--foreground)]"
              href="/dashboard/recovery"
            >
              Back to flow
            </Link>
            <Link
              className="inline-flex h-[50px] items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-6 text-base font-medium text-white transition hover:bg-[var(--primary-hover)]"
              href="/dashboard/recovery?step=activate"
            >
              Continue to activate
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivationStep() {
  return (
    <div className="px-5 py-8 sm:px-8 xl:px-[155px]">
      <div className="mx-auto flex max-w-[816px] flex-col gap-7">
        <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-medium text-[var(--foreground)]">
            What happens when you activate?
          </h2>
          <div className="mt-5 flex flex-col gap-4">
            {activationBenefits.map((benefit) => (
              <div className="flex gap-4" key={benefit.title}>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary-soft)] text-[var(--primary)]">
                  <Icon name={benefit.icon} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[var(--foreground)]">
                    {benefit.title}
                  </h3>
                  <p className="mt-1 text-xs leading-4 text-[var(--muted)]">
                    {benefit.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[var(--radius-card)] border border-[var(--primary-border)] bg-[var(--primary-soft)] p-6">
          <h2 className="text-sm font-medium text-[var(--foreground)]">
            Projected Impact
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[var(--muted-strong)]">
                Expected Recovery Rate
              </p>
              <p className="mt-2 text-2xl leading-8 text-[var(--primary)]">
                ~65%
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-strong)]">
                Potential Revenue
              </p>
              <p className="mt-2 text-2xl leading-8 text-[var(--success)]">
                $31,200
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="inline-flex h-[50px] items-center text-base font-medium text-[var(--muted-strong)] hover:text-[var(--foreground)]"
            href="/dashboard/recovery?step=customize"
          >
            Back to customize
          </Link>
          <Button className="gap-2">
            <Icon name="bolt" className="size-4" />
            Activate Recovery
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RecoveryContent({ mode = "sequence" }: RecoveryContentProps) {
  if (mode === "activate") {
    return <ActivationStep />;
  }

  if (mode === "customize") {
    return <CustomizeRecoveryStep />;
  }

  return <RecoverySequence />;
}
