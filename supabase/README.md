# Supabase database changes

`migrations/` is the canonical migration history used by the Supabase CLI. Add
future database changes there with `npx supabase migration new <name>`.

`sql/` contains the original schema scripts retained for audit history. The
initial files in `migrations/` are byte-for-byte copies of those scripts and
were recorded as already applied after the live schema was verified.

Always review `npx supabase db push --dry-run --linked` before applying a new
migration. Never run `supabase db reset --linked` against production.
