import Link from "next/link";
import { formatCurrencyAmounts } from "../../lib/currency";
import { getRecoverySchedule } from "../../lib/recovery/schedule-policy";
import type { DashboardMetrics } from "../../lib/server/dashboard-metrics";
import type { RecoveryModeSettings } from "../../lib/server/recovery-account-settings";
import type { RecoveryCaseListItem } from "../../lib/server/recovery-cases";
import { Icon } from "../ui-icon";

const cardClass =
  "rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]";

function formatCaseCurrency(amount: number, currency: string | null) {
  return formatCurrencyAmounts([{ amount, currency }]);
}

function formatLabel(value: string | null) {
  if (!value) return "Unknown";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getCustomerLabel(item: RecoveryCaseListItem) {
  return item.customerEmail ?? item.customerId ?? "Customer details unavailable";
}

function hasAttention(item: RecoveryCaseListItem) {
  return item.attentionFlags.length > 0;
}

function getCaseState(item: RecoveryCaseListItem) {
  const attentionFlag = item.attentionFlags[0];

  if (attentionFlag) {
    return {
      className: "bg-[var(--warning-soft)] text-[var(--warning-text)]",
      dotClassName: "bg-[var(--warning-text)]",
      label: attentionFlag.title,
    };
  }

  if (
    item.failureCategory === "authentication_required" ||
    item.failureCategory === "card_details" ||
    item.failureCategory === "expired_card"
  ) {
    return {
      className: "bg-[var(--warning-soft)] text-[var(--warning-text)]",
      dotClassName: "bg-[var(--warning-text)]",
      label: "Customer action",
    };
  }

  return {
    className: "bg-[var(--surface-muted)] text-[var(--muted)]",
    dotClassName: "bg-[var(--muted)]",
    label: item.livemode === false ? "Open in Test" : formatLabel(item.caseStatus),
  };
}

function getEnvironment(recoverySettings: RecoveryModeSettings) {
  if (!recoverySettings.connected || recoverySettings.livemode === null) {
    return "Not connected";
  }

  return recoverySettings.livemode ? "Live" : "Test";
}

function getModeLabel(recoverySettings: RecoveryModeSettings) {
  const labels = {
    live: "Live mode",
    off: "Off",
    paused: "Paused",
    test: "Test mode",
  } as const;

  return labels[recoverySettings.mode];
}

function getOperationalNotice(recoverySettings: RecoveryModeSettings) {
  if (!recoverySettings.connected) {
    return {
      body: "Connect Stripe to monitor failed payments. No recovery messages can be delivered while disconnected.",
      link: "Review connection settings",
      title: "Stripe is not connected",
    };
  }

  if (recoverySettings.mode === "test") {
    return {
      body: "Only the approved test recipient can receive test notifications. Customer delivery remains disabled.",
      link: "Review test settings",
      title: "Test mode · Restricted delivery",
    };
  }

  if (recoverySettings.mode === "paused") {
    return {
      body: "Cases remain visible, but recovery delivery is paused until the account is deliberately resumed.",
      link: "Review recovery settings",
      title: "Recovery is paused",
    };
  }

  if (recoverySettings.mode === "off") {
    return {
      body: "Failed payments can be recorded, but recovery emails are not scheduled or delivered.",
      link: "Review recovery settings",
      title: "Recovery delivery is off",
    };
  }

  return {
    body: "Recovery is configured for the connected live Stripe environment. Review the flow before changing delivery settings.",
    link: "Review recovery settings",
    title: "Live recovery configuration",
  };
}

function SummaryMetric({
  caption,
  emphasize = false,
  label,
  value,
}: {
  caption: string;
  emphasize?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 p-5 xl:p-6">
      <p className="text-xs leading-5 text-[var(--muted)]">{label}</p>
      <p
        className={`mt-1.5 break-words text-[28px] font-semibold leading-9 tracking-[-0.03em] ${
          emphasize ? "text-[var(--primary)]" : "text-[var(--foreground)]"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">{caption}</p>
    </div>
  );
}

function StateBadge({ item }: { item: RecoveryCaseListItem }) {
  const state = getCaseState(item);

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-semibold ${state.className}`}
    >
      <span aria-hidden className={`size-[5px] rounded-full ${state.dotClassName}`} />
      {state.label}
    </span>
  );
}

function MobileCaseCard({ item }: { item: RecoveryCaseListItem }) {
  return (
    <article className={`${cardClass} flex flex-col gap-3 p-[18px]`}>
      <div className="flex items-start justify-between gap-4">
        <p className="min-w-0 truncate text-sm font-semibold text-[var(--foreground)]">
          {getCustomerLabel(item)}
        </p>
        <p className="shrink-0 text-base font-semibold text-[var(--foreground)]">
          {formatCaseCurrency(item.amountDue, item.currency)}
        </p>
      </div>
      <StateBadge item={item} />
      <p className="text-[13px] leading-5 text-[var(--muted)]">{item.failureTitle}</p>
      <p className="text-[13px] leading-5 text-[var(--foreground)]">
        {item.attentionFlags[0]?.explanation ?? item.merchantAction}
      </p>
      <Link
        className="inline-flex w-fit items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-[13px] font-semibold text-[var(--foreground)] hover:border-[var(--border-strong)]"
        href={`/dashboard/cases/${item.id}`}
      >
        Open case
        <Icon className="size-3.5" name="arrow-up-right" />
      </Link>
    </article>
  );
}

function CasesTable({ cases }: { cases: RecoveryCaseListItem[] }) {
  if (cases.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          No open recovery cases
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          New cases will appear here after Stripe reports a failed payment.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left">
        <thead>
          <tr className="border-y border-[var(--border)] bg-[var(--surface-muted)] text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--muted)]">
            <th className="px-5 py-3">Customer</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Failure</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-5 py-3">Next action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {cases.map((item) => (
            <tr key={item.id}>
              <td className="px-5 py-4 align-top">
                <Link
                  className="block max-w-[200px] truncate text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]"
                  href={`/dashboard/cases/${item.id}`}
                >
                  {getCustomerLabel(item)}
                </Link>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  {item.livemode === false ? "Test" : item.livemode ? "Live" : "Environment unknown"}
                </p>
              </td>
              <td className="px-4 py-4 align-top text-sm font-semibold text-[var(--foreground)]">
                {formatCaseCurrency(item.amountDue, item.currency)}
              </td>
              <td className="px-4 py-4 align-top">
                <p className="max-w-[180px] text-sm text-[var(--foreground)]">
                  {item.failureTitle}
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  {item.attemptCount} payment {item.attemptCount === 1 ? "attempt" : "attempts"}
                </p>
              </td>
              <td className="px-4 py-4 align-top">
                <StateBadge item={item} />
              </td>
              <td className="px-5 py-4 align-top">
                <p className="max-w-[260px] text-xs leading-5 text-[var(--foreground)]">
                  {item.attentionFlags[0]?.explanation ?? item.merchantAction}
                </p>
                <Link
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
                  href={`/dashboard/cases/${item.id}`}
                >
                  Review case
                  <Icon className="size-3.5" name="arrow-right" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatActivityTime(value: string) {
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();

  return new Intl.DateTimeFormat("en-IE", sameDay
    ? { hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short" }).format(date);
}

function RecentActivity({ cases }: { cases: RecoveryCaseListItem[] }) {
  const recentCases = [...cases]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 4);

  return (
    <section className={`${cardClass} p-5 sm:p-6`}>
      <h2 className="text-base font-semibold text-[var(--foreground)]">
        Recently updated cases
      </h2>
      <p className="mt-0.5 text-xs text-[var(--muted)]">Latest case changes</p>
      {recentCases.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--muted)]">
          No case activity has been recorded in this environment yet.
        </p>
      ) : (
        <div className="mt-3 divide-y divide-[var(--border)]">
          {recentCases.map((item) => {
            const opened = item.createdAt === item.updatedAt;
            const title = hasAttention(item)
              ? "Case needs attention"
              : opened
                ? "Case opened"
                : "Case updated";

            return (
              <div className="flex items-start gap-3 py-3" key={item.id}>
                <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] bg-[var(--surface-muted)] text-[var(--muted)]">
                  <Icon className="size-[15px]" name={hasAttention(item) ? "shield-check" : "card"} />
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    className="block truncate text-xs font-semibold text-[var(--foreground)] hover:text-[var(--primary)]"
                    href={`/dashboard/cases/${item.id}`}
                  >
                    {title} · {getCustomerLabel(item)}
                  </Link>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">
                    {hasAttention(item)
                      ? item.attentionFlags[0]?.title
                      : `${item.failureTitle} · ${formatLabel(item.caseStatus)}`}
                  </p>
                </div>
                <time className="shrink-0 text-[10px] text-[var(--muted)]" dateTime={item.updatedAt}>
                  {formatActivityTime(item.updatedAt)}
                </time>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function HealthBadge({
  label,
  positive = false,
}: {
  label: string;
  positive?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-semibold ${
        positive
          ? "bg-[var(--success-soft)] text-[var(--success)]"
          : "bg-[var(--surface-muted)] text-[var(--muted)]"
      }`}
    >
      <span
        aria-hidden
        className={`size-[5px] rounded-full ${positive ? "bg-[var(--success)]" : "bg-[var(--muted)]"}`}
      />
      {label}
    </span>
  );
}

function RecoveryHealth({ recoverySettings }: { recoverySettings: RecoveryModeSettings }) {
  const environment = getEnvironment(recoverySettings);
  const schedule = getRecoverySchedule(recoverySettings.scheduleId);
  const deliveryTitle = recoverySettings.mode === "test"
    ? "Test recipient only"
    : recoverySettings.mode === "live"
      ? "Live recipient routing"
      : "Delivery disabled";
  const deliveryBody = recoverySettings.mode === "test"
    ? "No customer delivery. Review the approved destination in test settings."
    : recoverySettings.mode === "live"
      ? "Customer routing is configured. Operational safeguards still control every delivery."
      : "No recovery emails are sent while recovery is paused or off.";

  return (
    <section className={`${cardClass} p-5 sm:p-6`}>
      <h2 className="text-base font-semibold text-[var(--foreground)]">Recovery health</h2>
      <dl className="mt-3 divide-y divide-[var(--border)]">
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-xs text-[var(--muted)]">Environment</dt>
          <dd><HealthBadge label={environment} /></dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-xs text-[var(--muted)]">Recovery</dt>
          <dd><HealthBadge label={getModeLabel(recoverySettings)} /></dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-xs text-[var(--muted)]">Stripe</dt>
          <dd>
            <HealthBadge
              label={recoverySettings.connected ? "Connected" : "Not connected"}
              positive={recoverySettings.connected}
            />
          </dd>
        </div>
      </dl>
      <div className="pt-3">
        <p className="text-xs font-semibold text-[var(--foreground)]">{deliveryTitle}</p>
        <p className="mt-1.5 text-[11px] leading-4 text-[var(--muted)]">{deliveryBody}</p>
        <Link
          className="mt-2 inline-flex items-center gap-1 text-[13px] text-[var(--primary)] hover:text-[var(--primary-hover)]"
          href="/dashboard/recovery"
        >
          View flow
          <Icon className="size-3.5" name="arrow-right" />
        </Link>
        <p className="mt-2 text-[11px] text-[var(--muted)]">
          Schedule: {schedule.label.replaceAll(", ", " · ")}
        </p>
      </div>
    </section>
  );
}

function PerformanceSnapshot({ metrics }: { metrics: DashboardMetrics }) {
  const rate = metrics.eligiblePaymentsCount > 0 ? `${metrics.recoveryRate}%` : "—";

  return (
    <section className={`${cardClass} p-5 sm:p-6`}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Performance snapshot
        </h2>
        <Link
          className="inline-flex items-center gap-1 text-[13px] text-[var(--primary)] hover:text-[var(--primary-hover)]"
          href="/dashboard/insights"
        >
          Insights
          <Icon className="size-3.5" name="arrow-right" />
        </Link>
      </div>
      <p className="mt-3 text-[13px] font-semibold leading-5 text-[var(--foreground)]">
        {metrics.sentMessagesCount} messages sent / {metrics.recoveredPaymentsCount} resolved cases
      </p>
      <p className="mt-1.5 text-[11px] leading-4 text-[var(--muted)]">
        Recovery rate {rate} · {metrics.eligiblePaymentsCount > 0
          ? "Calculated from open and confirmed recovered cases."
          : "No completed recovery outcomes yet."}
      </p>
    </section>
  );
}

export function DashboardContent({
  attentionCases,
  attentionCount,
  metrics,
  openCases,
  recoverySettings,
}: {
  attentionCases: RecoveryCaseListItem[];
  attentionCount: number;
  metrics: DashboardMetrics;
  openCases: RecoveryCaseListItem[];
  recoverySettings: RecoveryModeSettings;
}) {
  const operationalNotice = getOperationalNotice(recoverySettings);
  const attentionIds = new Set(attentionCases.map((item) => item.id));
  const otherOpenCases = openCases.filter((item) => !attentionIds.has(item.id));
  const featuredCases = [...attentionCases, ...otherOpenCases].slice(0, 4);
  const environment = getEnvironment(recoverySettings);
  const contextLabel = recoverySettings.connected ? `Stripe · ${environment}` : "Stripe · Not connected";
  const atRiskValue = formatCurrencyAmounts(metrics.revenueAtRiskByCurrency);

  return (
    <div className="px-5 py-5 sm:px-8 sm:py-8 lg:px-8 xl:px-10">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-[22px] lg:gap-[26px]">
        <section className="flex flex-col gap-1.5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-4 lg:block">
              <h1 className="text-[28px] font-normal tracking-[-0.035em] text-[var(--foreground)] lg:text-[30px]">
                Dashboard
              </h1>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)] lg:hidden">
                <span aria-hidden className="size-[5px] rounded-full bg-[var(--primary)]" />
                {contextLabel}
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-5 text-[var(--muted)] lg:text-sm">
              Your failed payments and next actions.
            </p>
          </div>
          <Link
            className="hidden items-center gap-1 text-[13px] text-[var(--primary)] hover:text-[var(--primary-hover)] lg:inline-flex"
            href="/dashboard/settings"
          >
            Review settings
            <Icon className="size-3.5" name="arrow-right" />
          </Link>
        </section>

        <section className="flex items-start gap-3 rounded-[8px] border border-[var(--primary-border)] bg-[var(--primary-soft)] p-4">
          <Icon className="mt-0.5 size-[18px] shrink-0 text-[var(--primary)]" name="shield-check" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-5 text-[var(--foreground)]">
              {operationalNotice.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              {operationalNotice.body}
            </p>
            <Link
              className="mt-1.5 inline-flex items-center gap-1 text-[13px] text-[var(--primary)] hover:text-[var(--primary-hover)]"
              href="/dashboard/settings"
            >
              {operationalNotice.link}
              <Icon className="size-3.5" name="arrow-right" />
            </Link>
          </div>
        </section>

        <section aria-label="Recovery summary" className="hidden grid-cols-2 gap-4 md:grid xl:grid-cols-4">
          <article className={cardClass}>
            <SummaryMetric caption="Outstanding invoice amount" emphasize label="Amount at risk" value={atRiskValue} />
          </article>
          <article className={cardClass}>
            <SummaryMetric caption={`Across ${metrics.atRiskCustomersCount} customers`} label="Open recovery cases" value={String(metrics.failedPaymentsCount)} />
          </article>
          <article className={cardClass}>
            <SummaryMetric caption="Review case details" label="Needs attention" value={String(attentionCount)} />
          </article>
          <article className={cardClass}>
            <SummaryMetric caption={metrics.recoveredPaymentsCount > 0 ? "Confirmed paid" : "No confirmed resolutions"} label="Resolved cases" value={String(metrics.recoveredPaymentsCount)} />
          </article>
        </section>

        <section aria-label="Primary recovery summary" className={`${cardClass} grid grid-cols-2 divide-x divide-[var(--border)] md:hidden`}>
          <SummaryMetric caption="Unpaid, not lost revenue" emphasize label="Amount at risk" value={atRiskValue} />
          <SummaryMetric caption={`Across ${metrics.atRiskCustomersCount} customers`} label="Open cases" value={String(metrics.failedPaymentsCount)} />
        </section>

        <section className={`${cardClass} hidden overflow-hidden md:block`}>
          <div className="flex items-end justify-between gap-4 p-5 sm:p-6">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Open recovery cases</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {attentionCount} {attentionCount === 1 ? "needs" : "need"} attention · {metrics.failedPaymentsCount} open in {environment}
              </p>
            </div>
            <Link className="inline-flex items-center gap-1 text-[13px] text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/dashboard/cases">
              View all cases
              <Icon className="size-3.5" name="arrow-right" />
            </Link>
          </div>
          <CasesTable cases={featuredCases} />
          <p className="border-t border-[var(--border)] px-5 py-3 text-[11px] leading-4 text-[var(--muted)]">
            Amount at risk is unpaid invoice value, not lost revenue. Resolved means the payment is confirmed.
          </p>
        </section>

        <section className="flex flex-col gap-3 md:hidden">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Needs attention · {attentionCount}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">Review the customer&apos;s next step.</p>
          </div>
          {attentionCases.length > 0 ? (
            attentionCases.slice(0, 2).map((item) => <MobileCaseCard item={item} key={item.id} />)
          ) : (
            <div className={`${cardClass} p-[18px]`}>
              <p className="text-sm font-semibold text-[var(--foreground)]">Nothing needs attention</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">No open case currently has an operational or delivery warning.</p>
            </div>
          )}
          {otherOpenCases.length > 0 ? (
            <>
              <h2 className="pt-2 text-base font-semibold text-[var(--foreground)]">Also open in {environment}</h2>
              {otherOpenCases.slice(0, 3).map((item) => <MobileCaseCard item={item} key={item.id} />)}
            </>
          ) : null}
          <Link className="inline-flex items-center gap-1 text-[13px] text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/dashboard/cases">
            View all cases
            <Icon className="size-3.5" name="arrow-right" />
          </Link>
        </section>

        <section aria-label="Additional recovery summary" className={`${cardClass} grid grid-cols-2 divide-x divide-[var(--border)] md:hidden`}>
          <SummaryMetric caption="Shown above" label="Needs attention" value={String(attentionCount)} />
          <SummaryMetric caption={metrics.recoveredPaymentsCount > 0 ? "Confirmed paid" : "None confirmed yet"} label="Resolved cases" value={String(metrics.recoveredPaymentsCount)} />
        </section>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-[22px] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-5">
          <div className="min-w-0 lg:col-start-2 lg:row-start-1">
            <RecoveryHealth recoverySettings={recoverySettings} />
          </div>
          <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <RecentActivity cases={openCases} />
          </div>
          <div className="min-w-0 lg:col-start-2 lg:row-start-2">
            <PerformanceSnapshot metrics={metrics} />
          </div>
        </div>

        <Link className="inline-flex w-fit items-center gap-1 text-[13px] text-[var(--primary)] hover:text-[var(--primary-hover)]" href="/dashboard/optimize">
          Optimize recovery
          <Icon className="size-3.5" name="arrow-right" />
        </Link>
      </div>
    </div>
  );
}
