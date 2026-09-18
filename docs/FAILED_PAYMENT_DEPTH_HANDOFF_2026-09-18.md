# RevRecovery Failed-Payment Depth Handoff

Date preserved: 18 September 2026

## Purpose

This document preserves the approved product direction and exact restart point from the September 18 planning conversation. It is a planning record only. No implementation, migration, merge, deployment, Stripe change, Resend change, or production change is approved by this document.

## Repository state when this handoff was created

- Production branch: `main`
- Production code commit: `b0bc30e16c1c9613599c2b2307c2205600c00d47`
- Production commit message: `Complete Phase 3 segmentation analytics`
- Preserved voluntary-churn branch: `codex/phase4-paused-foundation`
- Preserved voluntary-churn commit: `7ed3e0dae1bb563815abc02a72c22b9ef15e2763`
- Voluntary-churn work must remain paused, unmerged, and unmigrated.
- This planning document is being preserved separately from both product lines.

## Approved strategic direction

RevRecovery will focus narrowly on involuntary churn caused by failed Stripe subscription payments.

The product definition is:

> RevRecovery is a Stripe failed-payment recovery workspace for lean SaaS teams. It tracks failed subscription renewals, coordinates customer communication, guides customers back to payment, highlights cases requiring attention, and provides transparent recovery reporting.

The target customer is a founder-led or operationally lean SaaS company that:

- Uses Stripe Billing.
- Has fewer than roughly 20 employees.
- Has hundreds or thousands of recurring card payments.
- Has meaningful failed-renewal exposure.
- Has no dedicated billing, payments, or recovery team.
- Is not already satisfied with an advanced recovery platform.

The proposed price remains a hypothesis at EUR 79 per month and must be validated with paying customers.

## Product boundary

Every immediate feature must support at least one of these jobs:

1. Diagnose: what failed, why, and how much revenue is at risk?
2. Recover: communicate appropriately and guide the customer back to payment.
3. Prioritise: which cases require human attention?
4. Prove: what recovered, what remains unpaid, and what appears to be helping?

The narrow product loop is:

```text
Failed subscription payment
        -> Explain what happened
        -> Run appropriate customer communication
        -> Highlight cases requiring attention
        -> Confirm the payment outcome through Stripe
        -> Report recovered and outstanding revenue honestly
```

## Responsibilities

Stripe remains responsible for:

- Attempting and processing payments.
- Securely handling card information.
- Performing configured retries.
- Providing authoritative invoice, payment, and subscription state.
- Confirming whether payment succeeded.

RevRecovery is responsible for:

- Turning a failed renewal into an understandable recovery case.
- Validating whether communication is appropriate.
- Coordinating recovery messages around Stripe's actions.
- Directing customers to a secure Stripe resolution route.
- Stopping communication after resolution.
- Showing the complete customer-level recovery history.
- Highlighting cases requiring personal attention.
- Reporting outcomes without claiming causation it cannot prove.

RevRecovery does not currently replace Stripe Smart Retries and must not be positioned as a proprietary payment-retry engine.

## What currently works in Phase 3

The current production product demonstrably includes:

- Stripe Connect onboarding.
- Failed invoice detection.
- Subscription, standalone, and unknown invoice segmentation.
- Durable failed-payment cases.
- Three-message recovery sequences.
- Editable recovery messages and schedules.
- Off, Test, Live, and Paused operating modes.
- Resend delivery with verified sending-domain support.
- Delivery, open, click, bounce, complaint, and suppression handling.
- Stripe Hosted Invoice Page links.
- Live invoice checks before sending.
- Automatic stopping after Stripe confirms payment.
- Currency-safe recovery reporting.
- Date-range and segment analytics.
- Directional, non-causal message attribution.

## Key missing product depth

The approved next product depth consists of:

1. Plain-English decline classification.
2. A unified recovery-event history.
3. A customer-level recovery timeline.
4. A needs-attention queue with deterministic flags.
5. A historical failed-payment opportunity report.
6. Guided Test mode and activation-readiness checks.
7. Stripe retry and email-overlap visibility.
8. Failure-specific communication.
9. Recovery health and essential alerts.
10. More trustworthy baseline and attribution reporting.

## Initial self-service boundary

For the first paid pilots, self-service means a founder can:

- Create an account.
- Connect Stripe.
- Understand the failed-payment opportunity.
- Configure a sending identity.
- Review and test the recovery sequence.
- Activate safely.
- Monitor active cases.
- Understand an individual customer's timeline.
- See what needs attention.
- See recovered and outstanding revenue.
- Make safe configuration changes.

The following may remain manually supported during early pilots:

- Initial opportunity qualification.
- Reviewing the first Stripe configuration.
- Checking communication overlap.
- Unusual DNS and sending-domain problems.
- Reviewing the first Live activation.
- Investigating metric discrepancies.
- Advising on high-value thresholds.
- Early billing and exceptional support.

Repeated manual tasks should become automation candidates only after real customers demonstrate the need.

## Explicitly postponed

Do not currently build or deploy:

- Voluntary-cancellation prevention.
- Cancellation surveys or save offers.
- Pause, downgrade, or discount retention flows.
- Post-cancellation win-back.
- General customer-success or CRM functionality.
- Predictive customer-health scoring.
- Annual-plan upsells.
- SMS.
- Multiple billing providers or RevenueCat.
- Proprietary machine-learning retry optimisation.
- Direct payment retry orchestration.
- Backup-card charging or alternative routing.
- Generic AI features.
- Complex enterprise workflow builders.
- A broad visual redesign.

## Approved release sequence

### Step 0: Read-only implementation audit

Before changing code, compare current `main` with the approved product definition. Establish what is complete, partial, backend-only, UI-only, missing, broken, or unverifiable.

The audit must determine:

- Which Stripe decline facts are already captured and persisted.
- Whether payment attempts and customer timelines can be reconstructed from existing data.
- Whether the existing at-risk customer interface can evolve into a Cases workspace.
- Whether historical Stripe data is complete enough for an opportunity report.
- Which work requires additive migrations.
- Which existing screens can be extended safely.
- Which functionality already exists and must not be rebuilt.

Do not run tests or builds during the audit without first explaining that they may create caches or generated files.

### Release A: Understand every case

- Decline classification.
- Unified recovery-event history.
- Cases table.
- Customer-level case timeline.

Primary outcome: the founder can understand what happened and what happens next.

### Release B: Know where to act

- Deterministic attention rules.
- Needs-attention queue.
- High-value prioritisation.
- Safe low-risk manual actions.

Primary outcome: the founder knows where personal intervention matters.

### Release C: Activate safely

- Historical opportunity report, subject to data completeness.
- Setup checklist.
- Guided Test mode.
- Activation-readiness engine.
- Stripe communication-overlap guidance.

Primary outcome: a founder can adopt RevRecovery with less direct support.

### Release D: Improve and prove

- Failure-specific communication.
- Advisory Stripe retry coordination.
- Recovery-window and exhaustion controls.
- Health monitoring and essential notifications.
- Better baseline and attribution reporting.

Primary outcome: the founder can improve recovery and judge whether RevRecovery is worth the proposed price.

## Measurement rules

- Stripe is authoritative for invoice, payment, subscription, amount, currency, and recovery state.
- Resend is authoritative for delivery events.
- Stripe invoice ID is the economic unit.
- One invoice may count once as failed and at most once as recovered.
- Multiple payment-failure events must not duplicate failed revenue.
- Currencies must never be silently combined.
- A payment-method update is not a recovered payment.
- Recovery requires Stripe-confirmed payment.
- A payment after communication may be described as associated with or occurring after communication.
- RevRecovery must not claim that an email caused payment without valid experimental evidence.
- "Incremental revenue" must not be displayed without a defensible baseline or experiment.

## Proposed navigation

- Overview: failed, recovered, outstanding, attention, and recovery health.
- Cases: individual failed-payment journeys and attention states.
- Recovery: messages, schedule, operating mode, testing, and readiness.
- Insights: trends, segments, recovery time, and transparent attribution.
- Settings: Stripe, sending identity/domain, notifications, account, and billing.

Do not place every new feature on the Overview page as another card. The existing Optimize page should eventually be absorbed into Overview or Insights unless its recommendations become specific, evidence-based, and actionable.

## UI approach

Do not redesign the product before the workflows are settled. Extend it using reusable patterns:

- Page header.
- Recovery-health banner.
- Summary metrics.
- Setup checklist.
- Filter bar.
- Cases table.
- Timeline.
- Attention panel.
- Empty state.
- Warning state.
- Readiness state.

The product is desktop-first. Mobile support should remain usable but is not the primary design target.

## Engineering and release safety

- Preserve `main` as the production baseline.
- Preserve `codex/phase4-paused-foundation` unchanged.
- Implement focused failed-payment work on a separate branch.
- Use additive migrations.
- Test migrations locally before proposing remote application.
- Stop for explicit approval before remote migrations, external configuration changes, secrets, merges, or deployments.
- Do not send real customer emails during development.
- Do not alter Stripe retry or email settings automatically.
- Commit and push every completed, verified implementation unit.
- Review the GitHub comparison before merge.
- Run focused tests, the relevant full regression suite, lint, TypeScript verification, and a production build before declaring a unit complete.
- Test duplicate events, out-of-order events, tenant isolation, live/test separation, and currency handling.

## Validation gates

Before building advanced capabilities, require customer evidence:

- Smart retry coordination: repeated demand that Stripe retry visibility/timing is a major problem.
- Product-usage personalisation: evidence that usage materially changes recovery decisions.
- High-value manual alerts: repeated evidence that founders personally intervene.
- A/B testing: enough failure volume for meaningful experiments.
- Pre-dunning: meaningful leakage caused by predictable pre-failure conditions.
- SMS: evidence that email is insufficient and customers accept the compliance burden.
- Additional billing providers: otherwise-qualified paying prospects blocked specifically by Stripe-only support.
- Voluntary churn: failed-payment recovery first achieves product-market evidence or proves insufficient.

## Success criteria for the first five customers

- Five customers can reconcile the principal numbers with Stripe.
- At least three activate Live recovery.
- Founders use the timeline to understand real failures.
- Founders act on the attention queue.
- Setup no longer requires repeated undocumented intervention.
- No customer receives harmful duplicate communication.
- At least two customers willingly pay approximately EUR 79.
- Customers identify value beyond automated emails.
- Repeated evidence identifies the next justified depth feature.

## Exact restart point for the next session

Start with Step 0 only:

> Perform a complete read-only gap audit of the current `main` branch against this handoff. Do not change code, create migrations, merge, deploy, or alter external services. Classify each approved requirement as complete, partial, backend-only, UI-only, missing, broken, or unverifiable; cite the exact files, migrations, functions, and tests; identify technical risks; and recommend the smallest safe first implementation unit. Wait for approval before implementation.

The likely first implementation unit, subject to audit confirmation, is:

> Decline normalisation and the recovery-event model required by customer timelines and deterministic attention flags.

## Related preservation records

- Recovered September 17 conversation: `/Users/grainnedignam/Desktop/RevRecovery-Recovered-2026-09-17.md`
- Protected Codex backup: `/Users/grainnedignam/Desktop/Codex-Recovery-Backup-2026-09-18`
- Phase 3 production commit: `b0bc30e16c1c9613599c2b2307c2205600c00d47`
- Paused Phase 4 preservation commit: `7ed3e0dae1bb563815abc02a72c22b9ef15e2763`

