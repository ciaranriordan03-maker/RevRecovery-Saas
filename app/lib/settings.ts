export type TeamRole = "Owner" | "Admin" | "Member";

export type TeamMember = {
  id: string;
  accent: "primary" | "purple" | "success";
  canRemove: boolean;
  email: string;
  initials: string;
  name: string;
  role: TeamRole;
};

export type UserSettings = {
  email: {
    replyToEmail: string;
    senderName: string;
    supportEmail: string;
  };
  notifications: {
    aiOptimizationSuggestions: boolean;
    failedPaymentAlerts: boolean;
    recoveredRevenueAlerts: boolean;
    weeklySummaryEmails: boolean;
  };
  recovery: {
    defaultEmailTone: string;
    paymentRetryAttempts: string;
    prioritizeHighValueCustomers: boolean;
    sendingSchedule: string;
  };
  stripe: {
    accountDisplayName: string | null;
    accountEmail: string;
    accountId: string | null;
    accountLabel: string;
    connected: boolean;
    lastSyncedAt: string | null;
    status: string;
  };
  team: TeamMember[];
};

export const recoveryToneOptions = ["Friendly", "Professional", "Urgent"] as const;

export const sendingScheduleOptions = [
  "Immediate, Day 3, Day 7",
  "Immediate, Day 2, Day 5",
  "Immediate, Day 5, Day 10",
] as const;

export const paymentRetryOptions = ["1 retry", "2 retries", "3 retries"] as const;

export const teamRoleOptions: TeamRole[] = ["Owner", "Admin", "Member"];

export const defaultUserSettings: UserSettings = {
  email: {
    replyToEmail: "billing@yourcompany.com",
    senderName: "RecoverFlow Team",
    supportEmail: "support@yourcompany.com",
  },
  notifications: {
    aiOptimizationSuggestions: false,
    failedPaymentAlerts: true,
    recoveredRevenueAlerts: true,
    weeklySummaryEmails: true,
  },
  recovery: {
    defaultEmailTone: "Friendly",
    paymentRetryAttempts: "3 retries",
    prioritizeHighValueCustomers: true,
    sendingSchedule: "Immediate, Day 3, Day 7",
  },
  stripe: {
    accountDisplayName: null,
    accountEmail: "finance@acme.com",
    accountId: null,
    accountLabel: "Stripe",
    connected: false,
    lastSyncedAt: null,
    status: "not_connected",
  },
  team: [
    {
      id: "member-sarah",
      accent: "primary",
      canRemove: false,
      email: "sarah@acme.com",
      initials: "SC",
      name: "Sarah Chen",
      role: "Owner",
    },
    {
      id: "member-michael",
      accent: "purple",
      canRemove: true,
      email: "michael@acme.com",
      initials: "MJ",
      name: "Michael Johnson",
      role: "Admin",
    },
    {
      id: "member-emma",
      accent: "success",
      canRemove: true,
      email: "emma@acme.com",
      initials: "EP",
      name: "Emma Park",
      role: "Member",
    },
  ],
};

export function mergeUserSettings(
  source: Partial<UserSettings> | null | undefined,
): UserSettings {
  if (!source) {
    return cloneSettings(defaultUserSettings);
  }

  return {
    email: {
      ...defaultUserSettings.email,
      ...source.email,
    },
    notifications: {
      ...defaultUserSettings.notifications,
      ...source.notifications,
    },
    recovery: {
      ...defaultUserSettings.recovery,
      ...source.recovery,
    },
    stripe: {
      ...defaultUserSettings.stripe,
      ...source.stripe,
    },
    team: Array.isArray(source.team) && source.team.length > 0
      ? source.team.map((member) => ({
          accent: member.accent ?? "primary",
          canRemove: member.canRemove ?? true,
          email: member.email ?? "",
          id: member.id ?? crypto.randomUUID(),
          initials: member.initials ?? getInitials(member.name ?? ""),
          name: member.name ?? "",
          role: member.role ?? "Member",
        }))
      : cloneSettings(defaultUserSettings).team,
  };
}

export function cloneSettings(settings: UserSettings): UserSettings {
  return JSON.parse(JSON.stringify(settings)) as UserSettings;
}

export function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "TM";
}
