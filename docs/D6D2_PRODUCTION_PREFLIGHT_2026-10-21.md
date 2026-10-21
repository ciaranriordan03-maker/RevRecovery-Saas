# D6d2 Authoritative Production Preflight Evidence

**Reviewed:** 21 October 2026

**Branch metadata:** `codex/release-c-activation-readiness`

**Application evidence base:** `5cdfd6c` (`Record production Sentry routing`)

**Vercel project:** `rev-recovery-saas`

**Probe deployment ID:** `HdSEXr9wZHv7VLhok3zA7B5BFvF5`

**Decision:** Pass; Production configuration is present and every delivery path is explicitly disabled

## Boundary

The user separately approved one authoritative Production-context preflight. The probe was intentionally limited to configuration inspection. It did not run the RevRecovery application, apply a migration, merge or push a branch, assign a domain, enable delivery, send an email or notification, or contact Stripe, Resend, Supabase, or a customer.

No environment-variable value was printed, persisted in the repository, or copied into this evidence. The output contained only variable names, configured/missing/invalid states, safe gate states, and execution-context metadata.

## Method

Vercel's local environment command cannot expose Secret-type Production values. A local isolated run therefore proved the four Config-backed gates but was not accepted as complete secret evidence.

The complete check used a three-file, self-contained Vercel build probe with these independent safeguards:

1. the target was the real `rev-recovery-saas` Production environment;
2. the probe required both `VERCEL=1` and `VERCEL_ENV=production`;
3. the inspection code never emitted values;
4. `--skip-domain` prevented automatic alias or custom-domain promotion; and
5. the build always exited deliberately after printing the redacted result, including when every check passed.

Vercel ran the probe in its Production build context, where the real Secret values were available to the process without being exported locally.

## Result

The cloud-build output reported:

- `PASS Execution context: Vercel Production build`;
- all 13 required configuration variables as `configured`;
- `PASS STRIPE_TOKEN_ENCRYPTION_KEY_SEPARATION`;
- `PASS Customer recovery delivery` with delivery disabled and the kill switch armed;
- `PASS Essential notification delivery` with delivery disabled;
- `PASS Authorized test notification delivery` with delivery disabled; and
- `RESULT PASS: Production configuration is present and every delivery path is explicitly disabled.`

The inspected requirements were:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- `SUPABASE_SECRET_KEY`;
- `NEXT_PUBLIC_APP_URL`;
- `STRIPE_SECRET_KEY`;
- `STRIPE_CONNECT_CLIENT_ID`;
- `STRIPE_WEBHOOK_SECRET`;
- `STRIPE_TOKEN_ENCRYPTION_KEY`;
- `RESEND_API_KEY`;
- `RESEND_WEBHOOK_SECRET`;
- `RECOVERY_EMAIL_FROM`;
- `RECOVERY_EMAIL_CRON_SECRET`; and
- `CRON_SECRET`.

## Fail-closed deployment evidence

After the PASS result, the probe exited with code `78` by design. Vercel records deployment `HdSEXr9wZHv7VLhok3zA7B5BFvF5` as:

- `Build Failed`;
- status `Error`;
- environment `Production`;
- a staged Vercel domain only; and
- no custom-domain assignment.

The current Production runtime and aliases were not replaced. The temporary probe source and local project link were removed after the evidence was captured.

## Acceptance state

The authoritative redacted Production preflight passes. Together with the explicit fail-closed Config values, isolated auth callback, reviewed Sentry routing, and verified logical restore evidence, this closes D6d2's Production-prerequisite checklist.

Production migration, merge, runtime deployment, and customer delivery remain withheld.

**Next logical step:** begin D6d3 with a fresh read-only Production migration listing and dry run against Supabase project `keddusmowpdqrxooveiz`. Stop if the pending set differs from the reviewed nine migrations, and request separate exact-target approval before applying anything.
