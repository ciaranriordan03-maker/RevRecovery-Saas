# D6d2 Production Prerequisite Evidence

**Reviewed:** 21 October 2026

**Branch:** `codex/release-c-activation-readiness`

**Application evidence base:** `5cdfd6c` (`Record production Sentry routing`)

**Decision:** D6d2 prerequisites pass and Production remains fail-closed; release approval remains withheld pending D6d3 migration review and the later merge/deployment decisions

## Boundary

This work was explicitly approved to change Production configuration prerequisites, create a secure logical backup, configure Sentry's operational routes, and run one fail-closed Production-context preflight. It did not promote or replace the Production application runtime, merge the branch, apply a database migration, enable an application delivery path, send a customer email, contact Stripe or Resend, or change a paid backup plan. One explicitly approved Sentry operator test notification was issued; it was not a RevRecovery delivery. The approved logical export was encrypted before durable storage outside the repository, and no plaintext dump remains.

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
| Sentry routing and thresholds | Pass | Eight Production-only metric detectors implement the code-owned alert filters, 5/10/15-minute thresholds, and logical routes. Two enabled workflows reach the available Sentry member, Production uptime is attached to the operator route, the default Error Monitor retains scoped general coverage, and the legacy broad alert is disabled. See [Sentry Operational Routing Evidence](./D6D2_SENTRY_ROUTING_2026-10-21.md). |
| Restorable backup evidence | Pass (logical) | A password-protected logical backup was created outside the repository, all encrypted checksums passed, and a network-isolated disposable restore drill succeeded. Managed physical backup and PITR remain unavailable. See [D6d2 Production Logical Backup Evidence](./D6D2_PRODUCTION_BACKUP_2026-10-21.md). |
| Redacted Production preflight | Pass | A separately approved Vercel Production build probe passed the execution-context check, all 13 required configuration checks, encryption-key separation, and all three delivery-gate checks. The build then exited deliberately before promotion. See [Authoritative Production Preflight Evidence](./D6D2_PRODUCTION_PREFLIGHT_2026-10-21.md). |

## Vercel configuration applied

The following Production-only Config entries are now explicit:

- `NEXT_PUBLIC_APP_URL=https://revrecovery.io`
- `RECOVERY_DELIVERY_ENABLED=false`
- `RECOVERY_DELIVERY_KILL_SWITCH=true`
- `ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED=false`
- `ESSENTIAL_NOTIFICATION_AUTHORIZED_TEST_DELIVERY_ENABLED=false`

`NEXT_PUBLIC_APP_URL` previously used Vercel's Secret type. Vercel does not support converting that entry directly to Config, so the exact Production entry was removed and immediately recreated as a Production-only Config value. Existing Production secrets and their scopes were left unchanged.

No Production runtime was promoted. A separately approved Production-targeted preflight build was staged with `--skip-domain`, emitted only redacted evidence, and deliberately failed after the PASS result. The running application therefore remains on its previous deployment until a later, separately approved rollout step.

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

Under separate explicit approval, the Sentry organization and `rev-recovery-saas` project were configured and then verified through authenticated read-only API calls.

The saved topology now includes:

- eight enabled Production metric detectors using exact `alert_code`, `alert_route`, and `customer_contact:none` filters;
- first-event 5-minute thresholds for the urgent single-event conditions;
- second-event 10-minute handling for stale claims;
- third-event 15-minute handling for repeated delivery and webhook failures;
- separate `engineering` and `operator_and_engineering` workflows;
- the Production uptime monitor attached to the operator-and-engineering workflow;
- a Production-only general-error workflow attached solely to the default Error Monitor; and
- the former project-wide high-priority workflow disabled to prevent duplicate mail.

Both logical operational routes currently reach the same organization member because no second Sentry member or connector is available. That is sufficient for the current founder-operated release boundary, but it is not responder redundancy.

One explicitly approved Sentry operator test notification was requested. No customer-delivery path, Stripe action, Resend action, or application gate was enabled. Full identifiers, thresholds, limitations, and duplicate controls are recorded in [D6d2 Sentry Operational Routing Evidence](./D6D2_SENTRY_ROUTING_2026-10-21.md).

## Backup and restore verification

The Production Supabase inventory still reports no available physical backup and PITR disabled. Under separate explicit approval, the logical-control alternative was completed:

- four compressed archives covering roles, application schema, Production Auth/Storage schema definitions, and database rows were encrypted with AES-256-CBC and PBKDF2;
- the backup is outside the repository with owner-only directory and file permissions;
- the encryption key is held in macOS Keychain and was not printed or committed;
- all four SHA-256 checksums passed;
- no plaintext or partial dump remains; and
- a network-isolated disposable restore drill passed with 18 public tables, 5 authentication users, and 0 failed-payment rows.

Only aggregate restore counts were emitted, and the disposable restore container was removed. The full scope, restore accommodations, and limitations are recorded in [D6d2 Production Logical Backup Evidence](./D6D2_PRODUCTION_BACKUP_2026-10-21.md).

This satisfies the reviewed pre-migration logical restore requirement. It does not create Supabase-managed physical backup or PITR, and it does not include Supabase Storage object binaries.

## Preflight interpretation

The initial isolated local run confirmed the public configuration and all four explicit fail-closed Config values, but Vercel correctly refused to export Secret-type values. It was retained only as diagnostic evidence and was not treated as authoritative.

The separately approved cloud-build probe then ran inside the real Vercel Production build context. It passed the context assertion, all 13 required configuration checks, Stripe-token-key separation, and all three delivery-path checks without printing values. The probe used `--skip-domain` and deliberately exited with code `78` after the PASS result, so Vercel recorded an error-only staged build and did not promote a runtime or assign a custom domain. Full method and result evidence is recorded in [D6d2 Authoritative Production Preflight Evidence](./D6D2_PRODUCTION_PREFLIGHT_2026-10-21.md).

## Safety and cleanup evidence

A CLI argument-parsing error created a separate empty helper project named `revrecovery-d6d2-preflight`. It never contained RevRecovery source, data, or secrets and did not touch the real `rev-recovery-saas` project. The helper project and its temporary local script were removed immediately, and a follow-up lookup confirmed that the helper project no longer exists.

## Acceptance state

D6d2 is complete. Production safety now has explicit canonical-origin and delivery-gate evidence, an isolated Production auth callback, a verified encrypted logical restore control, reviewed Sentry routes and thresholds, and an authoritative redacted Production preflight PASS. Production migration, merge, runtime deployment, and customer delivery remain withheld.

Repository verification passed `npm run lint` and `npm run build -- --webpack`. The ordinary Turbopack build was also attempted, but this restricted host denied its temporary internal parser port before source parsing; the webpack production build compiled, type-checked, and generated all application routes successfully.

**Next logical step:** begin D6d3 with a fresh read-only migration listing and dry run against Production Supabase project `keddusmowpdqrxooveiz`. Stop if the pending set differs from the reviewed nine migrations, and request separate exact-target approval before applying anything.
