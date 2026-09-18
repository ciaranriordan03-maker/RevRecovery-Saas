This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Supabase setup

Copy `.env.example` to `.env.local` and add:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SECRET_KEY=your_secret_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_SECRET_KEY=your_platform_stripe_secret_key
STRIPE_CONNECT_CLIENT_ID=your_stripe_connect_client_id
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_signing_secret
RESEND_API_KEY=your_resend_api_key
RECOVERY_EMAIL_FROM="RevRecovery <recoveries@revrecovery.io>"
RECOVERY_EMAIL_CRON_SECRET=your_recovery_processing_secret
CRON_SECRET=the_same_secret_for_vercel_cron
RETENTION_LINK_SECRET=a_separate_random_secret_for_time_limited_customer_retention_links
```

Use the publishable key in browser-safe contexts and the secret key only in server-only code. The project includes a starter SQL file at `supabase/sql/001_init_user_settings.sql` for the `user_settings` table used by the Settings page.

For Stripe Connect, also run `supabase/sql/002_init_stripe_connections.sql` so connected account tokens and sync summaries can be stored server-side.
For webhook-backed recovery tracking, also run `supabase/sql/003_init_recovery_webhook_tables.sql`.
To persist recovery flow records and queued recovery emails, also run `supabase/sql/004_init_recovery_sequences.sql`.
For delivery status and retry tracking, also run `supabase/sql/005_add_recovery_message_delivery_fields.sql`.
For onboarding completion state and route gating, also run `supabase/sql/006_init_user_profiles.sql`.
For connected Stripe customer/subscription state tracking, also run `supabase/sql/007_init_stripe_customer_states.sql`.
For Phase 3 audience assignment and segment-aware analytics, apply the migrations through `supabase/migrations/20260910000100_phase3_recovery_segmentation.sql` (preferred) or run `supabase/sql/011_phase3_recovery_segmentation.sql` in the Supabase SQL editor before deploying the matching application code.
For Phase 4 observation-only voluntary-churn tracking, apply `supabase/migrations/20260911000100_phase4_retention_observation.sql` and `supabase/migrations/20260911000200_phase4_reason_and_action_foundation.sql` before deploying matching Phase 4 code. The foundations record scheduled cancellations, terminal cancellations, reversals, duplicate and stale events, structured cancellation reasons, merchant action availability, and distinct action lifecycle events. They do not send retention emails, modify Stripe subscriptions, apply discounts, or contact customers.

## Phase 3 analytics

New failed-payment cases are classified as recurring subscription, standalone invoice, or unknown invoice type. Merchants can optionally assign a different recovery schedule to each audience under Recovery settings. The selected audience and policy are snapshotted when a sequence starts, so later settings changes do not rewrite active cases.

Insights supports 30-day, 90-day, and all-time cohorts plus audience filtering. Every filter is applied from the failed-payment cohort through related sequences, messages, and engagement events. Audience comparisons include case and recovery counts, recovered revenue by currency, average recovery time, messages sent, delivery rate, and open/click rates.

## Phase 4 retention observation

Subscription update and deletion webhooks are classified separately from failed-payment recovery. Payment-failure and dispute cancellations are excluded from voluntary-churn observation. A cancellation episode is stored as one retention case with append-only lifecycle events. Replayed Stripe events are idempotent, and older events are retained as stale observations without rolling the current case backward.

An observed reversal is marked `closed_without_intervention` until a future, separately approved delivery phase records a real intervention. The schema supports a future `saved` status, but this milestone does not claim that RevRecovery caused a subscription save.

Cancellation reasons use a fixed, validated taxonomy. Deterministic recommendations can include support, pause, or an eligible downgrade only when that action is configured and available. `continue_canceling` is always included. Presented, accepted, execution-requested, failed, and verified outcomes remain separate so an interaction is never reported as a confirmed save.

The Connect webhook endpoint in this app is:

```text
/api/stripe/webhooks/connect
```

To process scheduled recovery emails, call:

```text
/api/recovery/process
```

Use a `POST` request with `Authorization: Bearer <RECOVERY_EMAIL_CRON_SECRET>` in production, or call it locally in development when you want to flush due messages.
Vercel Cron calls this route with `GET` based on `vercel.json`; set `CRON_SECRET` in Vercel to the same value so scheduled calls are authorized.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
