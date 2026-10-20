# D6b Release-Candidate Preview Smoke Test

**Started:** 20 October 2026  
**Branch:** `codex/release-c-activation-readiness`  
**Initial release-candidate commit:** `4e20310`  
**Environment:** RevRecovery Development / Vercel Preview  
**Current status:** One locally fixed blocker awaiting Preview verification

## Safety boundary

This smoke pass used the existing authenticated development account and existing Test evidence. It did not create a customer, create a new synthetic case, change recovery settings, resume a paused case, trigger recovery processing, request a password-reset email, send a notification, change a delivery gate, contact Stripe or Resend through a mutation, merge, or deploy to production.

## Exact-source verification

- Commit `4e20310` was pushed to the existing GitHub branch.
- GitHub `Test, lint, and build` passed in 53 seconds.
- Vercel created a fresh Preview for the exact full SHA `4e20310112443b984e49037fc5366ee844ca3156`.
- Vercel reported the deployment Ready.
- Pull request `#1` remained clean and mergeable.

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

## Blocker found

The smoke checklist required a visible logout path. The server-side `logout` action already existed and correctly called Supabase sign-out before redirecting to `/login`, but no dashboard component exposed it. A user therefore had no visible way to end the session.

The local remediation adds:

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

## Acceptance state

D6b is not yet final because the Sign out remediation has not been pushed and exercised in Vercel Preview. All other tested release-candidate surfaces passed within the no-customer-contact boundary.

The next step is to push the small Sign out remediation, wait for GitHub and Vercel, then verify desktop/mobile visibility and one real sign-out-to-login transition in Preview. That transition will end the development browser session but will not change product data or contact a customer.
