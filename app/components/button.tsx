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
      : "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-subtle)] hover:bg-[var(--background)]";

  return (
    <button
      className={`inline-flex h-[50px] items-center justify-center rounded-[var(--radius-control)] px-6 text-base font-medium transition ${variantClass} ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
