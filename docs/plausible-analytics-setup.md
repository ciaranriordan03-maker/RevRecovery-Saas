# Plausible analytics setup

The application analytics layer stays disabled until `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set during a production build.

## Plausible account

1. Create or sign in to a Plausible account.
2. Add `revrecovery.io` as a site, using the `Europe/Dublin` reporting timezone.
3. Add these custom-event goals with the names shown exactly:
   - `Navigation Click`
   - `Checkout Started`
   - `Checkout Completed`
   - `Booking Click`
   - `Sign In Click`
   - `Account Creation Started`
   - `Calculator Used`
   - `Outbound Link: Click`
4. Create a funnel in this order:
   - Pageview: `/`
   - Custom event: `Checkout Started`
   - Custom event: `Checkout Completed`
   - Custom event: `Booking Click` or `Account Creation Started`

`Checkout Completed` is sent only when the server verifies a paid Stripe session for the configured founding-member payment link. It is not a raw pageview goal because invalid visits to `/purchase/success` must not count as purchases.

## Vercel

Add this public configuration to the Production environment only:

```text
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=revrecovery.io
```

Redeploy after adding it. No Plausible API key belongs in a `NEXT_PUBLIC_` variable.

## Data boundaries

Tracked properties are restricted to fixed categories such as CTA location, navigation destination, plan, and billing period. The tracker removes query strings and URL fragments from page and outbound-link URLs before transmission. It does not send email addresses, Stripe session IDs, Supabase identifiers, customer records, calculator financial inputs, or payment details.

The standard Plausible tracker is configured without cookies or persistent visitor storage. Privacy-notice wording should still be reviewed for RevRecovery's actual jurisdictions and business requirements before publication.
