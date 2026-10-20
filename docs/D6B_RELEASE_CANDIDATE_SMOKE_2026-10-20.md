# D6b Release-Candidate Preview Smoke Test

**Started:** 20 October 2026  
**Branch:** `codex/release-c-activation-readiness`  
**Initial release-candidate commit:** `4e20310`  
**Accepted remediation commit:** `4f64a93`<br>
**Environment:** RevRecovery Development / Vercel Preview  
**Current status:** Accepted

## Safety boundary

This smoke pass used the existing authenticated development account and existing Test evidence. It did not create a customer, create a new synthetic case, change recovery settings, resume a paused case, trigger recovery processing, request a password-reset email, send a notification, change a delivery gate, contact Stripe or Resend through a mutation, merge, or deploy to production.

## Exact-source verification

- Commit `4e20310` was pushed to the existing GitHub branch.
- GitHub `Test, lint, and build` passed in 53 seconds.
- Vercel created a fresh Preview for the exact full SHA `4e20310112443b984e49037fc5366ee844ca3156`.
- Vercel reported the deployment Ready.
- Pull request `#1` remained clean and mergeable.
- The Sign out remediation was pushed as commit `4f64a93a212c488992103ea6dcaf11b22fecfd04`.
- GitHub `Test, lint, and build`, Vercel, and Vercel Preview Comments all passed for that exact commit.
- Vercel created the successful exact-commit Preview at `https://rev-recovery-saas-g9ssj3cuz-ciaranriordan03-makers-projects.vercel.app`.

## Read-only smoke results

| Surface | Result | Evidence |
| --- | --- | --- |
| Authenticated route guard | Pass | The existing development session reached `/dashboard`; completed-user visits to `/login` and `/onboarding` redirected safely to Dashboard. |
| Password-recovery UI | Pass, no submission | `/forgot-password` exposed the labelled email form and `/reset-password` exposed labelled new-password and confirmation fields. No email was requested and no password was changed. |
| Dashboard | Pass | Revenue-at-risk, failed-payment, recovery-mode, and guidance evidence rendered without a generic or internal-server error. |
| Cases workspace | Pass | Two existing Test cases rendered with decline, amount, environment, attention, retry, next-action, audience, and status evidence. |
| Synthetic controlled-test evidence | Pass, read-only | The existing synthetic case rendered its diagnostics, no-schedule state, communication guidance, case facts, and synthetic timeline evidence. No new synthetic case was created. |
| Scheduled and paused case | Pass, read-only | The existing active case rendered Stripe retry timing, manual-pause state, recovery-window evidence, controls, facts, and its full timeline. The Resume action was not invoked. |
| Recovery overview | Pass | Opportunity snapshot, recovery health, essential-notification preview, readiness, and recorded evidence rendered. |
| Recovery settings | Pass, read-only | Persisted Test mode, schedule, identity, Stripe coordination, sending-domain, reviewed-recipient, authorization, and controlled-test sections rendered. No setting was changed. |
| Insights | Pass | Test/30-day/all-audiences evidence rendered with measurement quality, withheld baseline and comparison, evidence traceability, manifest export, and verifier UI. |
| Optimize | Pass | Two evidence-based recovery recommendations rendered without unsupported retry or prioritisation claims. |
| Settings | Pass after expected async load | Supabase-backed profile, connected Stripe sandbox, Test delivery mode, schedule, email identity, and Security section replaced the initial loading state. |
| Browser runtime | Pass on isolated rerun | Fresh isolated route checks produced zero console warnings or errors across authenticated pages and public recovery routes. A single earlier hydration log was not reproducible on any isolated route or redirect. |

## Blocker found and resolved

The smoke checklist required a visible logout path. The server-side `logout` action already existed and correctly called Supabase sign-out before redirecting to `/login`, but no dashboard component exposed it. A user therefore had no visible way to end the session.

The accepted remediation adds:

- A real form submit backed by the existing server-side logout action.
- A visible desktop Sign out control in the account area.
- A visible mobile Sign out control in the dashboard header.
- A regression test proving both dashboard placements and the server-action connection.

## Local remediation verification

- Targeted sign-out tests: 2 passed.
- Full application suite: 424 tests passed across 92 test files.
- ESLint: passed.
- TypeScript: passed during the production build.
- Webpack production build: passed with all 33 routes.
- Default local Turbopack build: blocked by the known sandbox-only internal-port `EPERM`; GitHub's default build passed for the initial exact release candidate.

## Preview remediation verification

- Desktop viewport: the account-area Sign out control rendered visibly and accessibly.
- Mobile viewport: the compact dashboard-header Sign out control rendered visibly and accessibly.
- Session transition: Sign out ended the authenticated session and redirected to `/login`.
- Session restoration: signing back into the same development Preview restored `/dashboard` successfully.
- Browser runtime: the complete sign-out and sign-in transition produced zero console warnings or errors.
- Responsive override: the temporary desktop viewport was cleared after verification.
- No product data, recovery schedule, delivery gate, notification, Stripe state, or Resend state changed during this verification.

## Acceptance state

D6b is complete. The frozen release-candidate Preview passed the whole-product, no-customer-contact smoke test, and the only blocker found during the first pass was fixed and verified on the exact remediation commit.

The next logical step is D6c: perform the final security and operational release review, including environment boundaries, secrets and access, delivery gates, webhook and cron failure paths, observability, and rollback readiness before any merge or production deployment is considered.
