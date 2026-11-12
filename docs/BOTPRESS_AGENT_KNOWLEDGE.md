# RevRecovery public sales knowledge

This document is the approved factual source for RevRecovery's public AI sales
assistant. When the answer is not established here or on the public RevRecovery
website, the assistant should say that a person will confirm it.

## Product overview

RevRecovery is failed-payment recovery software for subscription businesses
using Stripe. It brings failed subscription payments into a focused recovery
workspace, supports carefully timed customer reminders, and shows which cases
recovered or need attention.

RevRecovery is intended to reduce manual follow-up while keeping the business
in control of setup and activation.

## How setup works

A business creates a RevRecovery account and connects Stripe during onboarding.
New accounts can begin with a Stripe test-mode setup. Connecting Stripe or
completing onboarding does not by itself mean that live customer messages are
being sent.

Before enabling live recovery, the business can review its sender details,
message content, sequence timing, customer audience, and controlled test
results. The business chooses when to enable live recovery and can pause
recovery while preserving its setup.

## Recovery cases and messages

Stripe payment activity is used to create and update recovery cases. A recovery
case gives the business a focused view of a failed-payment opportunity and its
status.

Recovery messages are configurable. The business can review and edit message
content, sender details, timing, and tone. A customer-facing sending identity
and sending domain must be configured and verified before live delivery is
enabled.

When a payment succeeds, the recovery case is updated so the business can see
that it recovered and avoid continuing an unnecessary recovery sequence.

Individual cases can be reviewed and paused when they need manual attention.

## Reporting and insights

RevRecovery shows failed-payment cases, recovered payments, open cases, and
cases that need review. Insights help the business evaluate recovery activity
and refine its process using observed performance rather than a guaranteed
outcome.

RevRecovery does not guarantee a particular recovery rate, revenue amount, or
financial result. Estimates shown by the public recovery calculator are
illustrative and depend on the assumptions entered by the visitor.

## Pricing and access

The public founding-member offer is currently €79 per month. Secure subscription
checkout is handled by Stripe. The public website is the authoritative source
for the current offer and should be checked if a visitor asks whether pricing
has changed.

## Frequently asked questions

### Does RevRecovery work with Stripe?

Yes. A business connects its Stripe account during onboarding. RevRecovery uses
the payment activity associated with that connection to create and update
recovery cases.

### Will RevRecovery email customers immediately after signup?

No. New accounts can connect in test mode and review the process. Live customer
delivery begins only after the required setup is complete and the business
chooses to enable it.

### Can messages be customised?

Yes. Message content, sender details, timing, and tone can be reviewed and
edited so the recovery sequence fits the business.

### Can recovery be paused?

Yes. Recovery can be paused while preserving the setup. Individual cases can
also be reviewed when they need manual attention.

### Does RevRecovery guarantee recovered revenue?

No. RevRecovery provides tools and visibility for failed-payment recovery, but
actual results depend on the business, its customers, failure reasons, timing,
configuration, and other circumstances.

### Can the assistant access my Stripe account or customer data?

No. The public AI sales assistant is for general product questions and lead
qualification. It does not have access to Stripe accounts, RevRecovery customer
accounts, Supabase, passwords, payment details, or private customer data.

### Can I see the product or speak with someone?

The assistant should offer the currently configured product demonstration,
live-conversation option, or scheduling link. If one of those options has not
yet been configured, it should offer to collect contact details with permission
so a person can follow up.

## Lead qualification

The assistant may ask, one question at a time:

1. Does the business use Stripe for recurring subscription payments?
2. Is failed-payment follow-up currently manual, automated, or not handled?
3. Roughly how many failed subscription payments occur in a typical month?
4. Would the visitor prefer a product demonstration or a conversation?

The assistant must ask permission before requesting or retaining a name, email
address, company name, or other contact details.

## Safety and escalation

The assistant must not request or accept:

- passwords or login codes;
- Stripe secret keys, webhook secrets, or account credentials;
- card or bank details;
- customer lists, invoices, or payment records;
- sensitive personal or financial information.

The assistant must not provide legal, tax, financial, card-decline, or payment
network advice. It must not invent integrations, capabilities, pricing,
security certifications, recovery rates, or release dates. Questions outside
the approved sources should be handed to a person for confirmation.
