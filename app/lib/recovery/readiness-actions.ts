import type { ActivationReadinessCheck } from "./activation-readiness";

export type RecoveryReadinessAction = {
  href: string;
  label: string;
};

export const recoveryReadinessActions: Partial<
  Record<ActivationReadinessCheck["id"], RecoveryReadinessAction>
> = {
  controlled_test: {
    href: "/dashboard/recovery?step=customize#controlled-test-plan",
    label: "Review controlled test",
  },
  email_identity: {
    href: "/dashboard/recovery?step=customize#email-identity",
    label: "Complete email settings",
  },
  recovery_configuration: {
    href: "/dashboard/recovery?step=customize#recovery-delivery",
    label: "Configure recovery",
  },
  sending_domain: {
    href: "/dashboard/recovery?step=customize#sending-domain",
    label: "Review sending domain",
  },
  stripe_communication_overlap: {
    href: "/dashboard/recovery?step=customize#stripe-overlap-guidance",
    label: "Review guidance",
  },
  stripe_connection: {
    href: "/dashboard/settings#stripe-integration",
    label: "Review Stripe connection",
  },
  test_recipient: {
    href: "/dashboard/recovery?step=customize#recovery-delivery",
    label: "Review test recipient",
  },
  webhook_health: {
    href: "/dashboard/settings#stripe-integration",
    label: "Review webhook health",
  },
};
