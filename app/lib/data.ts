export const onboardingSteps = [
  "Welcome",
  "Connect Stripe",
  "Email Setup",
  "Recovery Preview",
  "Activate",
  "Success",
] as const;

export type OnboardingStep = (typeof onboardingSteps)[number];

export const dashboardNavItems = [
  "Setup",
  "Dashboard",
  "Recovery",
  "Insights",
  "Optimize",
  "Settings",
] as const;

export type DashboardNavItem = (typeof dashboardNavItems)[number];

export const recoveryEmails = [
  {
    title: "Day 0 - Immediate Notification",
    badge: "Sent immediately",
    badgeClass: "bg-[var(--surface-muted)] text-[var(--muted-strong)]",
    icon: "mail",
    description:
      "Friendly alert about the failed payment with a direct link to update payment method.",
    subject: '"Action needed: Update your payment method"',
  },
  {
    title: "Day 3 - Gentle Reminder",
    badge: "If not resolved",
    badgeClass: "bg-[var(--surface-muted)] text-[var(--muted-strong)]",
    icon: "clock",
    description:
      "Polite reminder emphasizing value and ease of updating payment info.",
    subject: "\"Don't lose access to your account\"",
  },
  {
    title: "Day 7 - Final Notice",
    badge: "Final attempt",
    badgeClass: "bg-[var(--warning-soft)] text-[var(--warning-text)]",
    icon: "check-circle",
    description:
      "Clear notice about service interruption with urgency and clear call-to-action.",
    subject: '"Final reminder: Payment required"',
  },
] as const;

export const recoveryBenefits = [
  {
    icon: "bolt",
    title: "Real-time Monitoring",
    body: "Failed payments are monitored as Stripe sends recovery events",
  },
  {
    icon: "mail",
    title: "Automated Outreach",
    body: "Recovery emails are sent automatically based on your sequence",
  },
  {
    icon: "users",
    title: "Customer Experience",
    body: "Customers get helpful, timely reminders to update their payment",
  },
] as const;

export const recoveryToneOptions = [
  {
    title: "Friendly",
    body: "Warm, helpful, conversational",
    selected: true,
  },
  {
    title: "Professional",
    body: "Clear, direct, business-focused",
    selected: false,
  },
  {
    title: "Urgent",
    body: "Time-sensitive, action-focused",
    selected: false,
  },
] as const;

export const recoveryAudienceOptions = [
  {
    title: "All Customers",
    body: "Apply this recovery sequence to every failed payment",
    selected: true,
  },
  {
    title: "High-Value Customers",
    body: "Prioritize accounts with larger recurring revenue",
    selected: false,
  },
  {
    title: "At-Risk Customers",
    body: "Focus on customers with prior failed payment history",
    selected: false,
  },
] as const;

export const recoveryEmailTabs = ["Email 1", "Email 2", "Email 3"] as const;
