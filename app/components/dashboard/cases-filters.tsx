"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type {
  RecoveryCaseEnvironmentFilter,
  RecoveryCaseFilters,
  RecoveryCaseSegmentFilter,
  RecoveryCaseStatusFilter,
} from "../../lib/server/recovery-cases";
import { getCasesHref } from "../../lib/cases-query";
import { Icon } from "../ui-icon";

const controlClass =
  "h-10 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]";

const statusOptions: Array<{ label: string; value: RecoveryCaseStatusFilter }> = [
  { label: "Open cases", value: "open" },
  { label: "Needs attention", value: "attention" },
  { label: "All cases", value: "all" },
  { label: "Recovered", value: "recovered" },
  { label: "Sequence exhausted", value: "exhausted" },
  { label: "Operational failure", value: "failed_operationally" },
];

const segmentOptions: Array<{ label: string; value: RecoveryCaseSegmentFilter }> = [
  { label: "All audiences", value: "all" },
  { label: "Subscriptions", value: "subscription" },
  { label: "Standalone invoices", value: "standalone" },
  { label: "Unknown invoice type", value: "unknown" },
];

const environmentOptions: Array<{
  label: string;
  value: RecoveryCaseEnvironmentFilter;
}> = [
  { label: "All environments", value: "all" },
  { label: "Live", value: "live" },
  { label: "Test", value: "test" },
  { label: "Unknown", value: "unknown" },
];

type DraftFilters = {
  currency: string;
  environment: RecoveryCaseEnvironmentFilter;
  minimumAmount: string;
  segment: RecoveryCaseSegmentFilter;
  status: RecoveryCaseStatusFilter;
};

function getAppliedDraft(filters: RecoveryCaseFilters): DraftFilters {
  return {
    currency: filters.currency?.toUpperCase() ?? "",
    environment: filters.environment,
    minimumAmount: filters.minimumAmountInput,
    segment: filters.segment,
    status: filters.status,
  };
}

function labelFor<T extends string>(
  options: Array<{ label: string; value: T }>,
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function FilterChip({
  href,
  label,
  removable = true,
}: {
  href?: string;
  label: string;
  removable?: boolean;
}) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-medium text-[var(--muted-strong)]">
      {label}
      {removable && href ? (
        <Link
          aria-label={`Remove ${label} filter`}
          className="-mr-1 inline-flex size-5 items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          href={href}
        >
          <Icon className="size-3" name="x" />
        </Link>
      ) : null}
    </span>
  );
}

function AppliedFilters({ filters }: { filters: RecoveryCaseFilters }) {
  const statusLabel = labelFor(statusOptions, filters.status);

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Applied filters">
      <span className="mr-1 text-xs font-medium text-[var(--muted)]">Showing</span>
      <FilterChip
        href={getCasesHref(filters, { page: 1, status: "open" })}
        label={statusLabel}
        removable={filters.status !== "open"}
      />
      {filters.segment !== "all" ? (
        <FilterChip
          href={getCasesHref(filters, { page: 1, segment: "all" })}
          label={labelFor(segmentOptions, filters.segment)}
        />
      ) : null}
      {filters.environment !== "all" ? (
        <FilterChip
          href={getCasesHref(filters, { environment: "all", page: 1 })}
          label={labelFor(environmentOptions, filters.environment)}
        />
      ) : null}
      {filters.currency && filters.minimumAmountInput ? (
        <FilterChip
          href={getCasesHref(filters, {
            currency: null,
            minimumAmountInput: "",
            page: 1,
          })}
          label={`${filters.currency.toUpperCase()} ${filters.minimumAmountInput}+`}
        />
      ) : null}
    </div>
  );
}

function DesktopFilters({ filters }: { filters: RecoveryCaseFilters }) {
  return (
    <div className="hidden lg:block">
      <form
        className="grid grid-cols-[1fr_1fr_1fr_0.72fr_0.85fr_auto] items-end gap-3"
        method="get"
      >
        <input name="page" type="hidden" value="1" />
        <label className="text-xs font-medium text-[var(--muted-strong)]">
          Case status
          <select
            className={`${controlClass} mt-2 w-full`}
            defaultValue={filters.status}
            name="status"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-[var(--muted-strong)]">
          Audience
          <select
            className={`${controlClass} mt-2 w-full`}
            defaultValue={filters.segment}
            name="segment"
          >
            {segmentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-[var(--muted-strong)]">
          Stripe environment
          <select
            className={`${controlClass} mt-2 w-full`}
            defaultValue={filters.environment}
            name="environment"
          >
            {environmentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-[var(--muted-strong)]">
          Currency
          <input
            className={`${controlClass} mt-2 w-full uppercase`}
            defaultValue={filters.currency ?? ""}
            maxLength={3}
            name="currency"
            pattern="[A-Za-z]{3}"
            placeholder="EUR"
          />
        </label>
        <label className="text-xs font-medium text-[var(--muted-strong)]">
          Minimum value
          <input
            className={`${controlClass} mt-2 w-full`}
            defaultValue={filters.minimumAmountInput}
            inputMode="decimal"
            min="0.01"
            name="minimumAmount"
            placeholder="500.00"
            step="0.01"
            type="number"
          />
        </label>
        <button
          className="h-10 rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
          type="submit"
        >
          Apply
        </button>
      </form>
      <div className="mt-4 flex items-center justify-between gap-4">
        <AppliedFilters filters={filters} />
        <Link
          className="shrink-0 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
          href="/dashboard/cases"
        >
          Clear all
        </Link>
      </div>
    </div>
  );
}

function RadioGroup<T extends string>({
  legend,
  name,
  onChange,
  options,
  value,
}: {
  legend: string;
  name: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-[var(--foreground)]">{legend}</legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map((option) => (
          <label
            className={`flex min-h-10 items-center gap-2 rounded-[8px] border px-3 py-2 text-xs font-medium ${
              value === option.value
                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-text)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-strong)]"
            }`}
            key={option.value}
          >
            <input
              checked={value === option.value}
              className="accent-[var(--primary)]"
              name={name}
              onChange={() => onChange(option.value)}
              type="radio"
              value={option.value}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function MobileFilters({ filters }: { filters: RecoveryCaseFilters }) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftFilters>(() => getAppliedDraft(filters));

  function openSheet() {
    setDraft(getAppliedDraft(filters));
    setOpen(true);
  }

  function closeSheet() {
    setDraft(getAppliedDraft(filters));
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <AppliedFilters filters={filters} />
        <button
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--foreground)]"
          onClick={openSheet}
          type="button"
        >
          <Icon className="size-4" name="sliders" />
          Filters
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end" role="presentation">
          <button
            aria-label="Close filters"
            className="absolute inset-0 bg-[var(--overlay)]"
            onClick={closeSheet}
            type="button"
          />
          <section
            aria-labelledby={titleId}
            aria-modal="true"
            className="relative z-10 flex max-h-[88vh] w-full flex-col rounded-t-[18px] bg-[var(--surface)] shadow-[var(--shadow-card)]"
            role="dialog"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]" id={titleId}>
                  Filter cases
                </h2>
                <p className="mt-0.5 text-xs text-[var(--muted)]">Changes apply when you confirm.</p>
              </div>
              <button
                aria-label="Close filters"
                className="inline-flex size-9 items-center justify-center rounded-[8px] text-[var(--muted)] hover:bg-[var(--surface-muted)]"
                onClick={closeSheet}
                type="button"
              >
                <Icon className="size-5" name="x" />
              </button>
            </div>

            <form className="flex min-h-0 flex-1 flex-col" method="get">
              <input name="page" type="hidden" value="1" />
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <RadioGroup
                  legend="Case status"
                  name="status"
                  onChange={(status) => setDraft((current) => ({ ...current, status }))}
                  options={statusOptions}
                  value={draft.status}
                />
                <RadioGroup
                  legend="Audience"
                  name="segment"
                  onChange={(segment) => setDraft((current) => ({ ...current, segment }))}
                  options={segmentOptions}
                  value={draft.segment}
                />
                <RadioGroup
                  legend="Stripe environment"
                  name="environment"
                  onChange={(environment) => setDraft((current) => ({ ...current, environment }))}
                  options={environmentOptions}
                  value={draft.environment}
                />
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-medium text-[var(--muted-strong)]">
                    Currency
                    <input
                      className={`${controlClass} mt-2 w-full uppercase`}
                      maxLength={3}
                      name="currency"
                      onChange={(event) => setDraft((current) => ({
                        ...current,
                        currency: event.target.value,
                      }))}
                      pattern="[A-Za-z]{3}"
                      placeholder="EUR"
                      value={draft.currency}
                    />
                  </label>
                  <label className="text-xs font-medium text-[var(--muted-strong)]">
                    Minimum value
                    <input
                      className={`${controlClass} mt-2 w-full`}
                      inputMode="decimal"
                      min="0.01"
                      name="minimumAmount"
                      onChange={(event) => setDraft((current) => ({
                        ...current,
                        minimumAmount: event.target.value,
                      }))}
                      placeholder="500.00"
                      step="0.01"
                      type="number"
                      value={draft.minimumAmount}
                    />
                  </label>
                </div>
                <p className="text-xs leading-5 text-[var(--muted)]">
                  Currency and minimum value work together so amounts are never compared across currencies.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-[8px] border border-[var(--border)] text-sm font-semibold text-[var(--foreground)]"
                  href="/dashboard/cases"
                >
                  Clear all
                </Link>
                <button
                  className="h-11 rounded-[8px] bg-[var(--primary)] text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
                  type="submit"
                >
                  Apply filters
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export function CasesFilters({ filters }: { filters: RecoveryCaseFilters }) {
  return (
    <>
      <DesktopFilters filters={filters} />
      <MobileFilters filters={filters} />
    </>
  );
}
