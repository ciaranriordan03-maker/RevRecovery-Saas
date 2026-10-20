# D6c Security and Operational Release Review

**Reviewed:** 20 October 2026  
**Branch:** `codex/release-c-activation-readiness`  
**Reviewed head:** `17bb743` (`Record D6b release candidate acceptance`)  
**Pull request:** `#1`  
**Decision:** Demo-safe release candidate; not approved for merge or production yet

> **D6c1 update:** The vulnerable production dependency graph and Stripe Connect return-path finding were remediated locally after this audit. See `D6C1_SECURITY_REMEDIATION_2026-10-20.md` for the exact versions, safeguards, tests, and remaining remote acceptance condition.

## Review boundary

This review examined the current 137-file branch diff, authentication and tenant boundaries, secret handling, dashboard write routes, Stripe and Resend webhooks, recovery cron processing, delivery gates, additive migrations, Sentry configuration, CI, and available rollback/replay evidence.

It was read-only with respect to Supabase, Stripe, Resend, Vercel configuration, and production. It did not expose environment-variable values, change a delivery gate, send an email, mutate product data, apply a migration, merge, or deploy. The only external query was the read-only npm advisory check.

This is a targeted engineering release review, not a penetration test or security certification.

## Executive decision

The application-level safety design is materially stronger than it was at the start of the roadmap. Authentication, tenant scoping, provider signature verification, database leases, idempotency, Test/Live separation, single-use notification authorization, reconciliation, quarantine, and evidence checkpoints are all present and covered by substantial regression evidence.

However, the branch must not be merged or deployed to production yet. Two concrete code/dependency blockers and several production-operational gates remain:

1. The locked dependency graph has known production vulnerabilities, including a critical advisory affecting the installed Next.js version.
2. Stripe Connect accepts a return path that can resolve to another origin in an edge case.
3. Recovery delivery still has legacy fail-open behavior that should be changed before a production account can become Live.
4. Caught webhook, cron, and API failures are not consistently sent to Sentry, and alert routing/replay procedures have not been proven.
5. Production environment scope, migrations, backup/restore readiness, and rollback/stop procedures still require an evidence-backed rollout review.

These findings do not invalidate the accepted D6b Preview smoke test. The current branch remains suitable for a controlled product demo using the existing development/Test account and the no-customer-contact boundary.

## Current release assessment

| Boundary | Status | Decision |
| --- | --- | --- |
| Approved feature-depth roadmap | **100% complete** | No further broad feature slice is required. |
| Exact-Preview product smoke | **Passed** | D6b covered the complete product path with no customer contact. |
| Dependable demo readiness | **Approximately 97%** | The product is demo-capable; a stable fixture and rehearsed script remain. |
| Controlled first-pilot readiness | **Approximately 84%** | The remaining work is security remediation, operational proof, rollout, and post-deploy verification. |
| Merge approval | **Not granted** | Resolve the code/dependency blockers and rerun checks first. |
| Production deployment approval | **Not granted** | D6d and D6e remain mandatory and separately approved. |

The pilot percentage has not regressed. D6c has made the previously reserved release-and-operations work concrete.

## Strengths verified

### Authentication, tenancy, and database boundaries

- Dashboard mutations obtain the authenticated Supabase subject before acting.
- User-owned reads and writes pass the authenticated user ID into server-only data functions.
- The reviewed recovery and notification tables use row-level security for authenticated reads.
- Sensitive database functions use an empty `search_path`, revoke public/anonymous/authenticated execution, and grant execution to `service_role` where appropriate.
- Synthetic-case creation revalidates Test-mode eligibility on the server.
- The manual pause path validates the case UUID and relies on a user-scoped database transition.
- No obvious unauthenticated or cross-tenant mutation was found in the reviewed routes.

### Provider and delivery boundaries

- Stripe and Resend webhook signatures are verified against the untouched request body before processing.
- Stripe events are persisted, leased atomically, deduplicated, environment-checked, and completed with retry-aware status.
- Stored Stripe webhook error metadata is intentionally sanitized.
- Recovery messages use database claims, leases, bounded retries, provider idempotency keys, active-sequence checks, Stripe stop checks, suppressions, verified sending domains, and Test recipient routing.
- The database claim function requires an account setting in `test` or `live`; `off` and `paused` accounts are not claimable.
- Essential notification delivery requires independent global, account, approved-recipient, event, authorization, reservation, and provider-readiness gates.
- Notification authorizations and reservations are single-use and time-bounded; post-send reconciliation, quarantine, and immutable evidence checkpoints are present.
- General essential-notification delivery remains disabled unless both explicit environment gates are exactly `true`.

### Secrets, CI, and monitoring foundations

- Secret-bearing SDK clients are server-only and use the Supabase secret key only on the server.
- Stripe access and refresh tokens are encrypted at rest with AES-256-GCM.
- `.env*` files are ignored; `.env.example` is the only tracked environment file.
- A targeted tracked-file scan found no obvious live Stripe secret, webhook secret, or private-key signature. This was not a full secret-scanning service.
- GitHub Actions uses pinned action SHAs and read-only repository permissions.
- CI runs the full test suite, lint, and production build.
- Sentry is initialized for browser, server, and edge runtimes with default PII disabled, limited tracing, and uploaded source maps removed after upload.
- D6b acceptance commit `17bb743` is preserved remotely, and GitHub CI plus Vercel checks passed.

## Release blockers

### 1. Vulnerable production dependency graph

`npm audit --omit=dev` reported six production dependency findings: one critical, four high, and one moderate. The installed versions include:

- `next@16.3.0`, within the audit's vulnerable `16.0.0`–`16.3.7` range.
- `sharp@0.35.3`.
- `@dicebear/core@9.4.2`.
- Vulnerable transitive versions of `fast-uri`, `source-map-js`, and `brace-expansion`.

The non-mutating remediation preview proposed Next.js `16.4.2` and patched versions of the other affected packages. No dependency was changed during this review. The remediation must be applied deliberately, the Next 16 migration/deprecation guidance must be checked, and tests, lint, build, a fresh audit, and a fresh Preview smoke must all pass afterward.

**Release effect:** blocks merge and production deployment.

### 2. Stripe Connect return-path validation is not origin-safe

`app/api/stripe/connect/route.ts` accepts any `next` value beginning with `/`. Values such as `//example.com/path` or `/\\example.com` are then passed to `new URL(path, request.url)` in the callback and resolve to another origin. The OAuth error path also consults decoded state before the state cookie is validated.

The application already has a stricter `sanitizeAppRedirect` helper that rejects protocol-relative paths and restricts navigation to approved app routes, but Stripe Connect does not use it.

The fix should sanitize the return path when the flow starts and again when callback state is consumed, validate state before using it on error paths, and add regression coverage for protocol-relative and backslash variants.

**Release effect:** blocks merge and production deployment.

## Required before production deployment

### 3. Recovery delivery must fail closed

- `getRecoveryAccountRuntimeSettings` currently returns legacy mode `live` if the admin client is unavailable, the settings table is missing, or no settings row exists.
- `RECOVERY_DELIVERY_KILL_SWITCH` only stops delivery when its value is exactly `true`; an absent variable therefore does not act as a production lock.
- `.env.example` does not document `RECOVERY_DELIVERY_KILL_SWITCH` or `ESSENTIAL_NOTIFICATION_AUTHORIZED_TEST_DELIVERY_ENABLED`.

Database claiming and account defaults provide important additional protection, so this is not evidence that the current development account can contact customers. Nevertheless, production release should use a fail-closed application contract: missing/invalid account state resolves to `off`, and production delivery requires an explicit enablement decision rather than the absence of a kill switch.

### 4. Caught failures need explicit operational capture

Sentry catches unhandled route and render failures, and the global error boundary captures UI failures. Several important handlers intentionally catch failures and return HTTP errors without calling Sentry, including recovery processing and Resend webhook persistence. Stripe webhook failures are durably recorded and returned with retry semantics, but are not explicitly captured for operator alerting.

Before a pilot, expected user/input errors should remain quiet while unexpected `5xx`, exhausted webhook retries, terminal delivery failures, stale claims, and cron failures should create actionable, redacted telemetry. Alert routing and one controlled alert drill must be proven.

### 5. Production secret and rollout controls remain unverified

- Stripe token encryption falls back to the Supabase secret key if `STRIPE_TOKEN_ENCRYPTION_KEY` is absent. Production should require a dedicated encryption key and document rotation/recovery.
- The actual Vercel Production/Preview variable names and scopes have not been reverified in D6c. Values must never be copied into the review.
- The linked development migration state was proven during D4/D5, but production migration state has not been inspected or changed.
- No complete production preflight, migration rollback/forward-fix, webhook replay, database restore, or post-deploy stop-condition runbook currently exists.

These are D6d gates. They require read-only inventory first and separate approvals for any environment, migration, merge, or deployment mutation.

## Required before inviting an external pilot

- Stripe Connect currently asks for `read_write`, while the reviewed product operations retrieve accounts, customers, subscriptions, and invoices and verify webhooks. Confirm that `read_only` supports the intended pilot and reduce the scope if it does.
- Several caught API errors return raw internal exception messages to the browser. Replace unexpected details with stable public messages while preserving redacted diagnostics in Sentry.
- Define application security headers, including an appropriate Content Security Policy, rather than relying on undocumented platform defaults.
- Add real Terms of Service and Privacy Policy links before external account creation.
- Add current release/setup documentation; the root README still largely reflects the starter application and omits newer gates and migrations.
- Add a dependency-audit check to release verification after the current findings are remediated.
- Consider abuse controls for expensive authenticated mutations such as synthetic-case creation and sending-domain operations before wider availability.

## Operational release gates

The following evidence is required before production activation:

1. A clean production dependency audit after a reviewed update.
2. Regression proof for safe Stripe Connect redirects.
3. Fail-closed account and delivery-gate behavior, including missing-variable tests.
4. Explicit, redacted capture of unexpected cron/webhook/delivery failures.
5. Verified alert routing and a controlled non-delivery alert drill.
6. Read-only Vercel environment name/scope inventory with no values exposed.
7. Read-only production migration diff/dry run and a backup/restore decision.
8. A documented rollout, rollback/forward-fix, replay, and emergency-stop runbook.
9. Separate approvals for merge, production migration, and production deployment.
10. D6e post-deploy smoke with every customer-contact gate still disabled.

## Small remediation sequence

### D6c1 — dependency and redirect security patch

- Update the vulnerable production dependency graph using the reviewed Next 16 guidance.
- Reuse the safe internal redirect policy in Stripe Connect and validate callback state before any state-derived redirect.
- Add positive and hostile-path regression tests.
- Run the full suite, lint, production build, clean npm audit, GitHub/Vercel checks, and a focused Preview auth/Stripe-navigation smoke test.

### D6c2 — fail-closed delivery and secret configuration

- Resolve missing/invalid recovery account state to `off`.
- Introduce/document explicit production delivery enablement and both notification gates.
- Require a dedicated Stripe token-encryption key in production.
- Add a redacted preflight command that reports only presence, scope expectations, and safe/unsafe gate state—not values.

### D6c3 — observability and operator recovery

- Capture unexpected caught failures with redacted context.
- Define alert thresholds for cron, webhook, delivery, stale claims, and reconciliation failures.
- Add replay, stop, and forward-fix runbooks and prove one safe alert path.

### D6d and D6e — rollout and post-deploy proof

Only after D6c1–D6c3 pass should D6d inventory production configuration and plan separately approved merge, migration, and deployment actions. D6e then performs the zero-customer-contact production smoke before any pilot invitation.

## Acceptance state

D6c review is complete as an audit, but the release is not accepted for production. The branch remains safe to demonstrate on the exact development Preview under the D6b boundary. No user-facing Preview check is required for this documentation-only review.

The next logical step is **D6c1: apply the reviewed dependency updates and close the Stripe Connect redirect edge case in one focused security patch, then rerun every local and remote release check before any merge is considered**.
