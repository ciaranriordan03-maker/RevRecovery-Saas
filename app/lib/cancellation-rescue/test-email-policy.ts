export const CANCELLATION_TEST_EMAIL_FIXTURE = {
  version: "cancellation_test_v1",
  subject: "[TEST] RevRecovery cancellation follow-up",
  text: [
    "This is a controlled RevRecovery test. It is not a customer message.",
    "",
    "Example: Your Example App subscription is scheduled to end. If that was unintended or you would prefer to keep it active, contact the Example App team.",
    "",
    "There is no action to take. This test does not change a subscription.",
  ].join("\n"),
} as const;

// One plain mailbox only. No display name, address list, or header syntax.
const SINGLE_MAILBOX = /^[a-z0-9][a-z0-9._+'-]*@[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z0-9]+$/;

export function normalizeCancellationTestEmailRecipient(value: string | undefined) {
  const email = value?.trim().toLowerCase();
  return email && email.length <= 254 && SINGLE_MAILBOX.test(email) ? email : null;
}

export function isCancellationTestEmailDevelopment({
  supabaseUrl,
  vercelEnvironment,
  vercelTarget,
}: {
  supabaseUrl: string | null;
  vercelEnvironment?: string;
  vercelTarget?: string;
}) {
  if (vercelEnvironment && !["preview", "development"].includes(vercelEnvironment)) return false;
  if (vercelTarget && !["preview", "development", "staging"].includes(vercelTarget)) return false;

  // This operator-only exercise is scoped to RevRecovery Development, not a
  // runtime-selectable project. No localhost, custom host, or Production fallback.
  return /^https:\/\/xkumdvlmmqyybavylibi\.supabase\.co\/?$/.test(supabaseUrl ?? "");
}
