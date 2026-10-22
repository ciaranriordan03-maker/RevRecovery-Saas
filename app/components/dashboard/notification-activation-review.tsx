import type { NotificationActivationReview as Review } from "../../lib/recovery/notification-activation-review";

export function NotificationActivationReview({ review }: { review: Review }) {
  const ready = review.state === "ready" && review.readyForAuthorizationReview;

  return (
    <section aria-labelledby="notification-final-review-heading" className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--primary)]">D4j · Final activation review</p>
          <h2 className="mt-2 text-base font-medium text-[var(--foreground)]" id="notification-final-review-heading">Notification delivery remains unauthorized</h2>
          <p className="mt-2 text-sm leading-5 text-[var(--muted-strong)]">A read-only summary of the safeguards and evidence required before one controlled test email can even be considered.</p>
        </div>
        <span className="w-fit rounded bg-[var(--warning-soft)] px-2 py-1 text-xs font-medium text-[var(--warning-text)]">Not authorized</span>
      </div>

      {review.state === "unavailable" ? (
        <p className="mt-5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted-strong)]">The activation evidence could not be loaded. Delivery remains locked.</p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {review.checks.map((check) => (
            <li className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4" key={check.id}>
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${check.status === "confirmed" ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--warning-soft)] text-[var(--warning-text)]"}`}>
                  {check.status === "confirmed" ? "✓" : "!"}
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{check.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{check.detail}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 rounded-[var(--radius-control)] border border-[var(--primary-border)] bg-[var(--primary-soft)] p-4 text-sm leading-5 text-[var(--muted-strong)]">
        {ready
          ? "Safety evidence is complete enough for a separate authorization review. Nothing here enables delivery or sends an email."
          : "The controlled test is not ready for authorization. Delivery remains disabled and no email can be sent."}
      </p>
    </section>
  );
}
