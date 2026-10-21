# D6d2 Production Prerequisite Evidence

**Reviewed:** 21 October 2026

**Branch:** `codex/release-c-activation-readiness`

**Application head:** `4473bf2` (`Record production auth redirect evidence`)

**Decision:** Production remains fail-closed; D6d2 is partially complete and release approval remains withheld

## Boundary

This step was explicitly approved to change Production configuration prerequisites. It did not deploy the application, merge the branch, apply a database migration, enable a delivery path, send an email, contact a provider, export customer data, or change a paid backup plan.

Secret values were neither printed nor written to this repository. Verification output was limited to variable names, scopes, configuration types, safe boolean values, public origins, and sanitized operational metadata.

## Result

| Prerequisite | State | Evidence |
| --- | --- | --- |
| Production app origin separated | Pass | Production `NEXT_PUBLIC_APP_URL` is a Production-only Config value set to `https://revrecovery.io`. |
| Production recovery-delivery gate | Pass | `RECOVERY_DELIVERY_ENABLED=false`. |
| Production recovery kill switch | Pass | `RECOVERY_DELIVERY_KILL_SWITCH=true`. |
| Production essential-notification gate | Pass | `ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED=false`. |
| Production authorized-test gate | Pass | `ESSENTIAL_NOTIFICATION_AUTHORIZED_TEST_DELIVERY_ENABLED=false`. |
| Supabase auth site and redirect allow-list | Pass | Site URL is `https://revrecovery.io`; the sole Production callback is `https://revrecovery.io/auth/confirm`. The legacy localhost callback was removed after Development was verified to retain its local and Preview callbacks. |
| Sentry routing and thresholds | Not ready | Real rules were inspected read-only. A general high-priority issue workflow exists, but the code-owned operational routes and thresholds are not mapped to explicit destinations. The uptime detector also has no action workflow. |
| Restorable backup evidence | Blocked | Production reports no available physical backup and PITR is disabled. No export or paid-plan change was performed. |
| Redacted Production preflight | Partial only | Public URL and all four gates passed. A local CLI run could not retrieve Vercel Secret-type values and could have inherited local values, so it is not accepted as complete Production evidence. |

## Vercel configuration applied

The following Production-only Config entries are now explicit:

- `NEXT_PUBLIC_APP_URL=https://revrecovery.io`
- `RECOVERY_DELIVERY_ENABLED=false`
- `RECOVERY_DELIVERY_KILL_SWITCH=true`
- `ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED=false`
- `ESSENTIAL_NOTIFICATION_AUTHORIZED_TEST_DELIVERY_ENABLED=false`

`NEXT_PUBLIC_APP_URL` previously used Vercel's Secret type. Vercel does not support converting that entry directly to Config, so the exact Production entry was removed and immediately recreated as a Production-only Config value. Existing Production secrets and their scopes were left unchanged.

No Production redeployment was triggered. The running application therefore remains on its previous deployment until a later, separately approved rollout step.

## Supabase auth verification

The intended Production project, **Rev Recovery Saas** (`keddusmowpdqrxooveiz`), and the separate **RevRecovery Development** project (`xkumdvlmmqyybavylibi`) were inspected directly in the authenticated Supabase dashboard.

Development was verified first with:

- Site URL: `https://rev-recovery-saas-git-co-ebaa19-ciaranriordan03-makers-projects.vercel.app`;
- local callback: `http://localhost:3000/auth/confirm`; and
- Preview allow-list entry: `https://rev-recovery-saas-git-co-ebaa19-ciaranriordan03-makers-projects.vercel.app/**`.

After separate explicit approval, the legacy `http://localhost:3000/auth/confirm` entry was removed from Production. The saved Production configuration is now:

- Site URL: `https://revrecovery.io`;
- sole redirect URL: `https://revrecovery.io/auth/confirm`;
- no localhost callback;
- no Preview deployment URL; and
- no wildcard redirect.

Supabase reported `Successfully removed URL(s)` and `Total URLs: 1`. Development was not changed. This closes the Production auth environment-separation finding without affecting local or Preview authentication.

## Sentry routing verification

The Sentry organization and `rev-recovery-saas` project were inspected through read-only API calls.

Observed configuration:

- the default error monitor is enabled;
- the issue stream is enabled and connected to an active workflow;
- the Production uptime monitor for `https://revrecovery.io` is enabled with a 60-second interval, a 10-second timeout, a three-failure downtime threshold, and a one-success recovery threshold;
- a Production workflow sends first-seen high-priority issue notifications to active members or issue owners; and
- the uptime monitor has no attached notification action.

This is useful baseline monitoring, but it does not satisfy D6c3's operational contract. No explicit Sentry workflow currently maps the redacted `alert_code` and `alert_route` tags to the required `engineering` and `operator_and_engineering` destinations or enforces the code-owned 5-, 10-, and 15-minute thresholds.

No Sentry rule or destination was changed. Enabling or changing operator notifications requires separate approval because it can contact people outside the application.

## Backup and restore verification

The Production Supabase backup inventory reported:

- no available physical backup;
- PITR disabled;
- WAL-G available at the platform layer; and
- region `eu-west-1`.

This is not restorable-point evidence. Production database migration remains blocked until one of the reviewed backup controls is explicitly selected, established, and tested. A paid backup/PITR change or a logical export containing customer/authentication data requires its own exact approval and secure destination.

## Preflight interpretation

The redacted preflight passed the public application URL and all four explicit delivery-gate checks. It could not provide authoritative proof for every private Production prerequisite because Vercel's CLI does not pull Secret-type values for this workflow. The command also reported missing `RESEND_WEBHOOK_SECRET` and `CRON_SECRET`, even though Vercel metadata shows those names in Production, demonstrating why this run cannot be treated as deployment-context proof.

A complete preflight must run inside a separately approved Production deployment or another execution context that has the real Production secrets without copying them to disk or output.

## Safety and cleanup evidence

A CLI argument-parsing error created a separate empty helper project named `revrecovery-d6d2-preflight`. It never contained RevRecovery source, data, or secrets and did not touch the real `rev-recovery-saas` project. The helper project and its temporary local script were removed immediately, and a follow-up lookup confirmed that the helper project no longer exists.

## Acceptance state

D6d2 has improved Production safety by making the canonical origin and every delivery gate explicit and by isolating the Production auth callback from localhost and Preview. It is **not complete** because alert routing is incomplete and a restorable backup is unavailable. Production migration, merge, deployment, and customer delivery remain withheld.

Repository verification passed `npm run lint` and `npm run build -- --webpack`. The ordinary Turbopack build was also attempted, but this restricted host denied its temporary internal parser port before source parsing; the webpack production build compiled, type-checked, and generated all application routes successfully.

**Next logical step:** establish and verify a restorable Production backup control under separate approval. Sentry operational routing remains a separate approval before Production rollout.
