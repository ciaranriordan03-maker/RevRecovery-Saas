"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DiceBearAvatar } from "../avatar";
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
  source: "persisted" | "legacy_fallback" | "not_connected";
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

function buildAvatarOptions(identifier: string) {
  const baseSeed = identifier.trim().toLowerCase() || "revrecovery-user";

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
  userId,
}: {
  accountEmail: string;
  initialAvatarSeed: string | null;
  initialFullName: string | null;
  userId: string;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings);
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

        <SettingsSection icon="refresh" title="Recovery Configuration">
          {isLoadingRecoveryMode ? (
            <p className="text-sm text-[var(--muted)]">Loading recovery configuration...</p>
          ) : recoveryMode ? (
            <div className="flex flex-col gap-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Delivery mode
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                    {recoveryModeCopy[recoveryMode.mode].label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    {recoveryModeCopy[recoveryMode.mode].description}
                  </p>
                  {recoveryMode.mode === "test" ? (
                    <p className="mt-2 text-xs text-[var(--muted-strong)]">
                      Test recipient: {recoveryMode.approvedTestRecipient || "Not set"}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Schedule
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                    {getRecoverySchedule(recoveryMode.scheduleId).label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Times use {recoveryMode.timezone}.
                  </p>
                </div>

                <div className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Email identity
                  </p>
                  <dl className="mt-2 space-y-1 text-xs leading-5 text-[var(--muted)]">
                    <div><dt className="inline text-[var(--muted-strong)]">Sender: </dt><dd className="inline">{settings.email.senderName}</dd></div>
                    <div><dt className="inline text-[var(--muted-strong)]">Reply-to: </dt><dd className="inline">{settings.email.replyToEmail}</dd></div>
                    <div><dt className="inline text-[var(--muted-strong)]">Support: </dt><dd className="inline">{settings.email.supportEmail}</dd></div>
                  </dl>
                </div>

                <div className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Default email tone
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                    {settings.recovery.defaultEmailTone}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Applied to recovery messages unless a message is customized.
                  </p>
                </div>
              </div>

              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] p-4 text-xs leading-5 text-[var(--muted)]">
                {!recoveryMode.connected
                  ? "Connect Stripe before configuring recovery delivery."
                  : recoveryMode.source === "legacy_fallback"
                    ? "Current delivery remains live for backward compatibility. These controls become editable only after the Phase 0 migration is separately approved."
                    : `${recoveryMode.livemode ? "Live" : "Sandbox"} Stripe account ${recoveryMode.stripeAccountId ?? ""}.`}
              </div>

              <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--primary-border)] bg-[var(--primary-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-[var(--muted-strong)]">
                  Recovery delivery, schedule, sender identity, and tone are managed in one place.
                </p>
                <Link
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] transition hover:opacity-90"
                  href="/dashboard/recovery?step=customize"
                >
                  Customize recovery
                </Link>
              </div>
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
