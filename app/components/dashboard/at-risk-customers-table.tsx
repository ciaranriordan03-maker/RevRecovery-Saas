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

  if (status === "failed" || status === "open") {
    return "bg-[var(--warning-soft)] text-[var(--warning-text)]";
  }

  return "bg-[var(--surface-muted)] text-[var(--muted-strong)]";
}

function getCustomerLabel(customer: AtRiskCustomer) {
  return customer.customerEmail ?? customer.customerId ?? "Unknown customer";
}

export function AtRiskCustomersTable({ customers }: AtRiskCustomersTableProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <div className="border-b border-[var(--border)] px-6 py-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-medium tracking-[-0.02em]">
              At-Risk Customers
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Customers currently moving through recovery.
            </p>
          </div>
          <p className="text-sm text-[var(--muted-strong)]">
            {customers.length} active {customers.length === 1 ? "case" : "cases"}
          </p>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-[var(--foreground)]">
            No at-risk customers right now
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Failed payments will appear here once Stripe sends recovery events.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs font-medium text-[var(--muted)]">
                <th className="px-6 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Recovery Stage</th>
                <th className="px-4 py-3">Next Email</th>
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
                      {customer.customerId ?? customer.invoiceId}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--foreground)]">
                    {formatCurrency(customer.amountDue, customer.currency ?? "usd")}
                  </td>
                  <td className="px-4 py-4">
                    <p className="max-w-[160px] truncate text-sm text-[var(--foreground)]">
                      {customer.invoiceId}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {formatLabel(customer.invoiceStatus)}
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
                      className={`inline-flex rounded px-2 py-1 text-xs font-medium ${getStatusClass(customer.status)}`}
                    >
                      {formatLabel(customer.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
