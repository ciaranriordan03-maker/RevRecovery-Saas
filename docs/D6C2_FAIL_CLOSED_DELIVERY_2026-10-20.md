# D6c2 Fail-Closed Delivery and Secret Configuration

**Completed locally:** 20 October 2026

**Branch:** `codex/release-c-activation-readiness`

**Starting head:** `f6ddb33` (`Harden dependencies and Stripe redirects`)

**Decision:** Local safeguards accepted; remote configuration inventory and GitHub/Vercel evidence remain required

## Boundary

D6c2 closes the recovery-delivery and secret-configuration findings from the D6c release review. It changes application defaults and adds redacted evidence only.

This work did not inspect or change a Vercel value, Supabase row or migration, Stripe or Resend account, recovery mode, recipient, provider state, merge state, or production deployment. It did not send an email or contact a customer.

## Fail-closed recovery delivery

Recovery provider delivery now requires both independent environment decisions:

- `RECOVERY_DELIVERY_ENABLED` must be exactly `true`.
- `RECOVERY_DELIVERY_KILL_SWITCH` must be exactly `false`.

Missing, blank, malformed, uppercase, or otherwise unexpected values block delivery. The worker evaluates these gates before it claims a queued recovery message, so a blocked run does not consume delivery work.

The documented safe release-candidate state is the inverse:

- `RECOVERY_DELIVERY_ENABLED=false`
- `RECOVERY_DELIVERY_KILL_SWITCH=true`

Persisted account configuration remains an independent gate. If the admin client is unavailable, the settings table is absent, or no account-settings row exists, runtime mode now resolves to `off` rather than the previous legacy `live` fallback. The Settings interface describes this as a fail-closed configuration state.

The recovery cron boundary also rejects every request when both cron credentials are absent, including development. Local use therefore requires an explicit credential just like Preview and Production.

## Notification delivery gates

The existing essential-notification boundaries remain separately gated and disabled by default:

- `ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED=false`
- `ESSENTIAL_NOTIFICATION_AUTHORIZED_TEST_DELIVERY_ENABLED=false`

All notification server paths now use the same exact boolean parser. Missing or malformed values cannot be interpreted as enablement. D6c2 did not add a route, UI action, cron caller, recipient, authorization, reservation, or provider call.

## Dedicated Stripe token key

Stripe token encryption now reads only `STRIPE_TOKEN_ENCRYPTION_KEY`. It no longer falls back to `SUPABASE_SECRET_KEY` in any environment. Missing dedicated key material throws before a token can be stored.

The preflight separately rejects a configuration where the dedicated token key is equal to the Supabase secret, while never printing either value.

## Redacted preflight

Run:

```text
npm run preflight:delivery
```

The command uses the installed Next.js environment loader and reports only:

- variable name;
- public, private, configuration, or separation category;
- `configured`, `missing`, or `invalid` status;
- delivery-gate states such as `enabled`, `disabled`, `missing`, or `invalid`.

It never includes values, lengths, prefixes, hashes, recipients, provider identifiers, or connection details. It exits unsuccessfully if required configuration is absent or if every contact gate is not explicitly in the documented safe state.

The first local run correctly returned a failed preflight without revealing values. It identified missing `RESEND_WEBHOOK_SECRET` and `CRON_SECRET`, plus delivery flags that are absent rather than explicitly set. Application delivery remains blocked because missing flags fail closed. These local findings were not auto-corrected and no remote environment was changed.

## Verification

- Focused fail-closed, cron, token-vault, notification, and preflight tests: **passed**.
- Full regression suite: **95 files / 445 tests passed**.
- ESLint: **passed**.
- Next.js 16.4.2 Webpack production build: **passed; all 33 routes generated**.
- Redacted preflight behavior: **passed under controlled safe and unsafe fixtures**.
- Local release-candidate preflight: **correctly withheld** because explicit safe configuration is incomplete.
- `git diff --check`: **passed**.

The required default Turbopack build was attempted twice, including outside the normal sandbox. The managed host still prevented its loader from binding an internal port (`EPERM`). The production Webpack build fully compiled, type-checked, generated all routes, and completed successfully. GitHub and Vercel must provide the fresh unsandboxed build evidence.

## Acceptance condition

D6c2 is locally complete. Acceptance requires the exact commit to pass GitHub CI and Vercel Preview. The later D6d environment inventory must verify variable names and scopes without exposing values and must preserve the explicit disabled gate state. This record does not authorize changing a remote environment, enabling delivery, merging, or deploying to production.

The next roadmap slice after remote D6c2 acceptance is **D6c3: capture unexpected caught failures with redacted operational context, define actionable alert thresholds, and prove one safe non-delivery alert path before rollout planning**.
