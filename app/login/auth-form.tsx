import { Button } from "../components/button";
import { login, signup } from "./actions";

type AuthFormProps = {
  email: string;
  isCheckEmail: boolean;
  next: string;
};

export function AuthForm({ email, isCheckEmail, next }: AuthFormProps) {
  return (
    <form className="mt-6 space-y-4">
      <input name="next" type="hidden" value={next} />
      <label className="block">
        <span className="mb-2 block text-sm text-[var(--foreground)]">Email</span>
        <input
          className="h-12 w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm outline-none transition focus:border-[var(--primary)]"
          defaultValue={email}
          name="email"
          placeholder="you@company.com"
          required
          type="email"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm text-[var(--foreground)]">Password</span>
        <input
          className="h-12 w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm outline-none transition focus:border-[var(--primary)]"
          minLength={8}
          name="password"
          placeholder="Minimum 8 characters"
          required
          type="password"
        />
      </label>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button className="h-11 flex-1 text-sm" formAction={login} type="submit">
          {isCheckEmail ? "I confirmed, continue" : "Log In"}
        </Button>
        <Button
          className="h-11 flex-1 text-sm"
          formAction={signup}
          type="submit"
          variant="secondary"
        >
          Sign Up
        </Button>
      </div>
    </form>
  );
}
