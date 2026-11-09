"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AVATAR_PRESETS, DiceBearAvatar } from "../avatar";
import { Button } from "../button";
import { Icon } from "../ui-icon";
import {
  defaultUserSettings,
  mergeUserSettings,
  type UserSettings,
} from "../../lib/settings";
import { getStripeConnectHref } from "../../lib/stripe/connect-url";
import { type RecoveryMode } from "../../lib/recovery/mode-policy";
import {
  getRecoverySchedule,
  type RecoveryScheduleId,
} from "../../lib/recovery/schedule-policy";
import { AccountAlertsSettings } from "./notification-test-recipient-settings";

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

type RecoveryModeSettings = {
  approvedTestRecipient: string | null;
  connected: boolean;
  editable: boolean;
  livemode: boolean | null;
  mode: RecoveryMode;
  scheduleId: RecoveryScheduleId;
  source: "persisted" | "fail_closed_fallback" | "not_connected";
  stripeAccountId: string | null;
  timezone: string;
};

type RecoveryModePayload = {
  error?: string;
  recovery?: RecoveryModeSettings;
};

const recoveryModeCopy: Record<
  RecoveryMode,
  { description: string; label: string }
> = {
  off: {
    description: "Record failed payments without scheduling or sending outreach.",
    label: "Off",
  },
  test: {
    description: "Send every recovery email only to one approved test address.",
    label: "Test",
  },
  live: {
    description: "Send recovery emails to the Stripe customer on each case.",
    label: "Live",
  },
  paused: {
    description: "Keep cases and schedules, but temporarily stop all sending.",
    label: "Paused",
  },
};

const recoveryModeBadgeClass: Record<RecoveryMode, string> = {
  live: "bg-[var(--success-badge)] text-[var(--success-badge-text)]",
  off: "bg-[var(--surface-muted)] text-[var(--muted-strong)]",
  paused: "bg-[var(--warning-soft)] text-[var(--warning-text)]",
  test: "bg-[var(--primary-soft)] text-[var(--primary-text)]",
};

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

function getErrorMessage(payload: ErrorState | LoadState, fallback: string) {
  return "error" in payload ? payload.error ?? fallback : fallback;
}

function isLoadState(payload: ErrorState | LoadState): payload is LoadState {
  return "settings" in payload && "storage" in payload;
}

export function SettingsContent({
  accountEmail,
  initialAvatarSeed,
  initialFullName,
}: {
  accountEmail: string;
  initialAvatarSeed: string | null;
  initialFullName: string | null;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings);
  const avatarOptions = AVATAR_PRESETS;
  const initialSeed = initialAvatarSeed ?? avatarOptions[0].id;
  const [avatarSeed, setAvatarSeed] = useState(initialSeed);
  const [savedAvatarSeed, setSavedAvatarSeed] = useState(initialSeed);
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [savedFullName, setSavedFullName] = useState(initialFullName ?? "");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [statusTone, setStatusTone] = useState<"error" | "success" | "muted">("muted");
  const [storage, setStorage] = useState<LoadState["storage"]>("memory");
  const [recoveryMode, setRecoveryMode] = useState<RecoveryModeSettings | null>(null);
  const [isLoadingRecoveryMode, setIsLoadingRecoveryMode] = useState(true);
  const [recoveryModeMessage, setRecoveryModeMessage] = useState("");

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
    let cancelled = false;

    async function loadRecoveryMode() {
      try {
        const response = await fetch("/api/recovery/settings", { cache: "no-store" });
        const payload = (await response.json()) as RecoveryModePayload;

        if (!response.ok || !payload.recovery) {
          throw new Error(payload.error ?? "Unable to load recovery delivery mode.");
        }

        if (!cancelled) {
          setRecoveryMode(payload.recovery);
        }
      } catch (error) {
        if (!cancelled) {
          setRecoveryModeMessage(
            error instanceof Error
              ? error.message
              : "Unable to load recovery delivery mode.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRecoveryMode(false);
        }
      }
    }

    void loadRecoveryMode();

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

  const hasAvatarChanges = avatarSeed !== savedAvatarSeed || fullName.trim() !== savedFullName;

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

      const nextAvatarSeed = payload.profile.avatarSeed ?? avatarOptions[0].id;
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
    router.push("/forgot-password");
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
              {statusMessage || (isLoading ? "Loading account settings..." : "Account settings loaded.")}
            </p>
          </div>
        </div>

        <SettingsSection icon="users" title="Profile">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <DiceBearAvatar
                  alt="Selected account avatar"
                  className="size-16"
                  seed={avatarSeed}
                  size={64}
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-[var(--foreground)]">
                    {fullName.trim() || "Account profile"}
                  </p>
                  <p className="mt-1 truncate text-xs text-[var(--muted)]">
                    {accountEmail}
                  </p>
                </div>
              </div>
              <Button
                className="h-9 shrink-0 px-4 text-sm"
                disabled={isSavingAvatar || !hasAvatarChanges}
                onClick={() => void saveAvatar()}
                variant="secondary"
              >
                {isSavingAvatar ? "Saving..." : "Save profile"}
              </Button>
            </div>

            <label className="block max-w-xl">
              <span className="mb-2 block text-sm text-[var(--foreground)]">Full name</span>
              <input
                className="h-11 w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm outline-none transition focus:border-[var(--primary)]"
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your name"
                type="text"
                value={fullName}
              />
            </label>

            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">Profile picture</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Choose a look that feels like you.
                  </p>
                </div>
                <p className="hidden text-xs text-[var(--muted)] sm:block">8 choices</p>
              </div>
              <div
                aria-label="Profile picture choices"
                className="mt-3 flex gap-2 overflow-x-auto pb-2"
                role="radiogroup"
              >
                {avatarOptions.map((option) => {
                  const selected = option.id === avatarSeed;

                  return (
                    <button
                      aria-checked={selected}
                      aria-label={`Choose ${option.label} avatar`}
                      className={`flex size-14 shrink-0 items-center justify-center rounded-full border bg-[var(--background)] transition ${
                        selected
                          ? "border-[var(--primary)] ring-2 ring-[var(--primary-border)]"
                          : "border-[var(--border)] hover:border-[var(--border-strong)]"
                      }`}
                      key={option.id}
                      onClick={() => setAvatarSeed(option.id)}
                      role="radio"
                      type="button"
                    >
                      <DiceBearAvatar alt="" className="size-11" seed={option.id} size={44} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </SettingsSection>

        <div id="stripe-integration">
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
        </div>

        <div id="account-alerts">
          <SettingsSection icon="bell" title="Account alerts">
            <AccountAlertsSettings />
          </SettingsSection>
        </div>

        <SettingsSection icon="refresh" title="Recovery setup">
          {isLoadingRecoveryMode ? (
            <p className="text-sm text-[var(--muted)]">Loading recovery configuration...</p>
          ) : recoveryMode ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-medium text-[var(--foreground)]">
                      Recovery delivery
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${recoveryModeBadgeClass[recoveryMode.mode]}`}
                    >
                      {recoveryModeCopy[recoveryMode.mode].label}
                    </span>
                  </div>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                    {recoveryModeCopy[recoveryMode.mode].description}
                  </p>
                </div>
                <Link
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] transition hover:bg-[var(--primary-hover)]"
                  href="/dashboard/recovery?step=customize"
                >
                  Manage recovery
                  <Icon className="size-4" name="arrow-right" />
                </Link>
              </div>

              <dl className="grid overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--background)] sm:grid-cols-3 sm:divide-x sm:divide-[var(--border)]">
                <div className="border-b border-[var(--border)] p-4 sm:border-b-0">
                  <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Schedule
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium text-[var(--foreground)]">
                    {getRecoverySchedule(recoveryMode.scheduleId).label}
                  </dd>
                </div>
                <div className="border-b border-[var(--border)] p-4 sm:border-b-0">
                  <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Sender
                  </dt>
                  <dd className="mt-1.5 truncate text-sm font-medium text-[var(--foreground)]">
                    {settings.email.senderName || "Not set"}
                  </dd>
                </div>
                <div className="p-4">
                  <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    {recoveryMode.mode === "test" ? "Test recipient" : "Email tone"}
                  </dt>
                  <dd className="mt-1.5 truncate text-sm font-medium text-[var(--foreground)]">
                    {recoveryMode.mode === "test"
                      ? recoveryMode.approvedTestRecipient || "Not set"
                      : settings.recovery.defaultEmailTone || "Not set"}
                  </dd>
                </div>
              </dl>

              {!recoveryMode.connected || recoveryMode.source === "fail_closed_fallback" ? (
                <div
                  className={`flex gap-3 rounded-[10px] border p-4 text-sm leading-6 ${
                    recoveryMode.source === "fail_closed_fallback"
                      ? "border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)]"
                      : "border-[var(--warning-text)]/20 bg-[var(--warning-soft)] text-[var(--warning-text)]"
                  }`}
                  role="status"
                >
                  <Icon className="mt-0.5 size-4 shrink-0" name="alert" />
                  <p>
                    {!recoveryMode.connected
                      ? "Connect Stripe before configuring recovery delivery."
                      : "Recovery delivery is off because persisted account configuration is unavailable. Review the account setup before enabling delivery."}
                  </p>
                </div>
              ) : null}

              <details className="group rounded-[10px] border border-[var(--border)] bg-[var(--surface)]">
                <summary className="flex list-none cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-[var(--muted-strong)] [&::-webkit-details-marker]:hidden">
                  View details
                  <Icon
                    className="size-4 transition group-open:rotate-180"
                    name="chevron-down"
                  />
                </summary>
                <dl className="grid gap-x-6 gap-y-4 border-t border-[var(--border)] px-4 py-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-xs text-[var(--muted)]">Reply-to</dt>
                    <dd className="mt-1 break-all text-[var(--foreground)]">
                      {settings.email.replyToEmail || "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--muted)]">Support email</dt>
                    <dd className="mt-1 break-all text-[var(--foreground)]">
                      {settings.email.supportEmail || "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--muted)]">Default email tone</dt>
                    <dd className="mt-1 text-[var(--foreground)]">
                      {settings.recovery.defaultEmailTone || "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--muted)]">Time zone</dt>
                    <dd className="mt-1 text-[var(--foreground)]">{recoveryMode.timezone}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--muted)]">Stripe environment</dt>
                    <dd className="mt-1 text-[var(--foreground)]">
                      {recoveryMode.livemode === null
                        ? "Unavailable"
                        : recoveryMode.livemode
                          ? "Live"
                          : "Sandbox"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--muted)]">Stripe account</dt>
                    <dd className="mt-1 break-all text-[var(--foreground)]">
                      {recoveryMode.stripeAccountId || "Not available"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--muted)]">Approved test recipient</dt>
                    <dd className="mt-1 break-all text-[var(--foreground)]">
                      {recoveryMode.approvedTestRecipient || "Not set"}
                    </dd>
                  </div>
                </dl>
              </details>
            </div>
          ) : (
            <p className="text-sm text-[var(--danger)]">
              {recoveryModeMessage || "Unable to load recovery delivery mode."}
            </p>
          )}
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
