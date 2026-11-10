type AuthStatusPanelProps = {
  isError: boolean;
  message?: string;
};

export function AuthStatusPanel({
  isError,
  message,
}: AuthStatusPanelProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      aria-live={isError ? "assertive" : "polite"}
      className={`mt-6 rounded-[10px] border px-4 py-3 text-sm ${
        isError
          ? "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger)]"
          : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-strong)]"
      }`}
      role={isError ? "alert" : "status"}
    >
      {message}
    </div>
  );
}
