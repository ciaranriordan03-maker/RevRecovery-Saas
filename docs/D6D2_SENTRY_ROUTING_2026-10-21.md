# D6d2 Sentry Operational Routing Evidence

**Reviewed:** 21 October 2026

**Branch:** `codex/release-c-activation-readiness`

**Application evidence base:** `8c32b28` (`Record verified production backup`)

**Decision:** Sentry operational routing passes; application delivery remains fail-closed and Production release approval remains withheld pending the authoritative redacted preflight

## Boundary

This configuration was applied under explicit approval to create Production operational monitors, map their logical routes to the available Sentry member, attach the Production uptime monitor, remove duplicate general-error routing, and issue one operator test notification.

It did **not** deploy RevRecovery, merge the branch, apply a database migration, enable recovery or essential-notification delivery, send a customer email, contact Stripe or Resend, or alter customer data. The one test notification was a Sentry operator-routing test only.

No token, DSN, secret, or private configuration value was printed or committed. The evidence below records only rule identifiers, redacted filters, thresholds, logical routes, and safe state.

## Applied routing topology

| Purpose | Sentry workflow | Connected sources | Destination | State |
| --- | --- | --- | --- | --- |
| Operator + engineering operations | `1400637` | Six operational metric monitors plus Production uptime `2250619` | Sole available Sentry organization member | Enabled |
| Engineering operations | `1400644` | Two engineering metric monitors | Sole available Sentry organization member | Enabled |
| General Production errors | `1400698` | Default Error Monitor `1665364` only | Suggested issue owners, falling back to recently active members | Enabled; `production` only |
| Legacy project-wide issue alert | `769746` | All-issues stream `1665365` | Former suggested-owner/active-member route | **Disabled** to prevent duplicate operational alerts |

The two logical operational routes currently reach the same person because the Sentry organization has one member. The route separation is still encoded and independently verifiable, but it is not human redundancy. Add a second operator or an independently owned connector before relying on this topology for a larger live workload.

## Operational monitor contract

Every metric detector is enabled, scoped to Sentry environment `production`, and requires all three redacted tags:

- its exact `alert_code`;
- its exact `alert_route`; and
- `customer_contact:none`.

| Alert code | Detector | Trigger | Logical route | Workflow |
| --- | --- | --- | --- | --- |
| `recovery_cron_failed` | `2487669` | First event in 5 minutes | `operator_and_engineering` | `1400637` |
| `notification_reconciliation_required` | `2487688` | First event in 5 minutes | `operator_and_engineering` | `1400637` |
| `notification_test_delivery_outcome_unknown` | `2487701` | First event in 5 minutes | `operator_and_engineering` | `1400637` |
| `recovery_delivery_terminal_failed` | `2487719` | Third event in 15 minutes | `operator_and_engineering` | `1400637` |
| `recovery_delivery_unexpected_failed` | `2487725` | Third event in 15 minutes | `engineering` | `1400644` |
| `resend_webhook_failed` | `2487728` | First event in 5 minutes | `operator_and_engineering` | `1400637` |
| `stale_claim_detected` | `2487734` | Second event in 10 minutes | `engineering` | `1400644` |
| `stripe_webhook_processing_failed` | `2487737` | Third event in 15 minutes | `operator_and_engineering` | `1400637` |

Each detector description contains its code-owned response guidance: preserve `customer_contact:none`, stop or quarantine uncertain delivery, inspect evidence, forward-fix, and replay only after the relevant boundary is healthy.

## Duplicate and noise controls

- The operational detectors use code-specific tags and thresholds rather than a broad project stream.
- The existing Production uptime monitor is connected once, to the operator-and-engineering route.
- The legacy project-wide high-priority alert is disabled.
- General Production errors remain covered by a replacement alert connected only to the default Error Monitor.
- Operational alerts fire on newly created detector issues; no additional resolved, escalated, or regressed trigger was retained.
- No second test notification was sent while completing the duplicate safeguard.

## Verification evidence

Authenticated read-only Sentry API checks confirmed:

- all eight metric detectors are enabled with the exact saved query, Production environment, aggregate, time window, threshold, and workflow attachment shown above;
- workflows `1400637`, `1400644`, and `1400698` are enabled;
- workflow `1400698` is restricted to `production` and detector `1665364`;
- legacy workflow `769746` is disabled; and
- the uptime detector is attached to workflow `1400637`.

The approved Sentry test-notification control was exercised once. The UI completed the send request and returned control; receipt was not independently recorded in this repository. This is destination-path evidence, not an application-delivery drill.

## Acceptance state

The D6c3 route and threshold contract is now represented in live Sentry configuration, the Production uptime monitor has an operator route, and the broad legacy alert no longer duplicates the scoped routes. This closes the Sentry-routing prerequisite.

RevRecovery remains fail-closed: the four application delivery controls stay at `false`, `true`, `false`, and `false` respectively, and no customer-contact path was exercised.

Repository verification passed `npm run lint` and `npm run build -- --webpack`. The ordinary Turbopack build was also attempted, but this restricted host denied its temporary internal parser port before source parsing; the webpack production build compiled, type-checked, and generated all application routes successfully.

**Next logical step:** run the redacted preflight in an authoritative, separately approved Production deployment context. Stop if any public origin, secret prerequisite, or delivery gate differs from the reviewed fail-closed state; do not request migration approval until that evidence passes.
