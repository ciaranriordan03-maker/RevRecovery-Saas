import Link from "next/link";
import { Button } from "../components/button";
import { Icon } from "../components/ui-icon";
import { login } from "./actions";

type AuthFormProps = {
  email: string;
  next: string;
};

export function AuthForm({ email, next }: AuthFormProps) {
  return (
    <form className="mt-8">
      <input name="next" type="hidden" value={next} />

      <label className="block">
        <span className="mb-2.5 block text-sm font-medium text-[var(--auth-label)]">
          Email address
        </span>
        <span className="relative block">
          <Icon
            name="mail"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--auth-icon)]"
          />
          <input
            className="h-[46px] w-full rounded-[14px] border border-[var(--auth-input-border)] bg-white px-12 text-sm text-[var(--auth-heading)] outline-none transition placeholder:text-[var(--auth-placeholder)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)]"
            defaultValue={email}
            name="email"
            placeholder="you@company.com"
            required
            type="email"
          />
        </span>
      </label>

      <label className="mt-5 block">
        <span className="mb-2.5 block text-sm font-medium text-[var(--auth-label)]">
          Password
        </span>
        <span className="relative block">
          <Icon
            name="lock"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--auth-icon)]"
          />
          <input
            className="h-[46px] w-full rounded-[14px] border border-[var(--auth-input-border)] bg-white px-12 text-sm text-[var(--auth-heading)] outline-none transition placeholder:text-[var(--auth-placeholder)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)]"
            minLength={8}
            name="password"
            placeholder="••••••••"
            required
            type="password"
          />
        </span>
      </label>

      <div className="mt-3 flex justify-end">
        <Link className="text-sm font-medium text-[var(--primary)]" href="/forgot-password">
          Forgot password?
        </Link>
      </div>

      <Button
        className="mt-5 h-[46px] w-full gap-2 rounded-[14px] text-sm font-semibold shadow-sm"
        formAction={login}
        type="submit"
      >
        Sign in
        <Icon name="arrow-right" className="size-4" />
      </Button>

      <p className="mt-7 text-center text-sm font-medium text-[var(--muted-strong)]">
        Don&apos;t have an account?{" "}
        <Link
          className="font-semibold text-[var(--primary)]"
          href={`/signup?next=${encodeURIComponent(next)}`}
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
