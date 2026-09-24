import type { RecoveryMode } from "./mode-policy";

export type ControlledTestEligibilityInput = {
  approvedTestRecipient: string | null;
  emailIdentityConfigured: boolean;
  livemode: boolean | null;
  mode: RecoveryMode;
  recoveryConfigurationPersisted: boolean;
  stripeConnected: boolean;
};

export type ControlledTestEligibility = {
  checks: Array<{
    detail: string;
    id: "stripe_sandbox" | "test_mode" | "test_recipient" | "email_identity";
    label: string;
    passed: boolean;
  }>;
  eligible: boolean;
};

export const SYNTHETIC_TEST_CONFIRMATION = "CREATE_SANDBOX_CASE";

export function getSyntheticTestCaseGateError({
  confirmation,
  eligibility,
}: {
  confirmation: unknown;
  eligibility: ControlledTestEligibility;
}) {
  if (!eligibility.eligible) {
    return "Complete every controlled-test prerequisite before creating a synthetic case.";
  }

  if (confirmation !== SYNTHETIC_TEST_CONFIRMATION) {
    return "Explicit confirmation is required before creating a synthetic case.";
  }

  return null;
}

export const CONTROLLED_TEST_STEPS = [
  {
    description: "Confirm the connected Stripe account is a sandbox and recovery is in Test mode.",
    title: "Verify the safety boundary",
  },
  {
    description: "Create one clearly labelled synthetic failed subscription payment for the connected sandbox.",
    title: "Create a test case",
  },
  {
    description: "Confirm the decline diagnostic, amount, environment, and immutable timeline are correct.",
    title: "Inspect the recovery case",
  },
  {
    description: "Deliver only to the approved test recipient and confirm the message and payment link are safe.",
    title: "Verify test delivery",
  },
  {
    description: "Pause the case, record the result, and leave live recovery unchanged.",
    title: "Close the test safely",
  },
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function evaluateControlledTestEligibility(
  input: ControlledTestEligibilityInput,
): ControlledTestEligibility {
  const checks: ControlledTestEligibility["checks"] = [
    {
      detail:
        input.stripeConnected && input.livemode === false
          ? "A Stripe sandbox account is connected."
          : "Connect a Stripe sandbox account. Live Stripe accounts cannot run this guided test.",
      id: "stripe_sandbox",
      label: "Stripe sandbox",
      passed: input.stripeConnected && input.livemode === false,
    },
    {
      detail:
        input.mode === "test" && input.recoveryConfigurationPersisted
          ? "Persisted recovery settings are in Test mode."
          : "Save the recovery configuration in Test mode.",
      id: "test_mode",
      label: "Test delivery mode",
      passed: input.mode === "test" && input.recoveryConfigurationPersisted,
    },
    {
      detail:
        input.approvedTestRecipient && EMAIL_PATTERN.test(input.approvedTestRecipient)
          ? `Test delivery is restricted to ${input.approvedTestRecipient}.`
          : "Add a valid approved test recipient.",
      id: "test_recipient",
      label: "Approved recipient",
      passed: Boolean(
        input.approvedTestRecipient && EMAIL_PATTERN.test(input.approvedTestRecipient),
      ),
    },
    {
      detail: input.emailIdentityConfigured
        ? "Sender details and all three test messages are valid."
        : "Complete the sender, reply-to, support, and message settings.",
      id: "email_identity",
      label: "Email configuration",
      passed: input.emailIdentityConfigured,
    },
  ];

  return {
    checks,
    eligible: checks.every((item) => item.passed),
  };
}
