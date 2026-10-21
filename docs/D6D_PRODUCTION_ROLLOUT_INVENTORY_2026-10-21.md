# D6d Production Rollout Inventory

**Audited:** 21 October 2026

**Branch:** `codex/release-c-activation-readiness`

**Audited application head:** `74a42d4` (`Add redacted operational alerting`)

**Pull request:** `#1`

**Decision:** Read-only inventory complete; merge, migration, and production deployment remain withheld

> **D6d2 update — 21 October 2026:** Production now has a Production-only canonical app URL, all four explicit fail-closed delivery gates, and a Supabase auth allow-list containing only the canonical Production callback. Development retains the localhost and Preview callbacks. A password-protected logical Production backup passed checksum verification and a disposable network-isolated restore drill; managed physical backup and PITR remain unavailable. Sentry implements the reviewed Production monitor filters, thresholds, logical routes, uptime destination, and duplicate safeguard. A separately approved, fail-closed Vercel Production build probe passed every configuration and delivery-gate check, then stopped before runtime or domain promotion. D6d2 is complete; Production rollout remains withheld pending D6d3 migration review and later merge/deployment approvals. See [D6d2 Production Prerequisite Evidence](./D6D2_PRODUCTION_PREREQUISITES_2026-10-21.md), [D6d2 Authoritative Production Preflight Evidence](./D6D2_PRODUCTION_PREFLIGHT_2026-10-21.md), [D6d2 Production Logical Backup Evidence](./D6D2_PRODUCTION_BACKUP_2026-10-21.md), and [D6d2 Sentry Operational Routing Evidence](./D6D2_SENTRY_ROUTING_2026-10-21.md).

> **D6d3 update — 21 October 2026:** GitHub test/lint/build and the previously accepted Vercel application build passed before migration. A fresh listing against exact Production project `keddusmowpdqrxooveiz` reported 23 of 32 local migrations applied, and `db push --dry-run --skip-vault` proposed exactly the reviewed nine migrations with no seeds or roles. After separate explicit approval, those nine files applied successfully in order. The post-write listing reports 32 of 32, and a sequential dry run reports the remote database up to date with an empty plan. Delivery configuration was not changed. D6d3 is complete; merge and Production deployment remain withheld pending D6d4 approval. See [D6d3 Production Migration Listing, Application, and Verification Evidence](./D6D3_PRODUCTION_MIGRATION_DRY_RUN_2026-10-21.md).

## Boundary

This was a read-only release inventory. It inspected names, scopes, project identity, migration versions, backup availability, domains, and check status without copying secret values into the repository or review output.

It did **not**:

- change a Vercel environment variable;
- reveal or save a private key, token, or webhook secret;
- relink the local Supabase project;
- apply or repair a migration;
- restore or export database data;
- change a Sentry project or alert destination;
- change a delivery gate;
- merge the pull request; or
- deploy to production.

## Executive outcome

D6c3 is remotely accepted at `74a42d4`. GitHub CI, Vercel, and Vercel Preview Comments all passed for the exact commit, and the latest Preview deployment is Ready. Pull request `#1` is open, clean, and mergeable.

Production rollout is nevertheless **not approved**. The inventory found four material release gates:

1. Vercel Production and Preview currently use the same Supabase project rather than isolated production and development projects.
2. That Vercel-backed database has 9 unapplied migrations while the locally linked development database has all 32 migrations.
3. Neither active Supabase project currently exposes an available physical backup, and PITR is disabled.
4. The four delivery-control variables are absent from Vercel, so runtime behavior fails closed but the required explicit disabled-state evidence is missing.

Sentry configuration is present in Vercel, but the Sentry organization requires a separate browser login, so actual alert rules and destinations remain unverified.

## GitHub and Vercel release state

| Evidence | Result |
| --- | --- |
| Pull request | `#1`, open, not draft |
| Base and head | `main` <- `codex/release-c-activation-readiness` |
| Exact reviewed head | `74a42d40add5882c7ced48379bc53b3635e01ce6` |
| Merge state | Clean and mergeable |
| Review decision | No review decision recorded |
| GitHub `Test, lint, and build` | Passed |
| Vercel | Passed |
| Vercel Preview Comments | Passed |
| Latest Preview | Ready at exact head |
| Audited application-head distance from `origin/main` | 67 commits; 165 changed files |

The production custom domains `revrecovery.io`, `www.revrecovery.io`, and `rev-recovery-saas.vercel.app` show valid Vercel configuration. No production deployment was triggered during this audit.

## Vercel environment inventory

Values were not recorded. Public project targeting was compared in memory and reported only as project identity and equality.

### Present for both Production and Preview

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_CONNECT_CLIENT_ID`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_TOKEN_ENCRYPTION_KEY`
- `RESEND_API_KEY`
- `RECOVERY_EMAIL_FROM`
- `RECOVERY_EMAIL_CRON_SECRET`
- `CRON_SECRET`

`RESEND_WEBHOOK_SECRET` is present for Production only. That is sufficient for a production-only Resend webhook, but a Preview webhook drill would require a separately reviewed Preview secret and endpoint.

### Missing from both Production and Preview

- `RECOVERY_DELIVERY_ENABLED`
- `RECOVERY_DELIVERY_KILL_SWITCH`
- `ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED`
- `ESSENTIAL_NOTIFICATION_AUTHORIZED_TEST_DELIVERY_ENABLED`

The application treats absent delivery-enable variables as disabled after D6c2, so this is not evidence that customer delivery is active. It is still insufficient release evidence: the production preflight requires explicit values of `false`, `true`, `false`, and `false`, respectively.

### Scope findings

- Production and Preview resolve to the same Supabase project, **Rev Recovery Saas** (`keddusmowpdqrxooveiz`).
- The local repository is linked instead to **RevRecovery Development** (`xkumdvlmmqyybavylibi`).
- `NEXT_PUBLIC_APP_URL` is one shared Production-and-Preview entry. Its current value does not match the validated production domain or the stable release-branch Preview alias. The environments therefore need separate reviewed values before auth links can be treated as release-safe.
- `DEFAULT_USER_ID` is absent remotely. It is a local/demo fallback rather than a production release requirement; authenticated dashboard paths use the authenticated user subject.

## Supabase project and migration inventory

| Project | Intended role | Health | Migration state | Backup state |
| --- | --- | --- | --- | --- |
| RevRecovery Development (`xkumdvlmmqyybavylibi`) | Development and Preview target | Active healthy | 32 of 32 local migrations present | No available physical backup; PITR disabled |
| Rev Recovery Saas (`keddusmowpdqrxooveiz`) | Vercel Production target | Active healthy | 32 of 32 local migrations present | Verified encrypted logical backup; no available physical backup; PITR disabled |

The non-mutating production-target dry run completed successfully and identified exactly these nine pending migrations:

1. `20261012000100_essential_notification_foundation.sql`
2. `20261013000100_notification_test_delivery_foundation.sql`
3. `20261013000200_notification_test_recipient_review.sql`
4. `20261015000100_notification_one_time_authorization.sql`
5. `20261015000200_notification_single_use_reservation.sql`
6. `20261015000300_notification_post_send_reconciliation.sql`
7. `20261015000400_notification_resolution_request_foundation.sql`
8. `20261015000500_notification_quarantine_transition.sql`
9. `20261015000600_notification_quarantine_evidence_checkpoint.sql`

The dry run used `--dry-run --skip-vault`. No SQL, seed, role, or Vault change was applied.

These migrations are additive foundations and guarded transitions, but that does not remove the backup requirement. Several add triggers, security-definer functions, immutable evidence controls, or checkpoint backfill. They must be applied in order, against the exact intended project, only after backup evidence and separate approval.

That separate approval was subsequently granted. All nine files applied in the reviewed order without SQL error. A post-write listing confirms 32 of 32 migrations present, and a fresh `--dry-run --skip-vault` reports the remote database up to date with no migration, seed, or role work remaining.

## Monitoring inventory

- Sentry is configured in code for browser, server, and edge runtimes.
- Vercel contains both `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` for Production and Preview.
- Source-map upload configuration names the `rev-recovery` organization and `rev-recovery-saas` project.
- D6c3's redacted operational capture, stable fingerprints, thresholds, role tags, and mocked no-network drill are accepted.
- Eight live metric detectors now match the code-owned `alert_code`, `alert_route`, `customer_contact:none`, environment, time-window, and threshold contract.
- Enabled workflows route `engineering` and `operator_and_engineering` conditions to the available Sentry member, and the Production uptime detector is attached to the latter.
- General Production errors remain covered through the default Error Monitor, while the former project-wide high-priority workflow is disabled to prevent duplicate mail.

The routing prerequisite now passes. Because the organization has one member, logical route separation does not yet provide human responder redundancy. See [D6d2 Sentry Operational Routing Evidence](./D6D2_SENTRY_ROUTING_2026-10-21.md).

## Backup and restore decision

The second reviewed control has now been completed: an encrypted, access-controlled logical Production backup was created outside the repository and restored successfully into a disposable, network-isolated local target. All encrypted checksums passed, no plaintext dump remains, and only aggregate restore counts were emitted. See [D6d2 Production Logical Backup Evidence](./D6D2_PRODUCTION_BACKUP_2026-10-21.md).

Production still reports no available physical backup and PITR is disabled. That remains an operational limitation and should be revisited as the product and data volume grow, but the verified logical snapshot now satisfies the current pre-migration backup gate. The backup should be refreshed if Production data changes materially before migration.

Database rollback will use an additive forward fix rather than removing evidence-bearing tables, triggers, or migrations after they have been applied. Restore is an emergency path, not the normal response to an application defect.

## Rollout and stop plan

### D6d1 — isolate and re-prove Preview

Under separate environment-change approval:

1. Point **Preview only** to RevRecovery Development using its matching public and secret credentials.
2. Give Preview a stable branch Preview app URL and leave Production on the validated production domain.
3. Add all four explicit safe delivery variables to Preview:
   - `RECOVERY_DELIVERY_ENABLED=false`
   - `RECOVERY_DELIVERY_KILL_SWITCH=true`
   - `ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED=false`
   - `ESSENTIAL_NOTIFICATION_AUTHORIZED_TEST_DELIVERY_ENABLED=false`
4. Redeploy the exact branch head.
5. Run the redacted preflight in the deployment context and repeat the D6b no-customer-contact smoke.

This is the next safest remote change because it removes Preview-to-production data coupling before any merge or production migration.

### D6d2 — complete production prerequisites

Under separate configuration approval:

1. Split `NEXT_PUBLIC_APP_URL` and set Production to the validated production origin.
2. Add the same four explicit disabled gate values to Production.
3. Verify Supabase production auth site and redirect allow-list entries for the production domain.
4. Sign in to Sentry and verify the real alert-rule destinations and thresholds.
5. Establish and verify the chosen backup/restore control.
6. Rerun the redacted production preflight without printing values.

### D6d3 — migrate the production database

Under a separate, exact-target migration approval:

1. Record the fresh backup/restore evidence.
2. Re-run migration listing and `db push --dry-run --skip-vault` against `keddusmowpdqrxooveiz`.
3. Stop if the pending list differs from the nine migrations above.
4. Apply only the reviewed migrations in order.
5. Re-list migrations and confirm 32 of 32.
6. Keep every delivery gate explicitly disabled throughout.

All six steps are complete. The current logical backup/restore evidence is accepted, the pre-write listing and dry run matched the reviewed nine-file set exactly, all nine files applied without SQL error, the post-write listing reports 32 of 32, and delivery configuration remained unchanged and fail-closed.

### D6d4 — merge and production deployment

Vercel is connected to GitHub, so merging to `main` is expected to trigger a production build and deployment. Treat that as one coupled execution with two explicit decisions:

1. approve the exact commit for merge; and
2. approve the resulting production deployment.

If those decisions must occur at different times, first introduce an approved deployment hold. Do not merge and assume production can be considered later.

### D6e — zero-customer-contact production proof

Immediately after deployment:

1. verify public auth and protected-route behavior;
2. verify dashboard reads and environment labels;
3. verify Stripe and Resend webhook endpoints reject invalid signatures generically;
4. verify cron rejects unauthorised requests;
5. verify Sentry captures one safe non-delivery operational drill if an approved production-safe drill path exists;
6. confirm no recovery email, essential notification, provider mutation, or customer contact occurred; and
7. stop the rollout on any unexpected `5xx`, auth redirect, migration, tenant-isolation, or delivery-gate anomaly.

Pilot activation remains a later, separately reviewed decision.

## Hard stop conditions

Stop before or during rollout if any of the following is true:

- Preview and Production still share the same database unintentionally;
- a Vercel public URL, publishable key, and secret key do not identify the same approved project;
- the production migration dry run differs from the reviewed nine-file list;
- no current, verified restorable backup evidence exists;
- any delivery gate is absent, invalid, or enabled;
- the app URL or Supabase auth redirect target does not match the intended environment;
- Sentry operational routing is absent or unverified;
- GitHub or Vercel checks are not green for the exact merge head;
- a migration reports an error or an unexpected lock/backfill condition;
- a smoke test creates customer contact, provider delivery, or unreviewed mutation; or
- the release produces unexplained `5xx`, webhook, cron, authentication, or tenant-isolation failures.

## Acceptance state

D6d's inventory and rollout design are complete, D6d2's prerequisites pass, and D6d3's exact Production migration application is verified at 32 of 32. Production rollout remains **withheld**, not failed: the exact D6d4 merge/deployment decisions and the D6e zero-customer-contact proof remain outstanding.

Repository verification for this documentation slice passed `npm run lint` and `npm run build -- --webpack`. The ordinary local Turbopack build was also attempted, but this host denied the temporary internal parser port before source parsing; the exact audited application head independently passed the ordinary GitHub and Vercel production builds.

**Next logical step:** preserve the D6d3 application evidence on the existing GitHub branch and require exact-head checks. After they pass, begin D6d4 with a separate approval covering the exact merge head and its resulting Production deployment.
