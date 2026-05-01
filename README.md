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
RECOVERY_EMAIL_FROM="RecoverFlow <recoveries@yourdomain.com>"
RECOVERY_EMAIL_CRON_SECRET=your_recovery_processing_secret
CRON_SECRET=the_same_secret_for_vercel_cron
```

Use the publishable key in browser-safe contexts and the secret key only in server-only code. The project includes a starter SQL file at `supabase/sql/001_init_user_settings.sql` for the `user_settings` table used by the Settings page.

For Stripe Connect, also run `supabase/sql/002_init_stripe_connections.sql` so connected account tokens and sync summaries can be stored server-side.
For webhook-backed recovery tracking, also run `supabase/sql/003_init_recovery_webhook_tables.sql`.
To persist recovery flow records and queued recovery emails, also run `supabase/sql/004_init_recovery_sequences.sql`.
For delivery status and retry tracking, also run `supabase/sql/005_add_recovery_message_delivery_fields.sql`.
For onboarding completion state and route gating, also run `supabase/sql/006_init_user_profiles.sql`.

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
