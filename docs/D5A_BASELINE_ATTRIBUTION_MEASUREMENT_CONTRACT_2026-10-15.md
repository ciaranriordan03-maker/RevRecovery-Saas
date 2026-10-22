# D5a Baseline and Attribution Measurement Contract

**Defined:** 15 October 2026  
**Scope:** Read-only audit of the current Insights implementation  
**Status:** Contract accepted for implementation planning; no new metric or revenue claim enabled

## Purpose

This contract defines what RevRecovery can measure and say defensibly before adding baseline, attribution, lift, or incremental-revenue reporting. It separates observed system facts from temporal associations and causal claims.

The current Insights page is descriptive reporting. It does not contain a control group, randomized holdout, matched untreated cohort, or other counterfactual capable of proving that RevRecovery caused a recovery.

## Authoritative sources

- **Stripe:** invoice identity, payment state, amount, currency, subscription context, failure state, and recovery state.
- **Resend:** provider acceptance and delivery events.
- **RevRecovery:** sequence configuration, scheduled and sent messages, normalized event history, and the relationship between those records.
- **Economic unit:** one Stripe invoice in one Stripe account and live/test environment.

An invoice may enter the failed cohort once and may be counted as recovered at most once. Repeated Stripe failure events, message attempts, opens, or clicks must not duplicate the invoice or its amount.

## Cohort contract

The current Insights filters create a **failure-origin cohort**:

- The period is selected using the failed-payment record's `created_at` timestamp.
- The audience filter uses the failed-payment `audience_segment`.
- Messages, provider events, and sequences are included only when they belong to an invoice in that selected cohort.
- A recovery may occur after the selected period and still be reported for that cohort.

Until the UI explains this behavior, period labels must not be interpreted as “events that happened during this period.” A future implementation should display the cohort basis and an as-of timestamp.

Test-mode and live-mode records must never be combined in customer-facing reporting. Synthetic cases must be identifiable and excluded from live performance claims.

## Defensible metric definitions

### Observed failed invoices

Count of distinct Stripe invoice economic units in the selected failure-origin cohort. Repeated failure events do not increase the count.

### Observed recovered invoices

Count of cohort invoices whose recovery is confirmed by Stripe. A payment-method update, email interaction, scheduled retry, or provider event is not recovery.

### Observed recovery rate

`Stripe-confirmed recovered invoices / distinct failed invoices in the cohort`

This is an observed outcome rate, not incremental lift. Open and otherwise non-terminal cases remain in the denominator, so the rate may mature after the cohort period ends. The UI should disclose the cohort basis and maturity/as-of date before this metric is used commercially.

### Observed recovered invoice amount

For a Stripe-confirmed recovered invoice, the preferred economic amount is Stripe's confirmed `amount_paid`, preserving the original currency. If only failure-time `amount_due` is available, the value may be shown only as **amount due on invoices later recovered**, not as revenue recovered or collected.

Amounts in different currencies remain separate. They may be displayed side by side, but must not be summed without an explicit exchange-rate source, rate timestamp, and conversion policy.

### Time to recovery

Elapsed time from the first recorded failure for the invoice to Stripe-confirmed recovery. Invalid or negative intervals are excluded and surfaced as a data-quality issue. The current mean can be retained as descriptive; median and cohort maturity should be added before using it as a performance benchmark.

### Sequence recovery rate

`Sequences marked recovered / sequences in the selected invoice cohort`

This is an operational sequence outcome. It must reconcile with Stripe-confirmed invoice recovery before being treated as an economic measure. Exhausted, canceled, active, paused, and incomplete sequences remain visible in the denominator unless a clearly named alternative cohort is introduced.

### Provider delivery rate

`Messages confirmed delivered by Resend / messages with a terminal provider outcome`

Provider acceptance, temporary delay, delivery, bounce, complaint, suppression, cancellation, and failure remain separate operational facts. Delivery is not payment recovery.

### Email engagement

Unique delivered messages with at least one recorded open or click, divided by unique delivered messages. Opens are directional because privacy tooling and automated image loading can affect them. Clicks are stronger engagement evidence, but neither proves recovery causation.

### Recovery after latest prior email

For descriptive sequencing only, a recovered invoice may be associated with the latest sent recovery email whose `sent_at` is not later than `recovered_at`.

The safe labels are **Recoveries after latest prior email** and **Associated recovery rate**. “Attributed,” “caused,” “generated,” and “recovered by email” are not permitted for this rule because Stripe retries, customer action, other communications, and external factors remain possible explanations.

## Claim levels

| Level | Evidence | Permitted language | Status |
| --- | --- | --- | --- |
| Observed fact | Authoritative event or state | failed, recovered, delivered, opened, clicked, amount paid | Supported, subject to source and cohort rules |
| Temporal association | Recovery occurred after a recorded action | associated with, occurred after, latest prior email | Supported with a non-causal disclosure |
| Comparative baseline | Defined comparison cohort with comparable eligibility and maturity | compared with baseline, difference in observed rate | Not implemented |
| Incremental/causal effect | Randomized holdout or a reviewed credible causal design | caused, incremental lift, incremental revenue | Prohibited until validated |

## Current Insights audit

| Current output | Current calculation | Assessment | Required treatment |
| --- | --- | --- | --- |
| Sequence Recovery Rate | recovered sequences / all selected sequences | Descriptive and directionally valid | State cohort and maturity; reconcile sequence status with Stripe recovery |
| Average Recovery Time | mean from failed-payment `created_at` to `recovered_at` | Descriptive | Clarify first-failure semantics; add median and invalid-interval quality checks |
| Recovery by audience rate | recovered failed-payment rows / all selected rows | Descriptive | Label as observed; disclose failure-origin cohort |
| Recovery by audience amount | sum of `amount_due` for recovered rows | Overstates certainty if called recovered revenue | Relabel as amount due on invoices later recovered, or migrate to Stripe-confirmed `amount_paid` |
| Provider Delivery Health | Resend terminal outcomes | Defensible operational metric | Retain separately from payment recovery |
| Email Engagement | unique open/click events among delivered messages | Directional | Retain current caveat; never use as recovery proof |
| Recoveries Attributed by Email Step | latest sent message before recovery | Temporal association only | Replace attribution labels with association language |
| Payments recovered funnel | recovered rows / selected failed-payment rows | Descriptive | Label observed rate and disclose open-case denominator |
| Date filters | failed-payment `created_at` | Technically consistent but not explained | Display “failed during period” cohort wording and as-of date |
| Currency aggregation | separate totals by normalized ISO currency | Defensible | Retain; never silently combine currencies |

## Baseline contract

A baseline must be defined before any comparison is displayed. At minimum it must declare:

- eligible invoice population and exclusions;
- Stripe account and live/test environment;
- cohort entry timestamp and observation window;
- outcome maturity window;
- invoice type, decline category, retry policy, amount band, and currency treatment;
- whether RevRecovery communication was possible and actually sent;
- handling of overlapping Stripe retries and merchant outreach;
- sample size and uncertainty;
- the comparison method and its known limitations.

A historical pre/post comparison can be useful operationally, but changing customer mix, seasonality, Stripe retry behavior, and decline composition mean it is not causal by default. It must be labeled an observed comparison, not incremental recovery.

The preferred future causal design is a stable randomized invoice-level holdout within the same eligible population and time window, with deterministic assignment, no cross-contamination, Stripe-confirmed outcomes, predeclared analysis, and sufficient sample size. Until that design is implemented and validated, incremental revenue remains unavailable.

## Data-quality and suppression rules

Metrics must be withheld or marked incomplete when:

- invoice identity, environment, currency, or authoritative recovery evidence is missing;
- duplicate invoice economic units cannot be reconciled;
- a recovery timestamp precedes cohort entry;
- the selected cohort has not reached its declared maturity window;
- a baseline cohort is empty, materially incomparable, or below the future minimum sample threshold;
- test/synthetic data cannot be separated from live data;
- different currencies would need to be silently combined.

Zero is a measured value only when the denominator is valid. Missing or immature evidence must display as unavailable or awaiting data, not `0%`.

## Prohibited claims before later validation

RevRecovery must not display or imply:

- “incremental revenue,” “revenue generated,” or “revenue saved”;
- “email-caused recovery” or recovery caused by a particular email step;
- lift versus an undefined or incomparable baseline;
- combined multi-currency revenue without an explicit conversion policy;
- live customer performance derived from synthetic or test-mode cases.

## D5a acceptance decision

The existing Insights implementation is suitable as an early descriptive operational view, with strong separation of delivery and recovery and correct preservation of currency totals. It is not yet a defensible baseline or causal-attribution system.

Before adding new revenue claims, the implementation must first tighten amount semantics, replace causal-sounding attribution labels, expose cohort/maturity context, separate test and live evidence explicitly, and add measurement-quality checks. Baseline comparison and incrementality remain later gated capabilities.

