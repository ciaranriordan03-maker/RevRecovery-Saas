# D5 Insights Measurement — Final Acceptance

**Accepted:** 20 October 2026

**Branch:** `codex/release-c-activation-readiness`

**Environment reviewed:** RevRecovery Development / Vercel Preview

**Outcome:** Accepted as a read-only, defensible descriptive-measurement foundation

## Acceptance boundary

D5 is accepted for the current roadmap stage as an evidence and reporting-safety layer. It makes the existing Insights calculations easier to interpret, withholds unsupported outputs, and makes the selected evidence traceable and portable without adding a causal or incremental-revenue claim.

This acceptance does not certify RevRecovery as an experimentation platform, does not establish that recovery messages caused payment, and does not authorize production changes or any write to customer, Stripe, Resend, or recovery data.

## Accepted scope

The accepted D5a–D5k chain includes:

- A written measurement contract defining authoritative sources, cohort rules, amount semantics, and permitted claim levels.
- Read-only measurement-quality context for cohort definition, maturity, environment, amount basis, and evidence limitations.
- Non-causal association wording and failure-time amount wording across Insights.
- Explicit and mutually exclusive Live, Test, and Unconfirmed evidence views.
- Baseline-readiness gates for sample size, terminal maturity, monetary completeness, and environment certainty.
- A descriptive baseline that exposes no values until every readiness gate passes.
- An adjacent-cohort comparison that exposes no values unless both cohorts independently pass every readiness gate.
- Exact boundaries, scope, evaluation timestamp, gate outcomes, and calculation definitions.
- A deterministic SHA-256 evidence fingerprint and versioned measurement contract.
- A sanitized JSON evidence manifest with no row-level records or source identifiers.
- A browser-local verifier with exact-match, compatible-stale, and mismatch outcomes.

## Environment-isolation evidence

- The environment filter accepts only `live`, `test`, or `unconfirmed`.
- Failed-payment cases are selected by an exact `livemode` boundary before aggregation.
- Messages, sequences, and provider events are then selected only through the already selected case and message identifiers.
- Live, Test, and Unconfirmed records are never combined in one selected metric view.
- A dedicated D5 acceptance regression test supplies all three environments and proves that only the requested Test case and its related evidence reach the measurement chain.
- Test evidence is explicitly labelled and cannot support a live-performance claim.

## Readiness and withholding evidence

A descriptive baseline is eligible only when all of the following product-policy gates pass:

- At least 30 selected cases.
- At least 80% of selected cases have a recorded terminal outcome.
- Every selected case has a non-negative failure-time amount and a valid three-letter currency.
- Every selected case has confirmed membership in the selected Live or Test environment.

If any gate is waiting, the baseline returns `available: false` with an empty value list and the interface displays **Descriptive baseline withheld**.

For bounded periods, the current and immediately preceding cohorts are evaluated independently. If either cohort fails any readiness gate, the comparison returns `available: false` with an empty value list and the interface displays **Cohort comparison withheld**. The all-time view does not invent a preceding cohort.

When the gates do pass, the baseline remains descriptive: selected cases, terminal cases, observed terminal recovery share, and failure-time amount represented. Comparison differences are labelled as observed changes, not lift, attribution, or incremental revenue.

## Wording and monetary evidence

- Email-step outcomes use **Recoveries after latest prior email** and temporal-association language.
- The interface states that Stripe retries, customer action, and other factors may explain a later recovery.
- Monetary values use **Amount due on invoices later recovered** or **Failure-time amount represented**.
- `amount_due` is never presented as confirmed collected, recovered, saved, generated, or incremental revenue.
- Different currencies remain separate.
- The evidence layer explicitly states **Descriptive, not causal**.

## Traceability and export evidence

Each evaluation records:

- The selected environment and invoice audience.
- Exact current and previous cohort boundaries.
- A server-generated evaluation timestamp.
- Every readiness and comparison gate outcome.
- Human-readable calculation definitions.
- Measurement contract version `revrecovery-insights-v1`.
- A deterministic SHA-256 fingerprint covering the selected failed-payment, message, sequence, provider-event, scope, boundary, and gate evidence.

The exported manifest contains only the sanitized scope, boundaries, timestamp, versions, gates, definitions, limitations, and fingerprint. It contains no case, customer, message, sequence, provider-event, or other source identifier.

Manifest verification is browser-local. It accepts only the exact versioned schema and reports:

- **Exact evidence match** when every sanitized field matches the current view.
- **Compatible manifest is stale** when the contract and scope are compatible but the snapshot differs.
- **Manifest does not match this view** or **Manifest could not be verified** for incompatible or malformed evidence.

A stale result is historical evidence and does not by itself prove tampering. Verification does not import records, persist state, change calculations, or write to the database.

## Visual acceptance evidence

The Vercel Preview for commit `22a42d1` was reviewed with the Test, last-30-days, all-audiences scope. The interface correctly showed the selected scope, exact boundaries, readiness outcomes, calculation definitions, evaluation timestamp, contract version, and fingerprint.

The verifier was exercised in all three intended states:

- Green **Exact evidence match** for the current exported manifest.
- Amber **Compatible manifest is stale** for a compatible historical snapshot.
- Red **Manifest does not match this view** for a different scope.

The Preview copy also confirmed that selected files remain browser-local and are not uploaded, stored, imported, or used to change calculations.

## Verification record

- Application tests: `422` passed, including the integrated D5 acceptance regression.
- ESLint: passed.
- Next.js production build: passed with the supported webpack builder.
- GitHub `Test, lint, and build`: passed for the deployed D5k commit `22a42d1`.
- Vercel Preview deployment: passed for commit `22a42d1`.
- Exact-match, stale, and mismatch verifier states: visually confirmed in Preview.

## Known limitations

- The evidence fingerprint is an integrity and comparison token, not a digital signature or independent notarization.
- A stale manifest does not prove tampering.
- The 30-case and 80% thresholds are conservative product policy, not a statistical-significance test.
- The descriptive baseline is not a control group or counterfactual.
- The current monetary basis is failure-time `amount_due`, not Stripe-confirmed `amount_paid`.
- No randomized holdout or reviewed causal design exists, so causation, performance lift, and incremental revenue remain prohibited.
- An all-time view has no adjacent preceding cohort.
- Manifest-verification results are not persisted.

## Acceptance decision

D5 is accepted as complete for the current read-only descriptive-measurement scope. Environment isolation, readiness gates, withheld reporting, non-causal language, versioned fingerprints, sanitized exports, and local verification work as one coherent safety chain.

RevRecovery can now show founders what the selected evidence says, why a baseline or comparison is or is not available, and how to preserve and verify that context without overstating commercial impact. Any future causal or incremental-revenue claim requires a separately designed and validated experiment, not an extension of this acceptance.
