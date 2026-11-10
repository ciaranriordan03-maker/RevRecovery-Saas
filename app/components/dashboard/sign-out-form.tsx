import { logout } from "../../login/actions";

export function SignOutForm({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logout}>
      <button
        className={
          compact
            ? "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--muted-strong)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            : "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--muted-strong)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        }
        type="submit"
      >
        Sign out
      </button>
    </form>
  );
}
