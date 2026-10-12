# Preview deployment safety

- Deploy Preview from the current branch head; do not redeploy an older deployment after the branch has advanced.
- Confirm the deployment source commit matches `git rev-parse HEAD` before smoke testing.
- Keep Preview Supabase variables scoped to Preview and Production variables scoped to Production.
- Never copy secret values into logs, documentation, commits, or support messages.
- Smoke-test authentication on the unique Preview deployment before merging to `main`.

