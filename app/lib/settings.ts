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

const LEGACY_DEMO_TEAM_EMAILS = new Set([
  "sarah@acme.com",
  "michael@acme.com",
  "emma@acme.com",
]);

export const defaultUserSettings: UserSettings = {
  email: {
    replyToEmail: "",
    senderName: "RevRecovery",
    supportEmail: "",
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
    accountEmail: "",
    accountId: null,
    accountLabel: "Stripe",
    connected: false,
    lastSyncedAt: null,
    status: "not_connected",
  },
  team: [],
};

export function mergeUserSettings(
  source: Partial<UserSettings> | null | undefined,
): UserSettings {
  if (!source) {
    return cloneSettings(defaultUserSettings);
  }

  const mergedSenderName = source.email?.senderName?.trim();
  const mergedReplyToEmail = source.email?.replyToEmail?.trim();
  const mergedSupportEmail = source.email?.supportEmail?.trim();

  return {
    email: {
      ...defaultUserSettings.email,
      ...source.email,
      replyToEmail:
        mergedReplyToEmail ?? defaultUserSettings.email.replyToEmail,
      senderName:
        !mergedSenderName || /^RecoverFlow(?: Team)?$/i.test(mergedSenderName)
          ? defaultUserSettings.email.senderName
          : mergedSenderName,
      supportEmail:
        mergedSupportEmail ?? defaultUserSettings.email.supportEmail,
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
    team: Array.isArray(source.team) && source.team.length > 0 && !isLegacyDemoTeam(source.team)
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

function isLegacyDemoTeam(team: TeamMember[]) {
  return team.length === LEGACY_DEMO_TEAM_EMAILS.size && team.every((member) =>
    LEGACY_DEMO_TEAM_EMAILS.has(member.email?.toLowerCase()),
  );
}

export function getUserSettingsValidationError(settings: UserSettings) {
  if (!settings.email.senderName.trim()) {
    return "Sender name is required.";
  }

  if (!isValidEmailAddress(settings.email.supportEmail)) {
    return "Support email must be a valid email address.";
  }

  if (!isValidEmailAddress(settings.email.replyToEmail)) {
    return "Reply-to email must be a valid email address.";
  }

  return null;
}

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@.]+$/.test(value);
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
