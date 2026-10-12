import { buildEssentialNotificationPreview } from "../../lib/recovery/essential-notification-policy";

export function EssentialNotificationPreview({ accountEmail }: { accountEmail: string }) {
  const preview = buildEssentialNotificationPreview(accountEmail);

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]" aria-labelledby="essential-notifications-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--muted)]">Essential notifications</p>
          <h2 className="mt-2 text-base font-medium text-[var(--foreground)]" id="essential-notifications-heading">Proposed alert policy</h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-[var(--muted-strong)]">A high-signal policy for operational failures and cases requiring human attention.</p>
        </div>
        <span className="w-fit rounded bg-[var(--surface-muted)] px-2 py-1 text-xs font-medium text-[var(--muted-strong)]">Preview only</span>
      </div>

      <div className="mt-5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4">
        <p className="text-xs text-[var(--muted)]">Proposed recipient</p>
        <p className="mt-1 break-all text-sm font-medium text-[var(--foreground)]">{preview.recipient}</p>
      </div>

      <div className="mt-4 grid gap-3">
        {preview.rules.map((rule) => (
          <article className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4" key={rule.id}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium text-[var(--foreground)]">{rule.title}</h3>
              <span className={`rounded px-2 py-1 text-xs font-medium ${rule.severity === "critical" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--warning-soft)] text-[var(--warning-text)]"}`}>{rule.severity === "critical" ? "Immediate" : "Digest"}</span>
            </div>
            <p className="mt-2 text-sm leading-5 text-[var(--muted-strong)]">{rule.description}</p>
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <div><dt className="text-[var(--muted)]">Trigger</dt><dd className="mt-1 text-[var(--foreground)]">{rule.trigger}</dd></div>
              <div><dt className="text-[var(--muted)]">Noise protection</dt><dd className="mt-1 text-[var(--foreground)]">{rule.cooldownLabel}</dd></div>
            </dl>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
        <p className="text-xs font-medium text-[var(--foreground)]">Deliberately excluded</p>
        <ul className="mt-2 space-y-1 text-xs leading-5 text-[var(--muted-strong)]">
          {preview.exclusions.map((item) => <li key={item}>• {item}</li>)}
        </ul>
      </div>

      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">No notifications are enabled or sent by this preview.</p>
    </section>
  );
}
