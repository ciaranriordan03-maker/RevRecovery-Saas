# D6c1 Dependency and Stripe Redirect Security Remediation

**Completed locally:** 20 October 2026  
**Branch:** `codex/release-c-activation-readiness`  
**Starting head:** `167dcd1` (`Record D6c security and operational review`)  
**Decision:** Local D6c1 safeguards accepted; remote GitHub and Vercel evidence still required

## Boundary

D6c1 addresses the two merge-blocking findings from the D6c review:

1. Known vulnerabilities in the production dependency graph.
2. Stripe Connect return paths that could resolve outside the application origin.

The work did not change Supabase data or migrations, recovery modes, notification gates, Stripe account state, Resend configuration, customer delivery, merge state, or production deployment state.

## Dependency remediation

The update followed the installed Next.js 16 upgrade and redirect guidance before application code changed.

Reviewed package updates include:

- Next.js and its ESLint configuration: `16.3.0` → `16.4.2`.
- DiceBear core and toon-head: `9.4.2` → `9.4.3`.
- Sharp: `0.35.3` → `0.35.5` through the patched Next.js graph.
- `fast-uri`: `3.1.5` → `3.1.9`.
- `source-map-js`: `1.2.1` → `1.2.2`.
- Affected `brace-expansion` copies were updated to the latest compatible releases.
- Vitest and `js-yaml` development-tool advisories were also updated to fixed compatible releases.

Final production audit result:

- Critical: **0**
- High: **0**
- Moderate: **0**
- Low: **0**

The complete audit, which includes development-only packages, still reports the upstream `braces@3.0.3` advisory through `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch`. No patched `braces` release exists at the time of review. npm proposes downgrading `eslint-config-next` from Next 16 to 14, which is not a safe or valid remediation for this application. This residue is confined to local/CI lint tooling and is absent from the production audit.

## Stripe Connect redirect remediation

The Stripe Connect start and callback routes now apply the shared allowlisted internal redirect policy:

- Return paths are sanitized before they are written into OAuth state.
- Protocol-relative, absolute, and backslash-based cross-origin variants fall back to `/dashboard/settings`.
- Callback state is parsed only after the returned state exactly matches the HttpOnly state cookie.
- The OAuth error path cannot use state-derived navigation until that state has been validated.
- Every final callback outcome re-sanitizes its destination.
- Every final callback outcome expires the single-use state cookie to reduce replay risk.

Regression coverage proves both accepted internal navigation and rejection of hostile absolute, protocol-relative, and backslash variants. It also proves that unmatched state cannot choose an internal destination and that even a matching legacy state cannot escape the app origin.

## Local verification

- Focused Stripe redirect suite: **10 passed**.
- Full regression suite: **93 files, 434 tests passed**.
- ESLint: **passed**.
- TypeScript: **passed during production build**.
- Next.js 16.4.2 Webpack production build: **passed; all 33 routes generated**.
- `npm audit --omit=dev`: **0 vulnerabilities**.
- `git diff --check`: **passed**.

The required default Turbopack build was attempted. It reached compilation but the managed sandbox prevented its loader process from binding an internal port (`EPERM`). The documented Webpack build completed successfully; GitHub and Vercel must provide the fresh unsandboxed build evidence.

## Acceptance condition

D6c1 is locally complete. It is accepted only after the exact remediation commit passes GitHub CI and Vercel Preview, followed by a focused same-origin Stripe navigation check against that Preview. This record does not authorize merge or production deployment.

The next logical step after remote D6c1 acceptance is **D6c2: make recovery delivery and secret configuration fail closed, with redacted preflight evidence and no activation of customer delivery**.
