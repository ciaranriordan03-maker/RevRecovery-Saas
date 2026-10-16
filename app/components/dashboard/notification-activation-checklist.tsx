import type { NotificationActivationReadiness } from "../../lib/recovery/notification-activation-readiness";

export function NotificationActivationChecklist({
  readiness,
}: {
  readiness: NotificationActivationReadiness;
}) {
  const ready = readiness.state === "ready_for_review";

  return (
    <div className="mt-5 border-t border-[var(--border)] pt-5" aria-labelledby="notification-activation-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-medium text-[var(--foreground)]" id="notification-activation-heading">Activation-readiness checklist</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Every required safeguard must pass before notification delivery can be considered.</p>
        </div>
        <span className={`w-fit rounded px-2 py-1 text-xs font-medium ${ready ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--warning-soft)] text-[var(--warning-text)]"}`}>
          {ready ? "Ready for review" : "Delivery locked"}
        </span>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {readiness.checks.map((item) => (
          <li className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4" key={item.id}>
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${item.status === "complete" ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--warning-soft)] text-[var(--warning-text)]"}`}>
                {item.status === "complete" ? "✓" : "!"}
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{item.detail}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-xs leading-5 text-[var(--muted-strong)]">
        {ready
          ? "All prerequisites pass. Delivery is still disabled and would require a separate approval and implementation step."
          : "Notification delivery remains disabled. Missing safeguards must be resolved before a separate enablement review."}
      </p>
    </div>
  );
}
