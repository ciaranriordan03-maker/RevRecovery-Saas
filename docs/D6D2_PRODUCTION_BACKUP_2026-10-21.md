# D6d2 Production Logical Backup Evidence

**Created and verified:** 21 October 2026

**Production Supabase project:** `keddusmowpdqrxooveiz`

**Application evidence base:** `be29cde` (`Record production callback isolation`)

**Decision:** Accepted as the pre-migration logical restore control; managed physical backups and PITR remain unavailable

## Boundary

This step created one approved, point-in-time logical backup of the Production Supabase database and tested it only in a disposable, network-isolated local PostgreSQL container.

It did not mutate Production or Development, apply a migration, merge or deploy application code, change a delivery gate, send an email, contact a provider or customer, or expose backup contents in repository files or review output.

The encrypted backup is stored outside the repository at:

`/Users/grainnedignam/Desktop/RevRecovery-Backups/revrecovery-production-20261021T121856Z`

## Backup contents

The backup contains four encrypted archives:

- `roles.sql.gz.enc` — logical database roles required by the dump;
- `schema.sql.gz.enc` — application schema definitions;
- `data.sql.gz.enc` — database rows, including authentication and storage metadata; and
- `platform-auth-storage-schema.sql.gz.enc` — Production Auth and Storage schema definitions needed to reproduce the managed-schema shape in a disposable restore target.

Each archive has a matching SHA-256 checksum file. All four checksums passed after creation and again during final cleanup verification.

Supabase Storage object binaries are not part of this database backup. The Storage database metadata is included, but object payload backup requires a separate storage-export control if Production begins using Supabase Storage for material customer files.

## Encryption and access control

- Compression: gzip
- Encryption: OpenSSL AES-256-CBC with PBKDF2, 600,000 iterations, and a salt
- Backup directory permissions: `0700`
- Backup file permissions: `0600`
- Key storage: macOS Keychain service `RevRecovery Production Backup 20261021T121856Z`
- Plaintext cleanup: no `.sql`, `.sql.gz`, or partial files remain in the backup directory

The encryption key was not printed, written to the repository, or left in a plaintext backup file. Keychain access is required to decrypt the archives.

## Restore drill

The encrypted archives were streamed into a new disposable container based on the local Supabase PostgreSQL 17.6.1.155 image. The container had no network access, and no plaintext dump files were written to disk.

The first pass exposed a managed-platform compatibility difference: the local image's Auth schema was older than Production. The restore fixture was therefore rebuilt from `template0`, the captured Production Auth and Storage schema definitions were included, managed object ownership was normalized to the local `postgres` owner, and managed default-privilege directives that the restricted disposable role could not apply were omitted. These were local restore-target accommodations only; no source archive or remote database was changed.

The final drill passed with:

- restore result: `pass`;
- public application tables: `18`;
- authentication users: `5`; and
- failed-payment rows: `0`.

Only aggregate counts were emitted. No row-level customer or authentication data was printed. The disposable restore container was removed after verification.

## Interpretation and limitations

This evidence demonstrates that the encrypted logical archives can be decrypted, validated, and restored into an isolated PostgreSQL target with documented Supabase managed-schema accommodations. It is sufficient as the reviewed pre-migration logical rollback control for the current controlled release.

It is not the same as Supabase-managed physical backup or point-in-time recovery. It is a single point-in-time snapshot, depends on access to the local Keychain entry, does not independently preserve Storage object binaries, and should be refreshed immediately before any later Production migration if the database has changed materially.

Normal database rollback remains an additive forward fix. This backup is the emergency recovery path, not a mechanism for deleting evidence-bearing migrations or rewinding routine application defects.

## Acceptance

The Production backup prerequisite is now **passed through a verified encrypted logical backup**. The absence of managed physical backup and PITR remains a documented operational limitation, not an unrecorded assumption.

Production migration, merge, deployment, and customer delivery remain withheld. D6d2 is still incomplete until Sentry operational routing is reviewed/configured under separate approval and the redacted preflight is run in an authoritative Production deployment context.

**Next logical step:** complete the separately approved Sentry route and destination mapping, then run the redacted Production-context preflight before requesting any Production migration approval.
