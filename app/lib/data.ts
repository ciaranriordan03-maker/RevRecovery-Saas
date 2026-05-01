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

export const metrics = [
  ["Revenue at Risk", "$47,850", "Last 30 days", "risk"],
  ["Failed Payments", "127", "Across 89 customers", "risk"],
  ["Recoverable Revenue", "$31,200", "~65% recovery rate", "success"],
] as const;

export const breakdown = [
  ["Card declined", "$28,400", "bg-[var(--danger-dot)]"],
  ["Insufficient funds", "$12,650", "bg-[var(--orange-dot)]"],
  ["Expired card", "$6,800", "bg-[var(--yellow-dot)]"],
] as const;

export const recommendations = [
  {
    title: "Add urgency to Email 3",
    titleBadgeClass: "bg-[var(--primary-soft)] text-[var(--primary-text)]",
    body: "Data shows that adding a clear deadline in Day 7 emails increases recovery by 8%.",
    action: "Apply Change",
  },
  {
    title: 'Add a "Why this happened" section',
    titleBadgeClass: "bg-[var(--warning-soft)] text-[var(--warning-text)]",
    body: "Customers respond better when they understand common reasons for payment failures.",
    action: "Apply Change",
  },
  {
    title: "Create VIP segment for faster outreach",
    titleBadgeClass: "bg-[var(--success-soft)] text-[var(--success-badge-text)]",
    body: "High-value customers recover faster with priority Day 0 outreach.",
    action: "Create Segment",
  },
] as const;

export const recommendationImpactSummary = {
  value: "+$3,850/mo",
} as const;

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

export const activationBenefits = [
  {
    icon: "bolt",
    title: "Immediate Processing",
    body: "We'll start monitoring failed payments in real-time",
  },
  {
    icon: "mail",
    title: "Automated Outreach",
    body: "Recovery emails will be sent automatically based on your sequence",
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

export const insightFunnel = [
  {
    label: "Emails Sent",
    value: "100%",
    barClass: "w-full bg-[var(--primary)]",
    trackClass: "bg-[var(--primary-soft)]",
  },
  {
    label: "Opened",
    value: "100%",
    barClass: "w-full bg-[var(--chart-blue)]",
    trackClass: "bg-[var(--blue-soft)]",
  },
  {
    label: "Clicked Link",
    value: "72%",
    barClass: "w-[72%] bg-[var(--chart-green)]",
    trackClass: "bg-[var(--chart-green-track)]",
  },
  {
    label: "Payment Recovered",
    value: "48%",
    barClass: "w-[48%] bg-[var(--chart-green-dark)]",
    trackClass: "bg-[var(--chart-green-track)]",
  },
] as const;

export const insightCards = [
  {
    icon: "mail",
    iconClass: "bg-[var(--primary-soft)] text-[var(--primary)]",
    title: "Best Performing Email",
    rows: [
      {
        label: "Day 3 - Gentle Reminder",
        value: "42% recovery",
        valueClass: "text-[var(--success)]",
        rowClass: "bg-[var(--success-soft)] border-[var(--success-badge)]",
      },
      {
        label: "Best subject line",
        value: "Don't lose access",
        valueClass: "text-[var(--muted-strong)]",
        rowClass: "bg-[var(--background)] border-[var(--border)]",
      },
    ],
  },
  {
    icon: "target",
    iconClass: "bg-[var(--success-soft)] text-[var(--success)]",
    title: "Customer Segment Insight",
    rows: [
      {
        label: "High-Value Customers",
        value: "78% recovered",
        valueClass: "text-[var(--success)]",
        rowClass: "bg-[var(--blue-soft)] border-[var(--blue-border)]",
      },
      {
        label: "Most common issue",
        value: "Card declined",
        valueClass: "text-[var(--muted-strong)]",
        rowClass: "bg-[var(--background)] border-[var(--border)]",
      },
    ],
  },
] as const;

export const optimizeSuggestions = [
  {
    title: "Add urgency to Email 3",
    impact: "+8% recovery",
    body: "Give customers a clear deadline before service pauses.",
    current: '"Please update your payment method to continue your service."',
    suggested: '"Update your payment by Friday to avoid service interruption."',
  },
  {
    title: 'Add a "Why this happened" section',
    impact: "+5% recovery",
    body: "Reduce confusion by explaining common payment failure reasons.",
    current: '"Your payment failed. Please update your billing details."',
    suggested:
      '"This can happen because of an expired card, low balance, or bank decline."',
  },
  {
    title: "Prioritize high-value customers",
    impact: "+2% recovery",
    body: "Send the first recovery email sooner for larger accounts.",
    current: "First reminder sends 4 hours after the failed payment.",
    suggested: "First reminder sends within 1 hour for $200+ monthly accounts.",
  },
] as const;
