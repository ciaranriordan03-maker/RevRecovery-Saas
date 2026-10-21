# D6d3 Production Migration Listing and Dry-Run Evidence

**Reviewed:** 21 October 2026

**Branch:** `codex/release-c-activation-readiness`

**Exact reviewed application head:** `f341768`

**Production Supabase project:** `keddusmowpdqrxooveiz`

**Decision:** Production migration application and post-write verification pass; merge and deployment remain withheld

## Boundary

This step first re-read the Production migration history and generated a non-mutating migration plan for the exact Production project. After separate explicit approval, it applied only that reviewed nine-file set and verified the resulting migration history. It did not repair migration history, update Vault, include seed data or roles, relink the repository, change application configuration, merge or deploy code, enable delivery, send a message, or contact a customer.

No database password, access token, secret, row-level data, or environment-variable value was printed or stored in this evidence.

## Prerequisites

The review was performed only after:

- the encrypted logical Production backup and disposable restore drill had passed;
- the D6d2 Production URL, auth callback, Sentry routing, and fail-closed delivery prerequisites had passed;
- the authoritative Production-context preflight had confirmed all required configuration and all disabled delivery gates; and
- GitHub test/lint/build, Vercel, and Vercel Preview checks had passed for exact head `f341768`.

The logical backup remains the reviewed emergency recovery control. It must be refreshed before migration if Production data changes materially after the recorded snapshot.

## Method

Supabase CLI `2.115.0` was used with an explicit `--project-ref keddusmowpdqrxooveiz`. The repository's Development link was not changed.

The sequence was:

1. list local and remote migration history for the exact Production project;
2. run `db push` with both `--dry-run` and `--skip-vault` against that project;
3. compare the proposed files with the previously reviewed nine-file set; and
4. list migration history again to prove the dry run changed nothing.

The dry-run output explicitly reported that migrations would not be pushed. It proposed no seeds and no roles.

## Result

Both migration listings reported 32 local migrations, of which 23 are present remotely and nine remain local-only. The dry run proposed exactly these nine migrations, in this order:

1. `20261012000100_essential_notification_foundation.sql`
2. `20261013000100_notification_test_delivery_foundation.sql`
3. `20261013000200_notification_test_recipient_review.sql`
4. `20261015000100_notification_one_time_authorization.sql`
5. `20261015000200_notification_single_use_reservation.sql`
6. `20261015000300_notification_post_send_reconciliation.sql`
7. `20261015000400_notification_resolution_request_foundation.sql`
8. `20261015000500_notification_quarantine_transition.sql`
9. `20261015000600_notification_quarantine_evidence_checkpoint.sql`

This exactly matches the previously reviewed D6d inventory. There are no unexpected remote-only versions, no newly pending file, no missing reviewed file, and no ordering difference.

The post-dry-run listing remained 23 applied and nine pending. Therefore the read-only review made no database change.

## Approved application and post-write proof

The user separately approved applying the exact nine-file set to Production Supabase project `keddusmowpdqrxooveiz`. Immediately before the write, the migration listing and dry run were repeated. Both still reported the same 23 applied and nine pending migrations, in the reviewed order, with no drift.

The approved push used the exact Production project reference and `--skip-vault`. It did not include seed or role flags. Supabase applied all nine reviewed files in order and reported no SQL error.

Post-write verification then established:

- all 32 local migration versions are present remotely;
- every local and remote migration version matches;
- a sequential `db push --dry-run --skip-vault` reports `upToDate: true`;
- no migration remains pending;
- no seed or role change remains pending; and
- the repository remains linked to Development rather than being relinked to Production.

The first post-write dry-run process was started concurrently with the migration listing and stalled before obtaining its read-only connection. It was interrupted without output or mutation and rerun sequentially, where it completed successfully with the up-to-date result above.

Application delivery configuration was not changed. The four independently reviewed Production delivery gates remain in their fail-closed Vercel configuration, and the migrated notification foundations are disabled by default.

## Repository verification

- `npm run lint` passed.
- `npm run build -- --webpack` passed compilation, TypeScript validation, static generation, and route collection.
- The ordinary local Turbopack build was attempted twice, including outside the workspace sandbox, but this host denied its temporary internal parser port before source parsing. The exact application head independently passed GitHub's test/lint/build workflow and Vercel's build checks.

## Acceptance state

D6d3 is complete. Its listing and dry-run gate passed, the exact approved nine-file set was applied successfully, and Production now records 32 of 32 migrations with an empty post-write plan.

Merge, Production runtime deployment, delivery enablement, and customer contact remain withheld. Any change to the project identity, backup state, or fail-closed delivery state invalidates this approval basis and requires the relevant review to be repeated.

**Next logical step:** preserve this application evidence on the existing GitHub branch and require exact-head checks. After they pass, begin D6d4 with a separate approval covering the exact merge head and its resulting Production deployment.
