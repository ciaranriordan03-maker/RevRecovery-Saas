"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DiceBearAvatar } from "../avatar";
import { Button } from "../button";
import { Icon } from "../ui-icon";
import {
  defaultUserSettings,
  getInitials,
  mergeUserSettings,
  paymentRetryOptions,
  recoveryToneOptions,
  sendingScheduleOptions,
  teamRoleOptions,
  type TeamMember,
  type TeamRole,
  type UserSettings,
} from "../../lib/settings";

type LoadState = {
  settings: UserSettings;
  storage: "memory" | "supabase";
  updatedAt: string | null;
};

type ErrorState = {
  error?: string;
};

type ProfilePayload = {
  profile?: {
    avatarSeed: string | null;
    fullName: string | null;
  };
  error?: string;
};

function buildAvatarOptions(identifier: string) {
  const baseSeed = identifier.trim().toLowerCase() || "recoverflow-user";

  return Array.from({ length: 8 }, (_, index) => `${baseSeed}:avatar-${index + 1}`);
}

function SettingsSection({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: string;
  title: string;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-6 py-4">
        <Icon className="size-5 text-[var(--muted-strong)]" name={icon} />
        <h2 className="text-base font-medium tracking-[-0.02em] text-[var(--foreground)]">
          {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-[var(--foreground)]">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;

  return (
    <input
      className={`h-11 rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] ${className}`}
      {...rest}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;

  return (
    <select
      className={`h-11 rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] ${className}`}
      {...rest}
    />
  );
}

function getErrorMessage(payload: ErrorState | LoadState, fallback: string) {
  return "error" in payload ? payload.error ?? fallback : fallback;
}

function isLoadState(payload: ErrorState | LoadState): payload is LoadState {
  return "settings" in payload && "storage" in payload;
}

function getStripeConnectHref(next: string) {
  return `/api/stripe/connect?next=${encodeURIComponent(next)}`;
}

function Toggle({
  checked,
  label,
  onChange,
  subtitle,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  subtitle: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[var(--border)] py-5 first:border-t-0 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm text-[var(--foreground)]">{label}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p>
      </div>
      <button
        aria-pressed={checked}
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition ${
          checked
            ? "justify-end bg-[var(--primary)]"
            : "justify-start bg-[var(--border-strong)]"
        }`}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span className="size-4 rounded-full bg-[var(--surface)]" />
      </button>
    </div>
  );
}

function getNextAccent(index: number): TeamMember["accent"] {
  return (["primary", "purple", "success"] as const)[index % 3];
}

export function SettingsContent({
  accountEmail,
  initialAvatarSeed,
  initialFullName,
  userId,
}: {
  accountEmail: string;
  initialAvatarSeed: string | null;
  initialFullName: string | null;
  userId: string;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings);
  const [savedSnapshot, setSavedSnapshot] = useState<UserSettings>(defaultUserSettings);
  const avatarOptions = useMemo(
    () => buildAvatarOptions(accountEmail || userId),
    [accountEmail, userId],
  );
  const initialSeed = initialAvatarSeed ?? avatarOptions[0];
  const [avatarSeed, setAvatarSeed] = useState(initialSeed);
  const [savedAvatarSeed, setSavedAvatarSeed] = useState(initialSeed);
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [savedFullName, setSavedFullName] = useState(initialFullName ?? "");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [statusTone, setStatusTone] = useState<"error" | "success" | "muted">("muted");
  const [storage, setStorage] = useState<LoadState["storage"]>("memory");

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        const payload = (await response.json()) as
          | LoadState
          | {
              error?: string;
            };

        if (!response.ok) {
          throw new Error(getErrorMessage(payload, "Unable to load settings."));
        }

        if (!isLoadState(payload)) {
          throw new Error("Unable to load settings.");
        }

        if (cancelled) {
          return;
        }

        const nextSettings = mergeUserSettings(payload.settings);
        setSettings(nextSettings);
        setSavedSnapshot(nextSettings);
        setStorage(payload.storage);
        setStatusMessage("");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatusTone("error");
        setStatusMessage(
          error instanceof Error ? error.message : "Unable to load settings.",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!statusMessage || statusTone !== "success") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setStatusMessage("");
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [statusMessage, statusTone]);

  const hasChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSnapshot),
    [savedSnapshot, settings],
  );
  const hasAvatarChanges = avatarSeed !== savedAvatarSeed || fullName.trim() !== savedFullName;

  function updateSettings(updater: (current: UserSettings) => UserSettings) {
    setSettings((current) => updater(current));
    if (statusMessage && statusTone !== "success") {
      setStatusMessage("");
    }
  }

  async function saveSettings() {
    setIsSaving(true);
    setStatusMessage("");

    try {
      const response = await fetch("/api/settings", {
        body: JSON.stringify({ settings }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PUT",
      });
        const payload = (await response.json()) as
          | LoadState
          | {
            error?: string;
          };

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Unable to save settings."));
      }

      if (!isLoadState(payload)) {
        throw new Error("Unable to save settings.");
      }

      const nextSettings = mergeUserSettings(payload.settings);
      setSettings(nextSettings);
      setSavedSnapshot(nextSettings);
      setStorage(payload.storage);
      setStatusTone("success");
      setStatusMessage("Settings saved");
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to save settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAvatar() {
    setIsSavingAvatar(true);
    setStatusMessage("");

    try {
      const response = await fetch("/api/profile", {
        body: JSON.stringify({
          avatarSeed,
          fullName: fullName.trim(),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PUT",
      });
      const payload = (await response.json()) as ProfilePayload;

      if (!response.ok || !payload.profile) {
        throw new Error(payload.error ?? "Unable to save avatar.");
      }

      const nextAvatarSeed = payload.profile.avatarSeed ?? avatarOptions[0];
      const nextFullName = payload.profile.fullName ?? "";
      setAvatarSeed(nextAvatarSeed);
      setSavedAvatarSeed(nextAvatarSeed);
      setFullName(nextFullName);
      setSavedFullName(nextFullName);
      setStatusTone("success");
      setStatusMessage("Profile saved");
      router.refresh();
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(error instanceof Error ? error.message : "Unable to save avatar.");
    } finally {
      setIsSavingAvatar(false);
    }
  }

  function rotatePassword() {
    const nextPassword = window.prompt("Enter a new password");

    if (!nextPassword) {
      return;
    }

    setStatusTone("muted");
    setStatusMessage("Password change flow will be connected after MVP auth hardening.");
  }

  function addTeamMember() {
    const name = window.prompt("Invite member name");
    if (!name) {
      return;
    }

    const email = window.prompt("Invite member email");
    if (!email) {
      return;
    }

    updateSettings((current) => ({
      ...current,
      team: [
        ...current.team,
        {
          accent: getNextAccent(current.team.length),
          canRemove: true,
          email,
          id: `member-${Date.now()}`,
          initials: getInitials(name),
          name,
          role: "Member",
        },
      ],
    }));
  }

  function updateMemberRole(memberId: string, role: TeamRole) {
    updateSettings((current) => ({
      ...current,
      team: current.team.map((member) =>
        member.id === memberId
          ? {
              ...member,
              role,
            }
          : member,
      ),
    }));
  }

  function removeMember(memberId: string) {
    updateSettings((current) => ({
      ...current,
      team: current.team.filter((member) => member.id !== memberId),
    }));
  }

  return (
    <div className="px-5 py-8 sm:px-8 xl:px-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[var(--muted)]">
              {storage === "supabase"
                ? "Settings are loading from Supabase."
                : "Settings are running in local preview mode until Supabase envs are configured."}
            </p>
            <p
              className={`mt-1 text-sm ${
                statusTone === "error"
                  ? "text-[var(--danger)]"
                  : statusTone === "success"
                    ? "text-[var(--success)]"
                    : "text-[var(--muted-strong)]"
              }`}
            >
              {statusMessage || (hasChanges ? "You have unsaved changes." : "All changes saved.")}
            </p>
          </div>
          <Button
            className="h-11 px-5 text-sm"
            disabled={isLoading || isSaving || !hasChanges}
            onClick={() => void saveSettings()}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <SettingsSection icon="users" title="Profile">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <DiceBearAvatar
                alt="Selected account avatar"
                className="size-14"
                seed={avatarSeed}
                size={56}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)]">Account profile</p>
                <p className="mt-1 truncate text-xs text-[var(--muted)]">{accountEmail}</p>
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm text-[var(--foreground)]">Full name</span>
              <input
                className="h-11 w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm outline-none transition focus:border-[var(--primary)]"
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your name"
                type="text"
                value={fullName}
              />
            </label>

            <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
              {avatarOptions.map((option) => {
                const selected = option === avatarSeed;

                return (
                  <button
                    aria-label="Choose account avatar"
                    aria-pressed={selected}
                    className={`flex aspect-square items-center justify-center rounded-[12px] border bg-[var(--background)] transition ${
                      selected
                        ? "border-[var(--primary)] ring-2 ring-[var(--primary-border)]"
                        : "border-[var(--border)] hover:border-[var(--border-strong)]"
                    }`}
                    key={option}
                    onClick={() => setAvatarSeed(option)}
                    type="button"
                  >
                    <DiceBearAvatar alt="" className="size-10" seed={option} size={40} />
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button
                className="h-9 px-4 text-sm"
                disabled={isSavingAvatar || !hasAvatarChanges}
                onClick={() => void saveAvatar()}
                variant="secondary"
              >
                {isSavingAvatar ? "Saving..." : "Save Avatar"}
              </Button>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection icon="card" title="Integrations">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-[10px] bg-[var(--primary-soft)] text-[var(--primary)]">
                  <Icon className="size-5" name="card" />
                </div>
                <div>
                  <p className="text-sm text-[var(--foreground)]">{settings.stripe.accountLabel}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {settings.stripe.connected
                      ? settings.stripe.accountEmail || settings.stripe.accountId || "Connected"
                      : "Not connected"}
                  </p>
                  {settings.stripe.connected && settings.stripe.accountId ? (
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {settings.stripe.accountId}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded px-2 py-1 text-xs ${
                    settings.stripe.connected
                      ? "bg-[var(--success-badge)] text-[var(--success-badge-text)]"
                      : "bg-[var(--surface-muted)] text-[var(--muted-strong)]"
                  }`}
                >
                  {settings.stripe.connected ? "Connected" : "Not connected"}
                </span>
                <Button
                  className="h-9 px-4 text-sm"
                  onClick={() => {
                    window.location.href = getStripeConnectHref("/dashboard/settings");
                  }}
                  variant="secondary"
                >
                  {settings.stripe.connected ? "Reconnect" : "Connect"}
                </Button>
              </div>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection icon="mail" title="Email Settings">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Support Email">
              <TextInput
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    email: {
                      ...current.email,
                      supportEmail: event.target.value,
                    },
                  }))
                }
                value={settings.email.supportEmail}
              />
            </Field>
            <Field label="Sender Name">
              <TextInput
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    email: {
                      ...current.email,
                      senderName: event.target.value,
                    },
                  }))
                }
                value={settings.email.senderName}
              />
            </Field>
            <Field label="Reply-To Email">
              <TextInput
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    email: {
                      ...current.email,
                      replyToEmail: event.target.value,
                    },
                  }))
                }
                value={settings.email.replyToEmail}
              />
            </Field>
          </div>
        </SettingsSection>

        <SettingsSection icon="refresh" title="Recovery Preferences">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Default Email Tone">
              <Select
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    recovery: {
                      ...current.recovery,
                      defaultEmailTone: event.target.value,
                    },
                  }))
                }
                value={settings.recovery.defaultEmailTone}
              >
                {recoveryToneOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sending Schedule">
              <Select
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    recovery: {
                      ...current.recovery,
                      sendingSchedule: event.target.value,
                    },
                  }))
                }
                value={settings.recovery.sendingSchedule}
              >
                {sendingScheduleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Payment Retry Attempts">
                <Select
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      recovery: {
                        ...current.recovery,
                        paymentRetryAttempts: event.target.value,
                      },
                    }))
                  }
                  value={settings.recovery.paymentRetryAttempts}
                >
                  {paymentRetryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          <div className="mt-5 rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-4">
            <label className="flex items-start gap-3">
              <input
                checked={settings.recovery.prioritizeHighValueCustomers}
                className="mt-0.5 size-4 rounded border-[var(--border-strong)] text-[var(--primary)]"
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    recovery: {
                      ...current.recovery,
                      prioritizeHighValueCustomers: event.target.checked,
                    },
                  }))
                }
                type="checkbox"
              />
              <span>
                <span className="block text-sm text-[var(--foreground)]">
                  Prioritize high-value customers ($100+/month)
                </span>
                <span className="mt-1 block text-xs text-[var(--muted)]">
                  Send recovery emails within 1 hour for customers spending more each month.
                </span>
              </span>
            </label>
          </div>
        </SettingsSection>

        <SettingsSection icon="users" title="Team Members">
          <div className="mb-5 flex justify-end">
            <Button className="h-9 gap-2 px-4 text-sm" onClick={addTeamMember}>
              <Icon className="size-4" name="plus" />
              Invite Member
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {settings.team.map((member) => (
              <div
                className="flex flex-col gap-4 rounded-[10px] bg-[var(--background)] p-3 sm:flex-row sm:items-center sm:justify-between"
                key={member.id}
              >
                <div className="flex items-center gap-3">
                  <DiceBearAvatar
                    alt={`${member.name || "Team member"} avatar`}
                    className="size-9"
                    seed={member.email || member.id}
                    size={36}
                  />
                  <div>
                    <p className="text-sm text-[var(--foreground)]">{member.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{member.email}</p>
                  </div>
                </div>

                {member.role === "Owner" ? (
                  <span className="rounded px-2 py-1 text-xs text-[var(--primary)] bg-[var(--primary-border)]">
                    Owner
                  </span>
                ) : (
                  <div className="flex items-center gap-3">
                    <Select
                      className="h-8 min-w-[96px] rounded border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-xs text-[var(--foreground)]"
                      onChange={(event) =>
                        updateMemberRole(member.id, event.target.value as TeamRole)
                      }
                      value={member.role}
                    >
                      {teamRoleOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                    {member.canRemove ? (
                      <button
                        className="text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
                        onClick={() => removeMember(member.id)}
                        type="button"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection icon="bell" title="Notifications">
          <Toggle
            checked={settings.notifications.failedPaymentAlerts}
            label="Failed Payment Alerts"
            onChange={(checked) =>
              updateSettings((current) => ({
                ...current,
                notifications: {
                  ...current.notifications,
                  failedPaymentAlerts: checked,
                },
              }))
            }
            subtitle="Get notified when a payment fails"
          />
          <Toggle
            checked={settings.notifications.recoveredRevenueAlerts}
            label="Recovered Revenue Alerts"
            onChange={(checked) =>
              updateSettings((current) => ({
                ...current,
                notifications: {
                  ...current.notifications,
                  recoveredRevenueAlerts: checked,
                },
              }))
            }
            subtitle="Get notified when a payment is recovered"
          />
          <Toggle
            checked={settings.notifications.weeklySummaryEmails}
            label="Weekly Summary Emails"
            onChange={(checked) =>
              updateSettings((current) => ({
                ...current,
                notifications: {
                  ...current.notifications,
                  weeklySummaryEmails: checked,
                },
              }))
            }
            subtitle="Receive a weekly digest of recovery performance"
          />
          <Toggle
            checked={settings.notifications.aiOptimizationSuggestions}
            label="AI Optimization Suggestions"
            onChange={(checked) =>
              updateSettings((current) => ({
                ...current,
                notifications: {
                  ...current.notifications,
                  aiOptimizationSuggestions: checked,
                },
              }))
            }
            subtitle="Get notified when AI identifies new optimization opportunities"
          />
        </SettingsSection>

        <SettingsSection icon="shield" title="Security">
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm text-[var(--foreground)]">Password</p>
              <Button
                className="mt-3 h-10 px-4 text-sm"
                onClick={rotatePassword}
                variant="secondary"
              >
                Change Password
              </Button>
            </div>

          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
