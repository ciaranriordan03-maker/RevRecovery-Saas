import { logout } from "../../login/actions";

export function SignOutForm({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logout}>
      <button
        className={
          compact
            ? "inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--muted-strong)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            : "inline-flex h-9 w-full items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--muted-strong)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
        }
        type="submit"
      >
        Sign out
      </button>
    </form>
  );
}
