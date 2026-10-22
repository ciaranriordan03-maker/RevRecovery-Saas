# D6c3 Redacted Operational Observability

**Implemented:** 20 October 2026

**Branch:** `codex/release-c-activation-readiness`

**Boundary:** Operational evidence only; no delivery activation, customer contact, provider mutation, database mutation, merge, or production deployment

## Outcome

D6c3 adds an explicit, server-only operational capture boundary for unexpected caught failures in the recovery cron, Stripe and Resend webhooks, recovery delivery, and notification reconciliation paths.

The boundary sends Sentry a newly constructed error with a stable code. It deliberately does **not** send the caught exception, exception message, request URL, headers, webhook body, email address, Stripe or Resend identifier, database record ID, recipient, token, or payload. Runtime context is restricted to bounded counts, a fixed processing stage, an optional HTTP status, and whether a retry was scheduled.

Expected input and authorization failures remain quiet:

- invalid Stripe and Resend signatures return generic `400` responses;
- unauthorized recovery-cron requests return `401`;
- blocked delivery gates remain normal policy outcomes;
- normal duplicate webhook outcomes remain normal responses.

The recovery processor now returns a stable public `500` message instead of exposing a caught exception message.

## Alert policy

These thresholds are code-owned in `app/lib/observability/operational-alerts.ts`. Sentry events carry `alert_code`, `alert_area`, `alert_route`, and `customer_contact=none` tags plus the threshold in redacted context.

| Signal | Threshold | Route | First operator action |
| --- | --- | --- | --- |
| Recovery cron failed | 1 in 5 minutes | Operator and engineering | Keep delivery disabled when the cause is unclear; inspect and forward-fix before replay. |
| Stripe webhook processing failed | 3 in 15 minutes | Operator and engineering | Inspect the retry ledger; do not replay while the same failure remains active. |
| Resend webhook unavailable/persistence failed | 1 in 5 minutes | Operator and engineering | Restore configuration or persistence health before relying on provider replay. |
| Unexpected recovery-delivery failure | 3 in 15 minutes | Engineering | Inspect the retry-safe group; stop new claims if the failure repeats. |
| Terminal recovery-delivery failure | 3 in 15 minutes | Operator and engineering | Stop new claims if systemic; correct the configuration or provider condition. |
| Test-notification provider outcome unknown | 1 in 5 minutes | Operator and engineering | Keep the event non-retryable and reconcile independent provider evidence. |
| Notification reconciliation required | 1 in 5 minutes | Operator and engineering | Finalize only the existing accepted outcome; never resend. |
| Stale claim detected by an operational health check | 2 observations in 10 minutes | Engineering | Quarantine uncertain evidence; never retry before reconciliation. |

The role-based routes are intentionally not email addresses. D6d must verify the real Sentry project and destination mapping without exposing a DSN or changing notification delivery settings. A route tag does not itself enable customer or operator email delivery.

## Safe non-delivery drill

Command:

```bash
npm run drill:operational-alert
```

The drill uses the production redaction builder and server-side Sentry capture boundary with an in-memory mocked transport. It proves:

- exactly one operational event is captured;
- the fingerprint is stable;
- the route and `customer_contact=none` tags are present;
- the caught exception message is absent;
- no network transport, database, Stripe, Resend, customer, or operator notification is contacted.

This is a transport-boundary drill, not proof that a remote Sentry alert rule or destination is configured. That remote inventory belongs to D6d.

## Operator recovery runbook

### Stop

1. Preserve the failing event, claim, attempt, and reconciliation evidence.
2. Keep `RECOVERY_DELIVERY_ENABLED` false or set `RECOVERY_DELIVERY_KILL_SWITCH` true when recovery delivery safety is uncertain.
3. Keep both essential-notification delivery gates false.
4. Do not delete, rewrite, manually complete, or recreate uncertain delivery records.
5. Do not replay a provider request merely because the application returned `500`.

These are operator instructions, not actions performed by D6c3.

### Inspect

1. Group by the stable `alert_code` fingerprint.
2. Check the bounded attempt count, stage, and retry flag.
3. Reconcile against immutable database evidence and the provider dashboard without copying customer data into Sentry.
4. Decide whether the failure is pre-provider, provider-accepted, or outcome-unknown.

### Forward-fix

1. Correct code or configuration while all affected delivery gates remain closed.
2. Run `npm run preflight:delivery`, focused regression tests, lint, and a production build.
3. Prefer an additive forward fix; do not roll back a migration that may already hold evidence.
4. Verify the fix in Preview/Test before considering any replay.

### Replay

- **Stripe webhook:** replay only a known signed event after the processing defect is fixed; rely on the existing event ledger, claim lease, and idempotent completion.
- **Resend webhook:** rely on provider replay only after signature verification and persistence are healthy.
- **Recovery cron:** run a bounded batch only after the fault is fixed and existing claim leases are understood.
- **Recovery email:** only database-designated retryable messages may retry through the existing idempotency key. Terminal or uncertain outcomes must not be converted manually.
- **Essential notification:** there is no generic retry path. Reconcile or quarantine uncertain outcomes under the reviewed D4 controls.

## Verification and acceptance boundary

D6c3 requires the full test suite, lint, production build, and the dedicated drill to pass locally. It then requires fresh GitHub and Vercel checks for the exact commit before remote acceptance.

No user-facing UI changed, so there is no visual Preview acceptance step for D6c3. No Sentry project setting, alert destination, Vercel variable, Supabase record, Stripe object, Resend object, delivery gate, merge state, or production deployment is changed by this slice.

**Next logical step after remote D6c3 acceptance:** D6d—a read-only production rollout inventory covering Vercel variable names/scopes, Sentry routing presence, migration state, backup/restore readiness, stop conditions, and separately approved merge/migration/deployment steps.
