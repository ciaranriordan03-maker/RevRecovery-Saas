# D6a Whole-Product Release-Readiness Audit

**Audited:** 20 October 2026  
**Branch:** `codex/release-c-activation-readiness`  
**Branch head audited:** `9c987eb` (`Record D5 Insights acceptance`)  
**Pull request:** `#1`  
**Decision:** Core roadmap complete; release-candidate verification still required

## Audit boundary

This is a read-only release audit of the approved failed-payment roadmap. It does not approve a merge, a production migration, a deployment, Live recovery, general notification delivery, or any customer email.

The audit asks two different questions:

1. Has the approved product-depth roadmap been built?
2. Is this large branch ready to be merged and used for a controlled pilot?

Those questions must not be collapsed into one percentage. The feature roadmap is complete, while the final release process is not.

## Executive decision

All ten approved depth items across Releases A–D are represented in working code, regression tests, and accepted product evidence. RevRecovery now supports the intended four-job loop: Diagnose, Recover, Prioritise, and Prove.

No missing core feature blocks a product demo. The remaining work is release work: freeze one release candidate, run a fresh end-to-end Preview smoke test, review the unusually large pull request, verify production-only configuration and operational controls, then merge and deploy through separately approved steps.

The branch is therefore suitable to become a release candidate, but this audit does not declare it production-ready and does not authorize a merge or deployment.

## Completion assessment

These percentages use different denominators and are intentionally separated:

| Boundary | Current estimate | What remains |
| --- | ---: | --- |
| Approved feature-depth roadmap | **100%** | All 10 approved depth items are implemented for the defined scope. |
| Dependable demo readiness | **92%** | Freeze and smoke-test one exact Preview release candidate; prepare a stable demo fixture and run-through. |
| Controlled first-pilot readiness | **84%** | Complete release/security review, verify production configuration and migrations, confirm monitoring/webhook/cron health, provide real legal links, merge, deploy, and run a production smoke test. |

In plain language: the product build discussed in the roadmap is complete. Roughly **8% remains before a dependable demo** and roughly **16% remains before a carefully controlled first pilot**. These are release and operational tasks, not another broad feature phase.

## Four-job product audit

| Product job | Status | Evidence |
| --- | --- | --- |
| Diagnose | Complete for roadmap scope | Decline normalization and explanations in `app/lib/recovery/decline-diagnostics.ts`; durable case/event loading in `app/lib/server/recovery-cases.ts` and `app/lib/server/recovery-case-events.ts`; case-detail diagnostics and timeline UI in `app/components/dashboard/case-detail-content.tsx`; dedicated diagnostics, event, and timeline tests. |
| Recover | Complete for roadmap scope | Recovery settings and schedule policy, failure-specific communication preview, Stripe retry/email coordination, controlled synthetic testing, pause/resume, live stop checks, and delivery safeguards; covered by recovery policy, delivery, test-mode, overlap, and communication tests. |
| Prioritise | Complete for roadmap scope | Deterministic attention rules in `app/lib/recovery/attention-rules.ts`; needs-attention and value filters in the Cases workspace; case facts and chronological evidence; covered by attention-rule, queue, and integration tests. |
| Prove | Complete for descriptive scope | Environment-isolated Insights in `app/lib/server/insights-metrics.ts`; readiness gates, withheld baselines/comparisons, non-causal wording, measurement evidence, versioned fingerprints, sanitized manifests, and browser-local verification; accepted in `docs/D5_INSIGHTS_MEASUREMENT_ACCEPTANCE_2026-10-20.md`. |

## Approved depth-item audit

| Approved item | Status | Release evidence |
| --- | --- | --- |
| 1. Plain-English decline classification | Complete | Release A diagnostics and case-detail tests. |
| 2. Unified recovery-event history | Complete | Immutable event ledger, projection, and event-history tests. |
| 3. Customer-level recovery timeline | Complete | Case-detail timeline and timeline-view tests. |
| 4. Needs-attention queue | Complete | Deterministic flags, queue/filter UI, and integration tests. |
| 5. Historical failed-payment opportunity report | Complete for available evidence | Read-only report with explicit completeness limits and tests. |
| 6. Guided Test mode and activation readiness | Complete | Eligibility engine, server-side revalidation, synthetic sandbox case, checklist, and tests. |
| 7. Stripe retry/email-overlap visibility | Complete | Read-only timing evaluator and tests; no automatic Stripe or schedule mutation. |
| 8. Failure-specific communication | Complete for advisory scope | Case guidance and first-email treatment preview with no automatic template mutation. |
| 9. Recovery health and essential alerts | Complete for controlled-test scope | D4 policy, audit, single-use delivery, reconciliation, quarantine, checkpoint integrity, and accepted evidence in `docs/D4_ESSENTIAL_NOTIFICATIONS_ACCEPTANCE_2026-10-15.md`. General delivery remains disabled. |
| 10. Trustworthy baseline and attribution reporting | Complete for descriptive scope | D5 environment isolation, gates, withheld outputs, non-causal language, traceability, export, verification, and final acceptance. |

## Verification evidence

- The branch contains 60 commits beyond `main` and changes 132 files (`+11,716`, `-127`). This breadth is evidence of completed scope and also the main review risk.
- The application regression suite passes with 422 tests.
- ESLint passes.
- The production build passes in GitHub CI. A local webpack production build also passes; the sandbox-only Turbopack build cannot open its internal port and fails with `EPERM` rather than an application compilation error.
- GitHub's `Test, lint, and build` check passed for branch head `9c987eb`.
- Pull request `#1` is open, non-draft, clean, and mergeable with no base-branch conflict.
- Every local Supabase migration is present on the linked RevRecovery Development database through `20261015000600_notification_quarantine_evidence_checkpoint.sql`.
- D4 and D5 each have a final acceptance record with positive and negative-path evidence.

## Deployment parity

The latest branch Preview serving application code is Vercel commit `22a42d1` and is Ready. Branch head `9c987eb` contains only later test and documentation acceptance changes, so there is no known runtime-code difference between the deployed Preview and the audited branch head.

However, the strict release rule in `docs/PREVIEW_DEPLOYMENT_SAFETY.md` requires the final release candidate and the Preview source to match exactly. A fresh release-candidate deployment and complete smoke test therefore remain required before merge.

## Security and write-boundary spot-check

The audit found no obvious unauthenticated launch-blocking mutation in the reviewed boundaries:

- Dashboard mutation routes obtain authenticated user claims and validate request inputs.
- Synthetic test-case creation revalidates eligibility on the server and requires the sandbox/Test-mode boundary.
- Stripe Connect binds OAuth state to an authenticated user and an HTTP-only state cookie. The later D6c review identified and documents a return-path validation edge case that must be fixed before merge.
- Stripe and Resend webhooks verify provider signatures before processing.
- The recovery processor requires its cron secret and uses a bounded processing limit.
- Password updates require matching passwords, minimum length, a valid recovery session, and same-origin requests when an Origin header is present.
- Essential notification delivery has separate global, account, recipient, authorization, reservation, no-retry, reconciliation, and quarantine controls.
- D4 acceptance confirms that general notification delivery remains unauthorized and disabled.

This was a targeted release audit, not a formal penetration test or external security certification.

## Genuine remaining work

### Required before a dependable demo

1. **D6b — freeze and smoke-test one exact release candidate.** Produce a fresh Preview from the release-candidate commit and test sign-in/password recovery, onboarding, dashboard, Cases, Recovery, Insights, Settings, controlled synthetic-case creation, and logout without contacting real customers.
2. **Prepare one stable demo fixture and script.** Use deterministic Test evidence, document the expected path, and rehearse the four-job story: Diagnose, Recover, Prioritise, Prove.

### Required before merge and a controlled first pilot

3. **D6c — final security and operational release review.** Review the 132-file diff, tenant isolation, secrets, write routes, migrations, rollback path, Sentry configuration, Stripe webhook health, recovery cron health, and all delivery gates.
4. **Replace non-functional legal text with real Terms and Privacy links.** The login and signup pages currently display underlined legal text without navigable destinations. This is not a core demo blocker, but it should be corrected before external account creation or a paid pilot.
5. **D6d — production rollout plan.** Verify production environment variables without exposing values, plan additive migration application, preserve disabled delivery gates, define rollback/stop conditions, and obtain separate approvals for merge, migration, and deployment.
6. **D6e — post-deploy production smoke.** Confirm authentication, dashboard reads, Stripe/Resend webhook health, cron execution, monitoring, tenant isolation, and zero unintended delivery before inviting a pilot user.

### Intentionally later or manually supported

- Automated SaaS subscription billing is not implemented. The approved handoff explicitly permits early billing to remain manually supported.
- General essential-notification delivery remains disabled; only the separately authorized controlled-test path has been proven.
- Live recovery activation for a customer requires its own reviewed readiness decision.
- Causal lift and incremental-revenue claims remain prohibited without a separately designed experiment.
- Voluntary churn, SMS, other billing providers, proprietary retry optimization, and broad CRM functionality remain postponed.

## Release recommendation

Do not add another broad feature slice before release. Treat the current branch as feature-complete for the approved roadmap and move through D6b–D6e in small, evidence-backed steps.

The immediate next step is **D6b: freeze one release-candidate commit, obtain a matching fresh Vercel Preview, and run the complete no-customer-contact smoke test**. Passing D6b would move demo readiness from approximately 92% to approximately 97%; the remaining demo work would then be the stable fixture and rehearsed presentation path.
