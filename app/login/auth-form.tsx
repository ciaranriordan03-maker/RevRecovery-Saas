import { Button } from "../components/button";
import { Icon } from "../components/ui-icon";
import { login, signup } from "./actions";

type AuthFormProps = {
  email: string;
  isCheckEmail: boolean;
  next: string;
};

export function AuthForm({ email, isCheckEmail, next }: AuthFormProps) {
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
        <button className="text-sm font-medium text-[var(--primary)]" type="button">
          Forgot password?
        </button>
      </div>

      <Button
        className="mt-5 h-[46px] w-full gap-2 rounded-[14px] text-sm font-semibold shadow-sm"
        formAction={login}
        type="submit"
      >
        {isCheckEmail ? "I confirmed, continue" : "Sign in"}
        <Icon name="arrow-right" className="size-4" />
      </Button>

      <div className="my-7 flex items-center gap-5">
        <span className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-sm text-[var(--muted)]">or</span>
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <div className="space-y-3">
        <SocialButton icon="google" label="Continue with Google" />
        <SocialButton icon="github" label="Continue with GitHub" />
      </div>

      <p className="mt-7 text-center text-sm font-medium text-[var(--muted-strong)]">
        Don&apos;t have an account?{" "}
        <button
          className="font-semibold text-[var(--primary)]"
          formAction={signup}
          type="submit"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}

function SocialButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      aria-disabled="true"
      className="flex h-[46px] w-full items-center justify-center gap-3 rounded-[14px] border border-[var(--auth-input-border)] bg-white px-4 text-sm font-semibold text-[var(--auth-social-text)]"
      type="button"
    >
      <Icon name={icon} className="size-5 text-[var(--auth-social-text)]" />
      {label}
    </button>
  );
}
