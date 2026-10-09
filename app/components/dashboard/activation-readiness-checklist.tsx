import Link from "next/link";
import type {
  ActivationReadiness,
  ActivationReadinessState,
} from "../../lib/recovery/activation-readiness";

const stateCopy: Record<
  ActivationReadinessState,
  { description: string; label: string }
> = {
  attention_required: {
    description: "A previously required recovery dependency needs attention.",
    label: "Attention required",
  },
  not_ready: {
    description: "Complete the required items before running a recovery test.",
    label: "Not ready",
  },
  ready_for_live: {
    description: "The recorded safeguards support live recovery. Activation remains manual.",
    label: "Ready for live recovery",
  },
  ready_for_test: {
    description: "Core setup is complete enough for a controlled test.",
    label: "Ready to test",
  },
};

const statusMark = {
  complete: "✓",
  required: "!",
  warning: "•",
} as const;

const correctiveActions: Partial<
  Record<
    ActivationReadiness["checks"][number]["id"],
    { href: string; label: string }
  >
> = {
  controlled_test: {
    href: "/dashboard/recovery?step=customize#recovery-delivery",
    label: "Configure test mode",
  },
  email_identity: {
    href: "/dashboard/recovery?step=customize#email-identity",
    label: "Complete email settings",
  },
  recovery_configuration: {
    href: "/dashboard/recovery?step=customize#recovery-delivery",
    label: "Configure recovery",
  },
  sending_domain: {
    href: "/dashboard/recovery?step=customize#sending-domain",
    label: "Configure sending domain",
  },
  stripe_communication_overlap: {
    href: "/dashboard/recovery?step=customize#stripe-overlap-guidance",
    label: "Review guidance",
  },
  stripe_connection: {
    href: "/dashboard/settings#stripe-integration",
    label: "Connect Stripe",
  },
  test_recipient: {
    href: "/dashboard/recovery?step=customize#recovery-delivery",
    label: "Add test recipient",
  },
  webhook_health: {
    href: "/dashboard/settings#stripe-integration",
    label: "Review Stripe connection",
  },
};

export function ActivationReadinessChecklist({
  readiness,
}: {
  readiness: ActivationReadiness;
}) {
  const summary = stateCopy[readiness.state];

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
            Activation readiness
          </p>
          <h2 className="mt-2 text-lg font-medium text-[var(--foreground)]">
            {summary.label}
          </h2>
          <p className="mt-1 text-sm leading-5 text-[var(--muted-strong)]">
            {summary.description}
          </p>
        </div>
        <Link
          className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
          href="/dashboard/recovery?step=customize"
        >
          Review settings
        </Link>
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {readiness.checks.map((item) => {
          const action = item.status === "complete" ? null : correctiveActions[item.id];
          return (
          <li
            className="flex gap-3 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4"
            key={item.id}
          >
            <span
              aria-hidden="true"
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                item.status === "complete"
                  ? "bg-[var(--success-soft)] text-[var(--success)]"
                  : item.status === "required"
                    ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                    : "bg-[var(--warning-soft)] text-[var(--warning-text)]"
              }`}
            >
              {statusMark[item.status]}
            </span>
            <div>
              <h3 className="text-sm font-medium text-[var(--foreground)]">
                {item.label}
              </h3>
              <p className="mt-1 text-xs leading-4 text-[var(--muted)]">
                {item.detail}
              </p>
              {action ? (
                <Link
                  className="mt-2 inline-flex text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
                  href={action.href}
                >
                  {action.label}
                </Link>
              ) : null}
            </div>
          </li>
          );
        })}
      </ul>
    </section>
  );
}
