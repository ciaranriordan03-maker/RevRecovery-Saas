"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "../button";
import {
  RECOVERY_MODES,
  type RecoveryMode,
} from "../../lib/recovery/mode-policy";
import {
  RECOVERY_SCHEDULES,
  RECOVERY_TIMEZONES,
  type RecoveryScheduleId,
} from "../../lib/recovery/schedule-policy";
import { cloneSettings, type UserSettings } from "../../lib/settings";
import { Icon } from "../ui-icon";

type RecoverySettingsDraft = {
  approvedTestRecipient: string;
  mode: RecoveryMode;
  scheduleId: RecoveryScheduleId;
  timezone: string;
};

type RecoverySettingsFormProps = {
  editable: boolean;
  initialRecoverySettings: RecoverySettingsDraft;
  initialUserSettings: UserSettings;
};

const modeCopy: Record<RecoveryMode, string> = {
  off: "Record failures without sending recovery emails.",
  test: "Send every recovery email only to the approved test recipient.",
  live: "Send recovery emails to the Stripe customer.",
  paused: "Keep cases and schedules, but temporarily stop delivery.",
};

const fieldClassName =
  "h-[50px] w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[var(--background)] disabled:text-[var(--muted)]";

function getErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return fallback;
}

export function RecoverySettingsForm({
  editable,
  initialRecoverySettings,
  initialUserSettings,
}: RecoverySettingsFormProps) {
  const router = useRouter();
  const [recovery, setRecovery] = useState(initialRecoverySettings);
  const [savedRecovery, setSavedRecovery] = useState(initialRecoverySettings);
  const [settings, setSettings] = useState(() => cloneSettings(initialUserSettings));
  const [savedSettings, setSavedSettings] = useState(() =>
    cloneSettings(initialUserSettings),
  );
  const [recoveryStatus, setRecoveryStatus] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [savingRecovery, setSavingRecovery] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  const recoveryChanged = JSON.stringify(recovery) !== JSON.stringify(savedRecovery);
  const emailChanged =
    JSON.stringify({
      email: settings.email,
      segmentation: settings.recovery.segmentation,
    }) !==
    JSON.stringify({
      email: savedSettings.email,
      segmentation: savedSettings.recovery.segmentation,
    });

  async function saveRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingRecovery(true);
    setRecoveryStatus("");

    try {
      const response = await fetch("/api/recovery/settings", {
        body: JSON.stringify({
          approvedTestRecipient:
            recovery.mode === "test" ? recovery.approvedTestRecipient : null,
          mode: recovery.mode,
          scheduleId: recovery.scheduleId,
          timezone: recovery.timezone,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json()) as {
        error?: string;
        recovery?: RecoverySettingsDraft & { approvedTestRecipient: string | null };
      };

      if (!response.ok || !payload.recovery) {
        throw new Error(getErrorMessage(payload, "Unable to save delivery settings."));
      }

      const nextRecovery = {
        approvedTestRecipient: payload.recovery.approvedTestRecipient ?? "",
        mode: payload.recovery.mode,
        scheduleId: payload.recovery.scheduleId,
        timezone: payload.recovery.timezone,
      };
      setRecovery(nextRecovery);
      setSavedRecovery(nextRecovery);
      setRecoveryStatus("Delivery settings saved.");
      router.refresh();
    } catch (error) {
      setRecoveryStatus(
        error instanceof Error ? error.message : "Unable to save delivery settings.",
      );
    } finally {
      setSavingRecovery(false);
    }
  }

  async function saveEmailSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingEmail(true);
    setEmailStatus("");

    try {
      const response = await fetch("/api/settings", {
        body: JSON.stringify({ settings }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json()) as {
        error?: string;
        settings?: UserSettings;
      };

      if (!response.ok || !payload.settings) {
        throw new Error(getErrorMessage(payload, "Unable to save sender settings."));
      }

      const nextSettings = cloneSettings(payload.settings);
      setSettings(nextSettings);
      setSavedSettings(cloneSettings(nextSettings));
      setEmailStatus("Sender and audience settings saved.");
      router.refresh();
    } catch (error) {
      setEmailStatus(
        error instanceof Error ? error.message : "Unable to save sender settings.",
      );
    } finally {
      setSavingEmail(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form
        className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
        id="recovery-delivery"
        onSubmit={saveRecovery}
      >
        <h2 className="text-base font-medium text-[var(--foreground)]">Recovery delivery</h2>
        <p className="mt-2 text-sm leading-5 text-[var(--muted-strong)]">
          Control whether recovery can run and who can receive controlled test messages.
        </p>

        {!editable ? (
          <p className="mt-4 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--muted-strong)]">
            Connect Stripe before changing delivery settings. Existing values are shown below.
          </p>
        ) : null}

        <fieldset className="mt-5" disabled={!editable || savingRecovery}>
          <legend className="text-sm font-medium text-[var(--foreground)]">Mode</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {RECOVERY_MODES.map((mode) => (
              <label
                className={`cursor-pointer rounded-[var(--radius-control)] border p-3 transition ${
                  recovery.mode === mode
                    ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                    : "border-[var(--border)] bg-[var(--background)]"
                }`}
                key={mode}
              >
                <span className="flex items-center gap-2 text-sm font-medium capitalize text-[var(--foreground)]">
                  <input
                    checked={recovery.mode === mode}
                    name="recovery-mode"
                    onChange={() => setRecovery((current) => ({ ...current, mode }))}
                    type="radio"
                    value={mode}
                  />
                  {mode}
                </span>
                <span className="mt-1 block text-xs leading-4 text-[var(--muted)]">{modeCopy[mode]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {recovery.mode === "test" ? (
          <label className="mt-5 block text-sm font-medium text-[var(--foreground)]">
            Approved test recipient
            <input
              className={`${fieldClassName} mt-2`}
              disabled={!editable || savingRecovery}
              onChange={(event) =>
                setRecovery((current) => ({
                  ...current,
                  approvedTestRecipient: event.target.value,
                }))
              }
              placeholder="qa@example.com"
              required
              type="email"
              value={recovery.approvedTestRecipient}
            />
          </label>
        ) : null}

        <details className="group mt-5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)]">
          <summary className="flex min-h-12 list-none cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
            <span>
              Timezone
              <span className="ml-2 text-xs font-normal text-[var(--muted)]">{recovery.timezone}</span>
            </span>
            <Icon className="size-4 text-[var(--muted)] transition-transform group-open:rotate-180" name="chevron-down" />
          </summary>
          <div className="border-t border-[var(--border)] p-4">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Recovery timezone
              <select
                className={`${fieldClassName} mt-2`}
                disabled={!editable || savingRecovery}
                onChange={(event) =>
                  setRecovery((current) => ({ ...current, timezone: event.target.value }))
                }
                value={recovery.timezone}
              >
                {RECOVERY_TIMEZONES.map((timezone) => (
                  <option key={timezone} value={timezone}>{timezone}</option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              Message timing is edited in Messages &amp; timing. This timezone applies to future cases.
            </p>
          </div>
        </details>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite" className="text-sm text-[var(--muted-strong)]">{recoveryStatus}</p>
          <Button disabled={!editable || !recoveryChanged || savingRecovery} type="submit">
            {savingRecovery ? "Saving…" : "Save delivery settings"}
          </Button>
        </div>
      </form>

      <form
        className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
        id="email-identity"
        onSubmit={saveEmailSettings}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-medium text-[var(--foreground)]">Sender and audience</h2>
            <p className="mt-2 max-w-2xl text-sm leading-5 text-[var(--muted-strong)]">
              Set who customers hear from and optionally use different schedules for different invoice types.
            </p>
          </div>
          <Link
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--primary)] transition hover:text-[var(--primary-hover)] focus-visible:rounded-[var(--radius-control)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            href="/dashboard/recovery?view=flow"
          >
            Edit messages
            <Icon className="size-4" name="arrow-right" />
          </Link>
        </div>

        <details className="group mt-5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)]">
          <summary className="flex list-none cursor-pointer items-center justify-between gap-3 px-4 py-4 text-sm font-medium text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
            <span>
              Audience rules
              <span className="ml-2 rounded-[6px] bg-[var(--surface)] px-2 py-1 text-xs font-normal text-[var(--muted)]">Optional</span>
            </span>
            <span aria-hidden className="text-[var(--muted)] transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <fieldset className="border-t border-[var(--border)] p-4" disabled={savingEmail}>
            <legend className="sr-only">Audience segmentation</legend>
            <label className="mt-2 flex items-start gap-3 text-sm text-[var(--foreground)]">
              <input
                checked={settings.recovery.segmentation.enabled}
                className="mt-1"
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    recovery: {
                      ...current.recovery,
                      segmentation: {
                        ...current.recovery.segmentation,
                        enabled: event.target.checked,
                      },
                    },
                  }))
                }
                type="checkbox"
              />
              <span>
                Use different recovery schedules for subscription renewals, standalone invoices,
                and invoices Stripe cannot classify.
              </span>
            </label>
            {settings.recovery.segmentation.enabled ? (
              <div className="mt-4 grid gap-4">
                {([
                  ["subscriptionScheduleId", "Recurring subscriptions"],
                  ["standaloneScheduleId", "Standalone invoices"],
                  ["unknownScheduleId", "Unknown invoice type"],
                ] as const).map(([key, label]) => (
                  <label className="text-xs font-medium text-[var(--foreground)]" key={key}>
                    {label}
                    <select
                      className={`${fieldClassName} mt-2`}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          recovery: {
                            ...current.recovery,
                            segmentation: {
                              ...current.recovery.segmentation,
                              [key]: event.target.value,
                            },
                          },
                        }))
                      }
                      value={settings.recovery.segmentation[key]}
                    >
                      {RECOVERY_SCHEDULES.map((schedule) => (
                        <option key={schedule.id} value={schedule.id}>{schedule.label}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : null}
          </fieldset>
        </details>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Sender name
            <input
              className={`${fieldClassName} mt-2`}
              disabled={savingEmail}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  email: { ...current.email, senderName: event.target.value },
                }))
              }
              required
              value={settings.email.senderName}
            />
          </label>

          <label className="block text-sm font-medium text-[var(--foreground)]">
            Reply-to email
            <input
              className={`${fieldClassName} mt-2`}
              disabled={savingEmail}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  email: { ...current.email, replyToEmail: event.target.value },
                }))
              }
              required
              type="email"
              value={settings.email.replyToEmail}
            />
          </label>

          <label className="block text-sm font-medium text-[var(--foreground)]">
            Support email
            <input
              className={`${fieldClassName} mt-2`}
              disabled={savingEmail}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  email: { ...current.email, supportEmail: event.target.value },
                }))
              }
              required
              type="email"
              value={settings.email.supportEmail}
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite" className="text-sm text-[var(--muted-strong)]">{emailStatus}</p>
          <Button disabled={!emailChanged || savingEmail} type="submit">
            {savingEmail ? "Saving…" : "Save sender & audience"}
          </Button>
        </div>
      </form>
    </div>
  );
}
