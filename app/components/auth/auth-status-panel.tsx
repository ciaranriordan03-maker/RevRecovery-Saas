import Link from "next/link";

type AuthStatusPanelProps = {
  email: string;
  isCheckEmail: boolean;
  isError: boolean;
  isVerified: boolean;
  message?: string;
  next: string;
};

export function AuthProgressLabel({
  isCheckEmail,
  isVerified,
}: {
  isCheckEmail: boolean;
  isVerified: boolean;
}) {
  const isStepTwo = isCheckEmail || isVerified;

  if (!isStepTwo) {
    return null;
  }

  return (
    <div className="mb-5 flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
      <span
        className={`rounded-full px-2.5 py-1 ${
          isStepTwo
            ? "bg-[var(--success-soft)] text-[var(--success-badge-text)]"
            : "bg-[var(--primary-soft)] text-[var(--primary-text)]"
        }`}
      >
        {isStepTwo ? "Step 2 of 2" : "Step 1 of 2"}
      </span>
      <span>
        {isVerified
          ? "Email confirmed"
          : isCheckEmail
            ? "Verify your email"
            : "Create or access account"}
      </span>
    </div>
  );
}

export function AuthStatusPanel({
  email,
  isCheckEmail,
  isError,
  isVerified,
  message,
  next,
}: AuthStatusPanelProps) {
  if (isVerified) {
    return (
      <div className="mt-6 rounded-[12px] border border-[var(--success-badge)] bg-[var(--success-soft)] p-4">
        <div className="flex gap-3">
          <StepNumber value="✓" />
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              Email confirmed
            </p>
            <p className="mt-1 text-sm text-[var(--muted-strong)]">
              {message ?? "Your account has been verified."}
              {email ? (
                <>
                  {" "}
                  You&apos;re signed in as{" "}
                  <span className="font-medium text-[var(--foreground)]">{email}</span>.
                </>
              ) : null}
            </p>
          </div>
        </div>

        <Link
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-5 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
          href={next}
        >
          Continue to setup
        </Link>
      </div>
    );
  }

  if (isCheckEmail) {
    return (
      <div className="mt-6 rounded-[12px] border border-[var(--success-badge)] bg-[var(--success-soft)] p-4">
        <div className="flex gap-3">
          <StepNumber value="1" />
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              We sent a confirmation link
            </p>
            <p className="mt-1 text-sm text-[var(--muted-strong)]">
              {email ? (
                <>
                  Check <span className="font-medium text-[var(--foreground)]">{email}</span>{" "}
                  and click the link from RecoverFlow.
                </>
              ) : (
                "Check the inbox for the email you used to sign up."
              )}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-3 border-t border-[var(--success-badge)] pt-4">
          <StepNumber value="2" />
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              Continue to setup
            </p>
            <p className="mt-1 text-sm text-[var(--muted-strong)]">
              The link should bring you straight into onboarding. If it asks you
              to sign in again, your email is already filled in below.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!message) {
    return null;
  }

  return (
    <div
      className={`mt-6 rounded-[10px] border px-4 py-3 text-sm ${
        isError
          ? "border-[var(--danger-soft)] bg-[var(--danger-soft)] text-[var(--danger)]"
          : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-strong)]"
      }`}
    >
      {message}
    </div>
  );
}

function StepNumber({ value }: { value: string }) {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-sm font-semibold text-[var(--success)]">
      {value}
    </div>
  );
}
