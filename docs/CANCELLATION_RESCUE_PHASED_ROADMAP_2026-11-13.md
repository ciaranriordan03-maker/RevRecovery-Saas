# Cancellation Rescue Phased Roadmap

Date: 2026-11-13 (status updated 2026-11-24)
Status: Phases 0–3B implemented and controlled-test verified in Development; all action controls are disabled

## Product boundary

Cancellation rescue is a separate recovery domain from failed-payment recovery. A case begins when a Stripe subscription changes from not scheduled for cancellation to `cancel_at_period_end = true`. Phase 1 observes and records that transition only. It does not schedule email, send email, expose a customer link, mutate Stripe, or change the product UI.

The evidence language is deliberately conservative:

- scheduled recurring value at risk;
- scheduled cancellation;
- cancellation reversed outside RevRecovery;
- rescued subscription (reserved for a later, directly confirmed rescue action);
- retained recurring value (only when the evidence contract supports it).

## State and evidence contract

### Account modes

`disabled`, `shadow`, `test`, `approval_required`, and `live` are stored per Stripe account and environment. New accounts default to `shadow`. Phase 1 contains no delivery or Stripe-mutation path in any mode, so setting a later mode early cannot send or mutate anything.

### Phase 1 case states

- `shadow`: a scheduled cancellation observed without outreach.
- `reversed`: Stripe later reports `cancel_at_period_end = false` for the same episode.
- `terminated`: Stripe deletes the subscription while the episode is open.
- `expired`: reserved for reconciliation that proves the scheduled end passed without a deletion event.
- `ineligible`: reserved for a future explicit eligibility policy.
- `failed_operationally`: reserved for an auditable processing failure.

Each false-to-true transition creates a new episode. Repeated true-to-true updates amend the same episode. A true-to-false transition closes it. A later false-to-true transition creates a new episode.

### Ordering and isolation

The authoritative ordering fact is Stripe event creation time. Events older than the latest applied event for the same account, environment, and subscription are ignored. Exact event IDs are idempotent. Test and live data cannot collide. Different connected accounts cannot collide. Equal-timestamp, different-ID events are processed in arrival order because Stripe IDs do not provide a documented total ordering; every accepted event remains in the case ledger.

### Recurring value

Phase 1 records subscription-item list price only when every item has a finite integer unit amount, a valid quantity, the same currency, and the same recurring interval. Otherwise the value remains null. Discounts, taxes, metered usage, tiered prices, mixed intervals, and missing prices are never estimated.

## Phase 0 — Architecture and evidence contract

**Objective:** define isolation, state transitions, ordering, attribution, security boundaries, and future UI contracts.

**Files and systems:** this roadmap; cancellation policy types; Stripe webhook boundary; Supabase migration design.

**Database changes:** none beyond the Phase 1 design.

**Runtime behaviour:** none.

**Security risks:** accidental reuse of payment-specific links or delivery paths; unsupported attribution claims; tenant/environment collisions.

**Failure states:** ambiguous ordering, missing Stripe fields, mixed-currency subscriptions, immediate termination.

**Tests:** pure policy tests and migration-contract tests begin in Phase 1.

**Acceptance criteria:** explicit state machine, evidence vocabulary, isolation boundary, and no UI/delivery/mutation requirement.

**Rollback:** documentation and isolated code can be removed without touching failed-payment data.

**Deferred:** all external actions and UI.

## Phase 1 — Cancellation detection and shadow persistence

**Objective:** detect scheduled cancellation episodes and persist an immutable, explainable shadow record.

**Files and systems:** Stripe Connect webhook handler, subscription-state recorder, initial Stripe sync, cancellation policy module, cancellation server store, Supabase migration, unit and migration tests.

**Database changes:** account/environment settings, per-subscription ordering state, cancellation cases, and append-only case events. A service-only transactional RPC serializes episode creation and transitions.

**Runtime behaviour:** webhook and initial-sync observations create or update shadow cases. Reversals and deletions close an open episode. No message record exists.

**Security risks:** cross-tenant writes, stale event overwrite, raw payload over-collection, service RPC exposure.

**Failure states:** missing customer/subscription ID, missing end date, unknown value, duplicate event, stale event, database unavailability.

**Tests:** first event, duplicate, repeated true, reversal, second episode, deletion, stale event, environment/account isolation, missing identifiers/date/value, shadow non-delivery, migration privileges, and no UI changes.

**Acceptance criteria:** one case per episode; transactional ordering; append-only evidence; default shadow; existing failed-payment behaviour unchanged; no sending or mutation imports.

**Rollback:** stop invoking the isolated recorder and leave additive evidence tables intact. No destructive rollback is required.

**Deferred:** sequences, messages, tokens, customer routes, UI, alerts, and analytics.

## Phase 2 — Sequence orchestration without delivery

**Implementation status (2026-11-13):** implemented as an isolated draft-only projection. Schedules anchor from the later of detection or projection time, contain at most three drafts, require at least 30 minutes before the scheduled end, maintain at least 12 hours between drafts, and never schedule at or after the end. The sequence records recipient readiness as unresolved; no recipient address or delivery readiness is inferred. Reversal, termination, unsupported modes, and policy ineligibility cancel or suppress drafts transactionally. No provider, token, customer route, rescue link, delivery attempt, or Stripe-write field exists.

**Objective:** create cancellation-specific sequence and message projections without any provider call.

**Files and systems:** new cancellation sequence policy, scheduler, cancellation templates, reconciliation worker, isolated tables.

**Database changes:** `cancellation_sequences` and `cancellation_messages`, configuration snapshots, uniqueness and terminal-state constraints.

**Runtime behaviour:** eligible test/shadow cases receive draft schedules bounded by the subscription end date. Short windows collapse safely. Reversal or termination cancels pending drafts.

**Security risks:** accidentally entering the existing failed-payment delivery queue; scheduling after termination; payment-link reuse.

**Failure states:** no email, too little remaining time, no verified domain, overlapping merchant communication, configuration drift.

**Tests:** schedule boundaries, message uniqueness, terminal cancellation, no delivery adapter imports, and deterministic snapshots.

**Acceptance criteria:** explainable drafts only; zero external delivery capability.

**Rollback:** disable orchestration and cancel draft projections.

**Deferred:** provider delivery, token generation, Stripe writes, and UI.

## Phase 3 — One-time rescue token and Stripe reversal in test mode

**Implementation status (2026-11-24):** Phase 3B is implemented on an isolated
branch as disabled-by-default test-mode infrastructure. It adds hashed one-time
tokens, service-only atomic reservation and audit RPCs, same-origin JSON POST
preview/confirmation routes, durable rate limiting, a platform-and-account
double kill switch, a test-secret-only Stripe adapter, and reconciliation for
ambiguous outcomes. No issuer route, customer page, email integration, or live
mode exists. The migration was applied to Development on 2026-11-24 and the
rate-limit secret was saved for Preview, Development, and staging only.

**Controlled Development evidence (2026-11-24):** one explicitly approved
Stripe test-mode subscription (`sub_1UbIuuId8BdDViAdXU89lJZb`) was prepared
under one Development account and one short-lived token. The neutral preview
recorded `issued` and `previewed` without a Stripe attempt. The separately
approved confirmation re-fetched the subscription and changed
`cancel_at_period_end` from `true` to `false` under Stripe request
`req_8oHm3jm6Xwn2sr`. Stripe webhook
`evt_1UfNVFId8BdDViAdGA6R8PMo` was processed without error, the cancellation
case moved to `reversed`, the attempt reached `confirmed`, both projection jobs
completed, and the draft sequence and all three draft messages were canceled.
The complete token evidence order is `issued`, `previewed`, `reserved`,
`stripe_accepted`, `confirmed`. A preliminary token was revoked fail-closed
after a request omitted the required same-origin browser header; it created no
attempt and made no Stripe call. After the successful test, the platform and
test-action controls were returned to false, the account returned to `shadow`,
and zero accounts remained action-enabled. No email/provider call, live-mode
operation, Production deployment, or Production data change occurred.

**Objective:** let an explicitly consenting test customer reverse a scheduled cancellation safely.

**Files and systems:** hashed token store, neutral preview service, POST confirmation service, Stripe mutation adapter, reconciliation job, audit events. Any route remains test-only until later approval.

**Database changes:** `cancellation_rescue_tokens`, atomic reservation/use RPCs, expiry and invalidation fields, reconciliation state.

**Runtime behaviour:** opaque bounded tokens preview without mutation; explicit POST re-fetches Stripe state and uses an idempotency key to set `cancel_at_period_end = false`; webhook/reconciliation confirms success.

**Security risks:** token leakage, replay, CSRF, account confusion, enumeration, concurrent confirmation, Stripe-success/database-failure split brain.

**Failure states:** expired/used token, terminal subscription, state drift, Stripe timeout, webhook delay, disconnected account.

**Tests:** token hashing, atomic single use, neutral errors, origin/CSRF checks, rate limits, re-fetch checks, idempotency, and reconciliation.

**Acceptance criteria:** test-mode reversal only; no GET mutation; no raw token storage; every transition audited.

**Rollback:** disable test route and revoke outstanding tokens; reconcile any confirmed Stripe changes.

**Deferred:** live links and general customer UI.

## Phase 4 — Controlled test delivery and reconciliation

**Phase 4A — local, dormant infrastructure:** one operator requests and a different
operator reviews a single test email for a scheduled Development cancellation.
The request binds the test account, episode, exact recipient, verified sender,
scheduled end, and fixed synthetic copy version for up to 15 minutes. Dispatch
also requires a dedicated allowlisted inbox, an explicit server flag, and
separate disabled-by-default platform/account test-email controls. The database
checks the current case, verified sender, and suppression before atomically
reserving one attempt. Disabling or revoking stops unreserved work; a provider
request already in flight cannot be recalled. A reserved or unknown attempt
cannot be retried. Provider acceptance would not prove delivery.

There is no provider transport, live recipient lookup, email job, public route,
webhook integration, Stripe write, or usable rescue link in 4A.

**Local SQL validation (2026-11-24):** all 37 repository migrations applied in a
disposable, network-disabled PostgreSQL 17.6 container using the Supabase database
image and synthetic Auth users. The Phase 3A and 4A pgTAP fixtures passed. Two
concurrent service-role reservations against the same authorization produced
one claim and one rejection. Subsequent replay and duplicate completion were
blocked; only the winning claim could finalize synthetic acceptance. The
migration remains unapplied in Development and Production. No provider was
contacted.

**Phase 4B — provider contract, mocked only:** a dedicated Resend adapter takes
its HTTP client and credential explicitly. It has no default network client or
environment credential lookup, and nothing in the app calls it. It allows only
the fixed test email and the exact approved inbox, passes one stable idempotency
key, rejects redirects, and never retries. Successful HTTP acceptance is not
delivery. A timeout leaves the attempt nonretryable.

The separate evidence reviewer verifies the raw Svix signature and binds each
event to the test authorization tag, fixed subject, sender, single recipient,
send window, and any known provider message ID. Verified evidence may help
resolve an unknown transport result without resending. Unmatched or conflicting
events do not alter the result. Duplicate events are detected against supplied
history; permanent bounces, complaints, and suppression remain visible even if
a later delivery event arrives. No raw webhook body or diagnostic is returned.
This slice does not register a webhook or persist results. It does not route
cancellation evidence into failed-payment messages, reporting, or suppressions.

**Durable evidence follow-up — local only:** a separate service-only ledger
records verified, sanitized delivery facts. A provider message can bind to only
one authorization, whether the signed event or HTTP receipt arrives first.
PostgreSQL deduplicates provider event IDs and rejects conflicting facts
atomically. The read-only projection preserves bounce/complaint evidence without
overwriting the original transport result. Neither a receipt nor a webhook
reopens an attempt, changes a subscription, or writes to failed-payment recovery.

Validated on a disposable, network-disabled PostgreSQL 17.6 instance with all 38
repository migrations. The upgrade carried forward a synthetic pre-existing
provider receipt. A synthetic signed event passed through the server verifier
into PostgreSQL; a tampered body never reached storage and replay added no row.
With two simultaneous sessions reusing one event ID, only one recorded it and
only its binding remained. The SQL fixture also verified sender, recipient, time
window, privilege, and sticky complaint safeguards. The switches stayed off.

Before exercising delivery, review the two local slices and prove the isolated
cancellation suppression guard prevents a fresh test authorization from
sending again to a suppressed inbox. There is still no webhook route or provider
configuration. Development migration, provider setup, an independently approved
test inbox, and one real send each require separate approval.

**Objective:** send cancellation-specific emails only to approved test recipients.

**Files and systems:** dedicated delivery adapter, Resend metadata/webhooks, suppression checks, sending-domain readiness, controlled test authorization.

**Database changes:** delivery attempts and provider event projection for cancellation messages.

**Runtime behaviour:** test mode rewrites recipients to an approved address and enforces one-time authorization. Complaints, bounces, reversal, and termination stop delivery.

**Security risks:** recipient leakage, provider metadata confusion, duplicate sends, unverified sender.

**Failure states:** provider timeout, bounce, complaint, suppression, stale case, invalid link.

**Tests:** fail-closed recipient routing, idempotent sends, provider reconciliation, stop conditions, and no live recipient delivery.

**Acceptance criteria:** controlled evidence proves end-to-end test delivery and stopping behaviour.

**Rollback:** disable delivery mode, cancel due messages, revoke test authorizations.

**Deferred:** founding-customer recipients and UI controls.

## Phase 5 — Approval-required founding-customer pilot

**Objective:** operate a small live pilot where every sequence requires merchant approval.

**Files and systems:** approval policy/API, operational alerts, runbook, rollback tooling, pilot allowlist.

**Database changes:** approval records and approver audit trail.

**Runtime behaviour:** prepare drafts; require explicit approval; deliver only for allowlisted accounts after readiness checks.

**Security risks:** broad enablement, stale approval, wrong recipient, unsupported offer language.

**Failure states:** missing approval, configuration drift, domain health regression, disconnected Stripe account.

**Tests:** allowlist, approval expiry, configuration binding, emergency stop, and audit completeness.

**Acceptance criteria:** limited live evidence with immediate rollback and no autonomous rollout.

**Rollback:** account kill switch, cancel pending messages, invalidate tokens, preserve evidence.

**Deferred:** automatic live mode and general availability.

## Phase 6 — Carefully integrated dashboard and settings UI

**Objective:** expose proven cancellation cases and controls without disrupting the current failed-payment workspace.

**Files and systems:** server page-data contracts first; then focused shared components, navigation decision, settings, accessibility and responsive tests.

**Database changes:** none unless pilot evidence proves a missing projection.

**Runtime behaviour:** view cases, preview copy, approve sequences, inspect evidence, and configure the feature mode.

**Security risks:** UI implying unsupported causality; unsafe mode changes; client-side database access.

**Failure states:** partial data, stale status, unavailable Stripe account, inaccessible controls.

**Tests:** server boundaries, truthful content, accessibility, responsive layout, and regression snapshots.

**Acceptance criteria:** additive UI that follows the existing design system and leaves failed-payment journeys intact.

**Rollback:** remove feature entry points while backend recording continues in shadow.

**Deferred:** broad redesign.

## Phase 7 — Analytics, optimisation, and broader rollout

**Objective:** measure scheduled cancellation volume, reversals, direct rescue actions, retained recurring value, and sequence performance conservatively.

**Files and systems:** evidence-backed metrics, cohorts, exports, operational dashboards, rollout policy.

**Database changes:** only proven aggregate projections or indexes.

**Runtime behaviour:** mature accounts can move from approval-required to live after explicit readiness review.

**Security risks:** causal overstatement, immature cohorts, mixed currencies, automatic rollout.

**Failure states:** incomplete outcomes, currency ambiguity, provider gaps, delayed Stripe events.

**Tests:** cohort maturity, currency separation, direct-versus-associated attribution, and rollout gates.

**Acceptance criteria:** metrics reconcile to case evidence and Stripe state; live activation remains explicit.

**Rollback:** return accounts to approval-required or shadow without losing history.

**Deferred:** predictive churn scoring, save offers, pause/downgrade flows, and product-usage integrations.

## Phase 1 unsupported states

- Immediate cancellations are terminal observations, not rescue opportunities.
- Fully deleted subscriptions are never reactivated.
- Missing customer IDs prevent case creation.
- Missing scheduled-end dates are recorded without inventing a date.
- Mixed currencies, mixed intervals, metered/tiered/unknown prices, discounts, and taxes do not produce a recurring-value estimate.
- Equal-second Stripe events have no documented total order; accepted arrival order and the full ledger remain the evidence.
- Shadow mode produces no messages, links, provider calls, or Stripe writes.
