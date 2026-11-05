import Link from "next/link";
import type { AtRiskCustomer } from "../../lib/server/at-risk-customers";

type AtRiskCustomersTableProps = {
  customers: AtRiskCustomer[];
};

function formatCurrency(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "No pending email";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLabel(value: string | null) {
  if (!value) {
    return "Not started";
  }

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusClass(status: string) {
  if (status === "recovered") {
    return "bg-[var(--success-soft)] text-[var(--success-badge-text)]";
  }

  if (
    status === "failed" ||
    status === "open" ||
    status === "exhausted" ||
    status === "failed_operationally"
  ) {
    return "bg-[var(--warning-soft)] text-[var(--warning-text)]";
  }

  return "bg-[var(--surface-muted)] text-[var(--muted-strong)]";
}

function getCustomerLabel(customer: AtRiskCustomer) {
  return customer.customerEmail ?? customer.customerId ?? "Unknown customer";
}

export function AtRiskCustomersTable({ customers }: AtRiskCustomersTableProps) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-[-0.02em]">
              Open failed-payment cases
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Customers currently in the recovery workflow.
            </p>
          </div>
          <p className="text-sm text-[var(--muted-strong)]">
            {customers.length} open {customers.length === 1 ? "case" : "cases"}
          </p>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            No open failed-payment cases
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Failed payments will appear here once Stripe sends recovery events.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs font-medium text-[var(--muted)]">
                <th className="px-6 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Failure Reason</th>
                <th className="px-4 py-3">Recovery</th>
                <th className="px-4 py-3">Next action</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {customers.map((customer) => (
                <tr key={customer.failedPaymentId}>
                  <td className="px-6 py-4">
                    <p className="max-w-[220px] truncate text-sm font-medium text-[var(--foreground)]">
                      {getCustomerLabel(customer)}
                    </p>
                    <p className="mt-1 max-w-[220px] truncate text-xs text-[var(--muted)]">
                      {customer.invoiceId} · {formatLabel(customer.invoiceStatus)}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--foreground)]">
                    {formatCurrency(customer.amountDue, customer.currency ?? "usd")}
                  </td>
                  <td className="px-4 py-4">
                    <p className="max-w-[200px] text-sm font-medium text-[var(--foreground)]">
                      {customer.failureDiagnostic.title}
                    </p>
                    <p className="mt-1 max-w-[240px] text-xs leading-4 text-[var(--muted)]">
                      {customer.failureDiagnostic.explanation}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-[var(--foreground)]">
                      {formatLabel(customer.recoveryStage)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Flow {formatLabel(customer.sequenceStatus)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-[var(--foreground)]">
                      {formatLabel(customer.nextEmailKey)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {formatDateTime(customer.nextEmailAt)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded px-2 py-1 text-xs font-medium ${getStatusClass(customer.caseStatus)}`}
                    >
                      {formatLabel(customer.caseStatus)}
                    </span>
                    <Link
                      className="mt-2 block text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
                      href={`/dashboard/cases/${customer.failedPaymentId}`}
                    >
                      View case
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <ul className="divide-y divide-[var(--border)] md:hidden">
            {customers.map((customer) => (
              <li className="p-5" key={customer.failedPaymentId}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {getCustomerLabel(customer)}
                    </p>
                    <p className="mt-1 truncate text-xs text-[var(--muted)]">
                      {customer.invoiceId} · {formatLabel(customer.invoiceStatus)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[var(--foreground)]">
                    {formatCurrency(customer.amountDue, customer.currency ?? "usd")}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-4 text-xs sm:grid-cols-2">
                  <div>
                    <p className="text-[var(--muted)]">Failure</p>
                    <p className="mt-1 font-medium text-[var(--foreground)]">{customer.failureDiagnostic.title}</p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Recovery</p>
                    <p className="mt-1 font-medium text-[var(--foreground)]">{formatLabel(customer.recoveryStage)}</p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Next email</p>
                    <p className="mt-1 font-medium text-[var(--foreground)]">{formatDateTime(customer.nextEmailAt)}</p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Status</p>
                    <p className="mt-1 font-medium text-[var(--foreground)]">{formatLabel(customer.caseStatus)}</p>
                  </div>
                </div>
                <Link
                  className="mt-4 inline-flex text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
                  href={`/dashboard/cases/${customer.failedPaymentId}`}
                >
                  View case
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
