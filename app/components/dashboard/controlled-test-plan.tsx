"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CONTROLLED_TEST_STEPS,
  type ControlledTestEligibility,
  SYNTHETIC_TEST_CONFIRMATION,
} from "../../lib/recovery/controlled-test-plan";

const actionByCheck: Record<
  ControlledTestEligibility["checks"][number]["id"],
  { href: string; label: string }
> = {
  email_identity: {
    href: "/dashboard/recovery?step=customize#email-identity",
    label: "Complete email settings",
  },
  stripe_sandbox: {
    href: "/dashboard/settings#stripe-integration",
    label: "Review Stripe connection",
  },
  test_mode: {
    href: "/dashboard/recovery?step=customize#recovery-delivery",
    label: "Configure Test mode",
  },
  test_recipient: {
    href: "/dashboard/recovery?step=customize#recovery-delivery",
    label: "Add test recipient",
  },
};

export function ControlledTestPlan({
  eligibility,
}: {
  eligibility: ControlledTestEligibility;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdCase, setCreatedCase] = useState<{ caseUrl: string; invoiceId: string } | null>(null);

  async function createTestCase() {
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/recovery/test-case", {
        body: JSON.stringify({ confirmation: SYNTHETIC_TEST_CONFIRMATION }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json() as {
        error?: string;
        testCase?: { caseUrl: string; invoiceId: string };
      };
      if (!response.ok || !payload.testCase) {
        throw new Error(payload.error ?? "Unable to create the synthetic case.");
      }
      setCreatedCase(payload.testCase);
      setConfirmed(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create the synthetic case.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section
      className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
      id="controlled-test-plan"
    >
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
        Guided controlled test
      </p>
      <h2 className="mt-2 text-lg font-medium text-[var(--foreground)]">
        {eligibility.eligible ? "Eligible for a controlled test" : "Complete test prerequisites"}
      </h2>
      <p className="mt-2 text-sm leading-5 text-[var(--muted-strong)]">
        This workflow can create one synthetic database case only after every safety check passes and you confirm the action. It does not call Stripe, schedule recovery messages, send email, or change live recovery.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {eligibility.checks.map((item) => {
          const action = actionByCheck[item.id];
          return (
            <div
              className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4"
              key={item.id}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-5 items-center justify-center rounded-full text-xs font-semibold ${
                    item.passed
                      ? "bg-[var(--success-soft)] text-[var(--success)]"
                      : "bg-[var(--danger-soft)] text-[var(--danger)]"
                  }`}
                >
                  {item.passed ? "✓" : "!"}
                </span>
                <h3 className="text-sm font-medium text-[var(--foreground)]">{item.label}</h3>
              </div>
              <p className="mt-2 text-xs leading-4 text-[var(--muted)]">{item.detail}</p>
              {!item.passed ? (
                <Link
                  className="mt-2 inline-flex text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
                  href={action.href}
                >
                  {action.label}
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>

      <ol className="mt-6 grid gap-3">
        {CONTROLLED_TEST_STEPS.map((step, index) => (
          <li className="flex gap-3" key={step.title}>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-xs font-semibold text-[var(--primary)]">
              {index + 1}
            </span>
            <div>
              <h3 className="text-sm font-medium text-[var(--foreground)]">{step.title}</h3>
              <p className="mt-1 text-xs leading-4 text-[var(--muted)]">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4">
        <h3 className="text-sm font-medium text-[var(--foreground)]">Create synthetic sandbox case</h3>
        <p className="mt-1 text-xs leading-4 text-[var(--muted)]">
          The case is clearly labelled synthetic, uses €79 of test value, remains in Detected status, and has no scheduled messages.
        </p>
        <label className="mt-4 flex items-start gap-3 text-sm text-[var(--foreground)]">
          <input
            checked={confirmed}
            className="mt-1"
            disabled={!eligibility.eligible || creating}
            onChange={(event) => setConfirmed(event.target.checked)}
            type="checkbox"
          />
          <span>I understand this writes one synthetic case to the connected development database.</span>
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!eligibility.eligible || !confirmed || creating}
            onClick={() => void createTestCase()}
            type="button"
          >
            {creating ? "Creating…" : "Create synthetic case"}
          </button>
          {!eligibility.eligible ? (
            <span className="text-xs text-[var(--muted)]">Complete all prerequisites to unlock this action.</span>
          ) : null}
        </div>
        <p aria-live="polite" className="mt-3 text-xs text-[var(--danger)]">{error}</p>
        {createdCase ? (
          <p className="mt-3 text-sm text-[var(--success)]">
            Synthetic case created for {createdCase.invoiceId}.{" "}
            <Link className="font-medium underline" href={createdCase.caseUrl}>Inspect the case</Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
