import Link from "next/link";
import type { ActivationReadiness } from "../../lib/recovery/activation-readiness";
import { recoveryReadinessActions } from "../../lib/recovery/readiness-actions";
import { Icon } from "../ui-icon";

export function RecoverySetupStatus({
  readiness,
}: {
  readiness: ActivationReadiness;
}) {
  const incompleteChecks = readiness.checks.filter(
    (check) => check.status !== "complete",
  );
  const hasIssues = incompleteChecks.length > 0;
  const issueLabel = `${incompleteChecks.length} ${
    incompleteChecks.length === 1 ? "item needs" : "items need"
  } attention`;

  return (
    <details
      className={`group overflow-hidden rounded-[var(--radius-dashboard-card)] border bg-[var(--surface)] ${
        hasIssues
          ? "border-[var(--warning)]"
          : "border-[var(--border)]"
      }`}
      open={hasIssues}
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
              hasIssues
                ? "bg-[var(--warning-soft)] text-[var(--warning-text)]"
                : "bg-[var(--success-soft)] text-[var(--success)]"
            }`}
          >
            <Icon className="size-4" name={hasIssues ? "alert" : "check"} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                Setup status
              </h2>
              <span
                className={`rounded-[6px] px-2 py-1 text-xs font-semibold ${
                  hasIssues
                    ? "bg-[var(--warning-soft)] text-[var(--warning-text)]"
                    : "bg-[var(--success-soft)] text-[var(--success)]"
                }`}
              >
                {hasIssues ? issueLabel : "Complete"}
              </span>
            </div>
            <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
              {hasIssues
                ? "Review anything that could prevent testing or customer recovery."
                : "Your core recovery setup is complete. Open this section whenever you want to review it."}
            </p>
          </div>
        </div>
        <Icon
          className="size-4 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180"
          name="chevron-down"
        />
      </summary>

      <div className="border-t border-[var(--border)] bg-[var(--background)]">
        {hasIssues ? (
          <ul className="divide-y divide-[var(--border)]">
            {incompleteChecks.map((check) => {
              const action = recoveryReadinessActions[check.id];

              return (
                <li
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  key={check.id}
                >
                  <div className="flex min-w-0 gap-3">
                    <span
                      className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                        check.status === "required"
                          ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                          : "bg-[var(--warning-soft)] text-[var(--warning-text)]"
                      }`}
                    >
                      <Icon className="size-4" name="alert" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">
                        {check.label}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                        {check.detail}
                      </p>
                    </div>
                  </div>
                  {action ? (
                    <Link
                      className="ml-11 inline-flex min-h-10 shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] focus-visible:rounded-[var(--radius-control)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:ml-0"
                      href={action.href}
                    >
                      {action.label}
                      <Icon className="size-4" name="arrow-right" />
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-4 text-sm leading-6 text-[var(--muted)] sm:px-6">
            Stripe, recovery messages, test settings, and delivery safeguards are
            currently configured. No action is required.
          </p>
        )}
      </div>
    </details>
  );
}
