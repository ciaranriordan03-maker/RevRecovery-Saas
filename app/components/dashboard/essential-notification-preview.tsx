import { buildEssentialNotificationPreview } from "../../lib/recovery/essential-notification-policy";
import type { PreviewNotificationHistory } from "../../lib/recovery/notification-event-history";
import type { NotificationActivationReadiness } from "../../lib/recovery/notification-activation-readiness";
import { NotificationActivationChecklist } from "./notification-activation-checklist";
import { buildNotificationReconciliationPlan } from "../../lib/recovery/notification-reconciliation-policy";
import { buildNotificationResolutionRequestPreview } from "../../lib/recovery/notification-resolution-request-policy";
import { buildNotificationQuarantineRegister } from "../../lib/recovery/notification-quarantine-register";

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
  const quarantineRegister = buildNotificationQuarantineRegister(history.deliveries);

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
              const resolutionRequest = buildNotificationResolutionRequestPreview(delivery, resolutionPlan);
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
                {resolutionRequest ? (
                  <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-4" aria-label="Read-only resolution request workflow">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--primary)]">D4s · Reviewed request workflow</p>
                      <span className="rounded bg-[var(--primary-soft)] px-2 py-1 text-xs font-medium text-[var(--primary)]">Audit preview only</span>
                    </div>
                    <h4 className="mt-2 text-sm font-medium text-[var(--foreground)]">{resolutionRequest.title}</h4>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">A future operator could request review of this exact resolution scope without changing delivery state.</p>
                    <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                      <div><dt className="font-medium text-[var(--foreground)]">Exact decision scope</dt><dd className="mt-1 leading-5 text-[var(--muted-strong)]">{resolutionRequest.decisionScope}</dd></div>
                      <div><dt className="font-medium text-[var(--foreground)]">Expiry</dt><dd className="mt-1 leading-5 text-[var(--muted-strong)]">{resolutionRequest.expiresAfter}</dd></div>
                    </dl>
                    <p className="mt-3 text-xs font-medium text-[var(--foreground)]">Evidence required before review</p>
                    <ul className="mt-1 space-y-1 text-xs leading-5 text-[var(--muted-strong)]">{resolutionRequest.evidenceRequired.map((item) => <li key={item}>• {item}</li>)}</ul>
                    <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs leading-5 text-[var(--muted)]">{resolutionRequest.auditEffect}</p>
                    <p className="mt-2 text-xs font-medium leading-5 text-[var(--danger)]">No request action, approval action, retry, or provider contact is available in D4s.</p>
                  </div>
                ) : null}
                {delivery.evidence.resolutionReview ? (
                  <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--primary)] bg-[var(--primary-soft)] p-4" aria-label="Recorded resolution review evidence">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--primary)]">D4u · Recorded review evidence</p>
                      <span className="rounded bg-[var(--surface)] px-2 py-1 text-xs font-medium capitalize text-[var(--foreground)]">{delivery.evidence.resolutionReview.status}</span>
                    </div>
                    <h4 className="mt-2 text-sm font-medium text-[var(--foreground)]">Real audit-only resolution review</h4>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">This evidence was read from the development database. It does not authorize a retry, provider contact, or delivery-state change.</p>
                    <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                      <div><dt className="font-medium text-[var(--foreground)]">Decision scope</dt><dd className="mt-1 leading-5 text-[var(--muted-strong)]">{delivery.evidence.resolutionReview.decisionScope.replaceAll("_", " ")}</dd></div>
                      <div><dt className="font-medium text-[var(--foreground)]">Independent review</dt><dd className="mt-1 leading-5 text-[var(--muted-strong)]">{delivery.evidence.resolutionReview.requesterReviewerSeparated ? "Confirmed — requester and reviewer are separate identities." : "Not confirmed."}</dd></div>
                      <div><dt className="font-medium text-[var(--foreground)]">Requested</dt><dd className="mt-1 leading-5 text-[var(--muted-strong)]"><time dateTime={delivery.evidence.resolutionReview.requestedAt}>{formatTimestamp(delivery.evidence.resolutionReview.requestedAt)} UTC</time></dd></div>
                      <div><dt className="font-medium text-[var(--foreground)]">Expires</dt><dd className="mt-1 leading-5 text-[var(--muted-strong)]"><time dateTime={delivery.evidence.resolutionReview.expiresAt}>{formatTimestamp(delivery.evidence.resolutionReview.expiresAt)} UTC</time></dd></div>
                    </dl>
                    <div className="mt-3 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-3">
                      <p className="text-xs font-medium text-[var(--foreground)]">Request evidence</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">{delivery.evidence.resolutionReview.evidenceSummary}</p>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs font-medium text-[var(--foreground)]">Audit ledger</p>
                      {delivery.evidence.resolutionReview.audit.length > 0 ? (
                        <ol className="mt-2 space-y-2">
                          {delivery.evidence.resolutionReview.audit.map((entry, index) => (
                            <li className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-3 text-xs" key={`${entry.action}-${entry.occurredAt}-${index}`}>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-medium capitalize text-[var(--foreground)]">{entry.action}</span>
                                <span className="capitalize text-[var(--muted)]">{entry.actorRole} · {formatTimestamp(entry.occurredAt)} UTC</span>
                              </div>
                              <p className="mt-1 leading-5 text-[var(--muted-strong)]">{entry.evidence}</p>
                            </li>
                          ))}
                        </ol>
                      ) : <p className="mt-1 text-xs leading-5 text-[var(--warning-text)]">No audit entries are available for this request.</p>}
                    </div>
                    <p className="mt-3 border-t border-[var(--primary)] pt-3 text-xs font-medium leading-5 text-[var(--primary)]">Read only. No mutation, retry, or delivery control is exposed.</p>
                  </div>
                ) : null}
                {delivery.evidence.quarantine ? (
                  <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--success)] bg-[var(--success-soft)] p-4" aria-label="Recorded quarantine evidence">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--success)]">D4w · Final quarantine evidence</p>
                      <span className="rounded bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--success)]">Quarantined</span>
                    </div>
                    <h4 className="mt-2 text-sm font-medium text-[var(--foreground)]">Single-use resolution completed</h4>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">The real quarantine record was read from the development database. The original reservation and delivery-attempt evidence remain preserved.</p>
                    <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
                      <div><dt className="font-medium text-[var(--foreground)]">Final state</dt><dd className="mt-1 leading-5 text-[var(--muted-strong)]">Quarantined and non-retryable</dd></div>
                      <div><dt className="font-medium text-[var(--foreground)]">Applied by</dt><dd className="mt-1 capitalize leading-5 text-[var(--muted-strong)]">{delivery.evidence.quarantine.appliedByRole}</dd></div>
                      <div><dt className="font-medium text-[var(--foreground)]">Applied</dt><dd className="mt-1 leading-5 text-[var(--muted-strong)]"><time dateTime={delivery.evidence.quarantine.appliedAt}>{formatTimestamp(delivery.evidence.quarantine.appliedAt)} UTC</time></dd></div>
                      <div><dt className="font-medium text-[var(--foreground)]">Decision scope</dt><dd className="mt-1 leading-5 text-[var(--muted-strong)]">{delivery.evidence.quarantine.decisionScope.replaceAll("_", " ")}</dd></div>
                      <div className="sm:col-span-2"><dt className="font-medium text-[var(--foreground)]">Application evidence</dt><dd className="mt-1 leading-5 text-[var(--muted-strong)]">{delivery.evidence.quarantine.evidenceSummary}</dd></div>
                    </dl>
                    <p className="mt-3 border-t border-[var(--success)] pt-3 text-xs font-medium leading-5 text-[var(--success)]">Immutable outcome. No retry, delivery, provider-contact, or mutation control is exposed.</p>
                  </div>
                ) : null}
              </li>
              );
            })}
          </ol>
        )}
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">This view never retries a message or contacts the email provider.</p>
      </div>

      <div className="mt-5 border-t border-[var(--border)] pt-5" aria-labelledby="notification-quarantine-register-heading">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.04em] text-[var(--success)]">D4x · Quarantine register</p>
            <h3 className="mt-2 text-sm font-medium text-[var(--foreground)]" id="notification-quarantine-register-heading">Quarantine health and evidence</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">An account-wide read-only register of final, non-retryable notification outcomes.</p>
          </div>
          <span className="rounded bg-[var(--surface-muted)] px-2 py-1 text-xs font-medium text-[var(--muted-strong)]">Read only</span>
        </div>

        {history.state === "unavailable" ? (
          <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--warning)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-text)]">Quarantine health is temporarily unavailable. No delivery or retry action is permitted.</div>
        ) : quarantineRegister.total === 0 ? (
          <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-sm font-medium text-[var(--foreground)]">No quarantined notifications</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Final quarantine outcomes will appear here after a reviewed, single-use transition.</p>
          </div>
        ) : (
          <>
            <div className={`mt-4 rounded-[var(--radius-control)] border p-4 ${quarantineRegister.integrityIssueCount === 0 ? "border-[var(--success)] bg-[var(--success-soft)]" : "border-[var(--warning)] bg-[var(--warning-soft)]"}`} aria-labelledby="notification-quarantine-integrity-heading">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-[0.04em] ${quarantineRegister.integrityIssueCount === 0 ? "text-[var(--success)]" : "text-[var(--warning-text)]"}`}>D4y · Evidence integrity monitor</p>
                  <h4 className="mt-2 text-sm font-medium text-[var(--foreground)]" id="notification-quarantine-integrity-heading">{quarantineRegister.integrityIssueCount === 0 ? "Quarantine evidence is internally consistent" : "Quarantine evidence needs attention"}</h4>
                </div>
                <span className="rounded bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--foreground)]">Read only</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">Checks scope, reviewer separation, single-use audit actions, timestamp order, and final evidence against the immutable ledger.</p>
              <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                <div><dt className="text-[var(--muted)]">Integrity verified</dt><dd className="mt-1 font-medium text-[var(--foreground)]">{quarantineRegister.verifiedIntegrityCount} of {quarantineRegister.total}</dd></div>
                <div><dt className="text-[var(--muted)]">Detected inconsistencies</dt><dd className="mt-1 font-medium text-[var(--foreground)]">{quarantineRegister.integrityIssueCount}</dd></div>
              </dl>
            </div>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4"><dt className="text-xs text-[var(--muted)]">Total quarantined</dt><dd className="mt-1 text-lg font-medium text-[var(--foreground)]">{quarantineRegister.total}</dd></div>
              <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4"><dt className="text-xs text-[var(--muted)]">Complete evidence</dt><dd className="mt-1 text-lg font-medium text-[var(--foreground)]">{quarantineRegister.completeEvidenceCount} of {quarantineRegister.total}</dd></div>
              <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4"><dt className="text-xs text-[var(--muted)]">Oldest quarantine</dt><dd className="mt-1 text-lg font-medium text-[var(--foreground)]">{quarantineRegister.oldestAgeLabel}</dd></div>
            </dl>
            <ol className="mt-3 space-y-3">
              {quarantineRegister.entries.map((entry) => (
                <li className="rounded-[var(--radius-control)] border border-[var(--success)] bg-[var(--success-soft)] p-4" key={entry.eventId}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">Quarantined and non-retryable</p>
                      <p className="mt-1 break-all text-xs leading-5 text-[var(--muted-strong)]">{entry.recipientEmail}</p>
                    </div>
                    <span className={`rounded bg-[var(--surface)] px-2 py-1 text-xs font-medium ${entry.evidenceComplete ? "text-[var(--success)]" : "text-[var(--warning-text)]"}`}>{entry.evidenceComplete ? "Evidence complete" : "Evidence needs review"}</span>
                  </div>
                  <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-4">
                    <div><dt className="text-[var(--muted)]">Age</dt><dd className="mt-1 text-[var(--foreground)]">{entry.ageLabel}</dd></div>
                    <div><dt className="text-[var(--muted)]">Applied</dt><dd className="mt-1 text-[var(--foreground)]"><time dateTime={entry.appliedAt}>{formatTimestamp(entry.appliedAt)} UTC</time></dd></div>
                    <div><dt className="text-[var(--muted)]">Scope</dt><dd className="mt-1 text-[var(--foreground)]">{entry.decisionScope.replaceAll("_", " ")}</dd></div>
                    <div><dt className="text-[var(--muted)]">Independent review</dt><dd className="mt-1 text-[var(--foreground)]">{entry.independentReviewConfirmed ? "Confirmed" : "Needs review"}</dd></div>
                  </dl>
                  {entry.integrityIssues.length > 0 ? (
                    <div className="mt-3 rounded-[var(--radius-control)] border border-[var(--warning)] bg-[var(--surface)] p-3">
                      <p className="text-xs font-medium text-[var(--warning-text)]">Integrity attention required</p>
                      <ul className="mt-1 space-y-1 text-xs leading-5 text-[var(--muted-strong)]">{entry.integrityIssues.map((issue) => <li key={issue}>• {issue}</li>)}</ul>
                    </div>
                  ) : (
                    <p className="mt-3 border-t border-[var(--success)] pt-3 text-xs font-medium text-[var(--success)]">Integrity verified against the linked review and audit ledger.</p>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
        <p className="mt-4 text-xs font-medium leading-5 text-[var(--success)]">Permanent safety boundary: this monitor is read only and exposes no restore, retry, deletion, delivery, or provider-contact control.</p>
      </div>

      <NotificationActivationChecklist readiness={readiness} />

      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">No notifications are enabled or sent by this preview.</p>
    </section>
  );
}
