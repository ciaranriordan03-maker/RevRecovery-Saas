import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary";
};

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
      : "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-subtle)] hover:bg-[var(--surface-muted)]";

  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] px-5 py-2.5 text-sm font-semibold motion-safe:transition-[background-color,border-color,color,box-shadow,transform] motion-safe:duration-150 motion-safe:active:translate-y-px disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${variantClass} ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
