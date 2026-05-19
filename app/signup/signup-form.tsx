import Link from "next/link";
import { Button } from "../components/button";
import { Icon } from "../components/ui-icon";
import { signup } from "../login/actions";

type SignupFormProps = {
  email: string;
  next: string;
};

export function SignupForm({ email, next }: SignupFormProps) {
  return (
    <form className="mt-7">
      <input name="next" type="hidden" value={next} />
      <input name="source" type="hidden" value="/signup" />

      <label className="block">
        <span className="mb-2.5 block text-sm font-medium text-[var(--auth-label)]">
          Full name
        </span>
        <span className="relative block">
          <Icon
            name="users"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--auth-icon)]"
          />
          <input
            className="h-[46px] w-full rounded-[10px] border border-transparent bg-[var(--surface-muted)] px-12 text-sm text-[var(--auth-heading)] outline-none transition placeholder:text-[var(--auth-placeholder)] focus:border-[var(--primary)] focus:bg-white focus:ring-4 focus:ring-[var(--primary-soft)]"
            name="full_name"
            placeholder="Enter your full name"
            type="text"
          />
        </span>
      </label>

      <label className="mt-4 block">
        <span className="mb-2.5 block text-sm font-medium text-[var(--auth-label)]">
          Email address
        </span>
        <span className="relative block">
          <Icon
            name="mail"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--auth-icon)]"
          />
          <input
            className="h-[46px] w-full rounded-[10px] border border-transparent bg-[var(--surface-muted)] px-12 text-sm text-[var(--auth-heading)] outline-none transition placeholder:text-[var(--auth-placeholder)] focus:border-[var(--primary)] focus:bg-white focus:ring-4 focus:ring-[var(--primary-soft)]"
            defaultValue={email}
            name="email"
            placeholder="Enter your email"
            required
            type="email"
          />
        </span>
      </label>

      <label className="mt-4 block">
        <span className="mb-2.5 block text-sm font-medium text-[var(--auth-label)]">
          Password
        </span>
        <span className="relative block">
          <Icon
            name="lock"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--auth-icon)]"
          />
          <input
            className="h-[46px] w-full rounded-[10px] border border-transparent bg-[var(--surface-muted)] px-12 text-sm text-[var(--auth-heading)] outline-none transition placeholder:text-[var(--auth-placeholder)] focus:border-[var(--primary)] focus:bg-white focus:ring-4 focus:ring-[var(--primary-soft)]"
            minLength={8}
            name="password"
            placeholder="Create a password"
            required
            type="password"
          />
        </span>
      </label>
      <p className="mt-2 text-xs text-[var(--muted)]">Must be at least 8 characters</p>

      <label className="mt-4 block">
        <span className="mb-2.5 block text-sm font-medium text-[var(--auth-label)]">
          Confirm password
        </span>
        <span className="relative block">
          <Icon
            name="lock"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--auth-icon)]"
          />
          <input
            className="h-[46px] w-full rounded-[10px] border border-transparent bg-[var(--surface-muted)] px-12 text-sm text-[var(--auth-heading)] outline-none transition placeholder:text-[var(--auth-placeholder)] focus:border-[var(--primary)] focus:bg-white focus:ring-4 focus:ring-[var(--primary-soft)]"
            minLength={8}
            name="confirm_password"
            placeholder="Confirm your password"
            required
            type="password"
          />
        </span>
      </label>

      <Button
        className="mt-5 h-[46px] w-full rounded-[10px] text-sm font-semibold shadow-sm"
        formAction={signup}
        type="submit"
      >
        Create account
      </Button>

      <p className="mt-7 text-center text-sm font-medium text-[var(--muted-strong)]">
        Already have an account?{" "}
        <Link
          className="font-semibold text-[var(--auth-heading)]"
          href={`/login?next=${encodeURIComponent(next)}`}
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
