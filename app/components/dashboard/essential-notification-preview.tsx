import { buildEssentialNotificationPreview } from "../../lib/recovery/essential-notification-policy";
import type { PreviewNotificationHistory } from "../../lib/recovery/notification-event-history";
import type { NotificationActivationReadiness } from "../../lib/recovery/notification-activation-readiness";
import { NotificationActivationChecklist } from "./notification-activation-checklist";
import { buildNotificationReconciliationPlan } from "../../lib/recovery/notification-reconciliation-policy";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function EssentialNotificationPreview({
  accountEmail,
  history,
  readiness,
}: {
  accountEmail: string;
  history: PreviewNotificationHistory;
  readiness: NotificationActivationReadiness;
}) {
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

      <div className="mt-5 border-t border-[var(--border)] pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-[var(--foreground)]">Recorded preview events</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">The latest real conditions that matched this proposed policy.</p>
          </div>
          <span className="rounded bg-[var(--primary-soft)] px-2 py-1 text-xs font-medium text-[var(--primary)]">Preview only — nothing sent</span>
        </div>

        {history.state === "unavailable" ? (
          <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--warning)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-text)]">
            Preview event history is temporarily unavailable. Notification delivery remains disabled.
          </div>
        ) : history.events.length === 0 ? (
          <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-sm font-medium text-[var(--foreground)]">No preview events recorded yet</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">This is expected until a genuine webhook, sending-domain, or needs-attention condition matches the policy.</p>
          </div>
        ) : (
          <ol className="mt-4 space-y-3">
            {history.events.map((event) => (
              <li className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4" key={event.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{event.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{event.reason}</p>
                  </div>
                  <span className={`rounded px-2 py-1 text-xs font-medium ${event.severity === "critical" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--warning-soft)] text-[var(--warning-text)]"}`}>{event.severity === "critical" ? "Immediate" : "Digest"}</span>
                </div>
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                  <div><dt className="text-[var(--muted)]">Recorded</dt><dd className="mt-1 text-[var(--foreground)]"><time dateTime={event.occurredAt}>{formatTimestamp(event.occurredAt)} UTC</time></dd></div>
                  <div><dt className="text-[var(--muted)]">Would notify</dt><dd className="mt-1 break-all text-[var(--foreground)]">{event.recipientEmail}</dd></div>
                  <div><dt className="text-[var(--muted)]">Duplicate protection</dt><dd className="mt-1 text-[var(--foreground)]">Duplicates ignored until {formatTimestamp(event.cooldownUntil)} UTC</dd></div>
                </dl>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-5 border-t border-[var(--border)] pt-5" aria-labelledby="notification-reconciliation-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-[var(--foreground)]" id="notification-reconciliation-heading">Delivery reconciliation</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Read-only evidence from controlled notification delivery attempts.</p>
          </div>
          <span className="rounded bg-[var(--surface-muted)] px-2 py-1 text-xs font-medium text-[var(--muted-strong)]">No retry actions</span>
        </div>

        {history.state === "unavailable" ? (
          <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--warning)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-text)]">Reconciliation evidence is temporarily unavailable. Delivery remains disabled.</div>
        ) : history.deliveries.length === 0 ? (
          <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-sm font-medium text-[var(--foreground)]">No delivery attempts to reconcile</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Controlled delivery evidence will appear here without enabling retries.</p>
          </div>
        ) : (
          <ol className="mt-4 space-y-3">
            {history.deliveries.map((delivery) => {
              const resolutionPlan = buildNotificationReconciliationPlan(delivery);
              return (
              <li className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4" key={delivery.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{delivery.statusLabel}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{delivery.detail}</p>
                  </div>
                  <span className={`rounded px-2 py-1 text-xs font-medium ${delivery.state === "finalized" ? "bg-[var(--success-soft)] text-[var(--success)]" : delivery.state === "attention_required" ? "bg-[var(--warning-soft)] text-[var(--warning-text)]" : "bg-[var(--primary-soft)] text-[var(--primary)]"}`}>{delivery.state === "finalized" ? "Complete" : delivery.state === "attention_required" ? "Attention required" : "In progress"}</span>
                </div>
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div><dt className="text-[var(--muted)]">Recorded</dt><dd className="mt-1 text-[var(--foreground)]"><time dateTime={delivery.occurredAt}>{formatTimestamp(delivery.occurredAt)} UTC</time></dd></div>
                  <div><dt className="text-[var(--muted)]">Test recipient</dt><dd className="mt-1 break-all text-[var(--foreground)]">{delivery.recipientEmail}</dd></div>
                </dl>
                {delivery.state === "attention_required" ? (
                  <details className="mt-4 border-t border-[var(--border)] pt-3">
                    <summary className="cursor-pointer text-xs font-medium text-[var(--primary)]">View audit evidence</summary>
                    {delivery.evidenceState === "unavailable" ? (
                      <p className="mt-3 text-xs leading-5 text-[var(--warning-text)]">Audit evidence is temporarily unavailable. Do not retry or change this delivery.</p>
                    ) : (
                      <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
                        <div>
                          <p className="font-medium text-[var(--foreground)]">Reservation</p>
                          <p className="mt-1 leading-5 text-[var(--muted-strong)]">{delivery.evidence.reservation.claimRecorded && delivery.evidence.reservation.claimedAt ? `Claim recorded ${formatTimestamp(delivery.evidence.reservation.claimedAt)} UTC.` : "No claim timestamp is recorded."}</p>
                        </div>
                        <div>
                          <p className="font-medium text-[var(--foreground)]">Authorization</p>
                          {delivery.evidence.authorization ? (
                            <p className="mt-1 leading-5 text-[var(--muted-strong)]">Status: {delivery.evidence.authorization.status}. Expires {formatTimestamp(delivery.evidence.authorization.expiresAt)} UTC.{delivery.evidence.authorization.consumedAt ? ` Consumed ${formatTimestamp(delivery.evidence.authorization.consumedAt)} UTC.` : ""}</p>
                          ) : <p className="mt-1 leading-5 text-[var(--muted-strong)]">No linked authorization record.</p>}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--foreground)]">Delivery attempts</p>
                          {delivery.evidence.attempts.length > 0 ? (
                            <ol className="mt-1 space-y-1 text-[var(--muted-strong)]">
                              {delivery.evidence.attempts.map((attempt, index) => <li key={`${attempt.occurredAt}-${index}`}>{attempt.outcome}: {attempt.reason} · {formatTimestamp(attempt.occurredAt)} UTC</li>)}
                            </ol>
                          ) : <p className="mt-1 leading-5 text-[var(--muted-strong)]">No attempt ledger entries.</p>}
                        </div>
                      </div>
                    )}
                    <p className="mt-3 text-xs leading-5 text-[var(--muted)]">Evidence only. No resolution, retry, or provider action is available here.</p>
                  </details>
                ) : null}
                {resolutionPlan ? (
                  <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--warning)] bg-[var(--warning-soft)] p-4" aria-label="Read-only resolution policy">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--warning-text)]">D4r · Reviewed resolution plan</p>
                      <span className="rounded bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--muted-strong)]">Policy preview only</span>
                    </div>
                    <h4 className="mt-2 text-sm font-medium text-[var(--foreground)]">{resolutionPlan.title}</h4>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{resolutionPlan.summary}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-[var(--foreground)]">Required evidence</p>
                        <ul className="mt-1 space-y-1 text-xs leading-5 text-[var(--muted-strong)]">{resolutionPlan.prerequisites.map((item) => <li key={item}>• {item}</li>)}</ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[var(--foreground)]">Hard prohibitions</p>
                        <ul className="mt-1 space-y-1 text-xs leading-5 text-[var(--muted-strong)]">{resolutionPlan.prohibitedActions.map((item) => <li key={item}>• {item}</li>)}</ul>
                      </div>
                    </div>
                    <p className="mt-3 border-t border-[var(--warning)] pt-3 text-xs font-medium leading-5 text-[var(--warning-text)]">Permitted future outcome: {resolutionPlan.allowedOutcome}</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">No resolution action is implemented or authorized by this preview.</p>
                  </div>
                ) : null}
              </li>
              );
            })}
          </ol>
        )}
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">This view never retries a message or contacts the email provider.</p>
      </div>

      <NotificationActivationChecklist readiness={readiness} />

      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">No notifications are enabled or sent by this preview.</p>
    </section>
  );
}
