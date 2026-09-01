"use client";

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
import { getRecoveryMessageTemplatesForTone } from "../../lib/recovery/message-templates";
import {
  cloneSettings,
  recoveryToneOptions,
  type UserSettings,
} from "../../lib/settings";

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
    JSON.stringify({ email: settings.email, recovery: settings.recovery }) !==
    JSON.stringify({
      email: savedSettings.email,
      recovery: savedSettings.recovery,
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
        throw new Error(getErrorMessage(payload, "Unable to save email settings."));
      }

      const nextSettings = cloneSettings(payload.settings);
      setSettings(nextSettings);
      setSavedSettings(cloneSettings(nextSettings));
      setEmailStatus("Email settings saved.");
      router.refresh();
    } catch (error) {
      setEmailStatus(
        error instanceof Error ? error.message : "Unable to save email settings.",
      );
    } finally {
      setSavingEmail(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form
        className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
        onSubmit={saveRecovery}
      >
        <h2 className="text-base font-medium text-[var(--foreground)]">Recovery delivery</h2>
        <p className="mt-2 text-sm leading-5 text-[var(--muted-strong)]">
          Control who receives recovery messages and when they are scheduled.
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

        <label className="mt-5 block text-sm font-medium text-[var(--foreground)]">
          Schedule
          <select
            className={`${fieldClassName} mt-2`}
            disabled={!editable || savingRecovery}
            onChange={(event) =>
              setRecovery((current) => ({
                ...current,
                scheduleId: event.target.value as RecoveryScheduleId,
              }))
            }
            value={recovery.scheduleId}
          >
            {RECOVERY_SCHEDULES.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>{schedule.label}</option>
            ))}
          </select>
        </label>

        <label className="mt-5 block text-sm font-medium text-[var(--foreground)]">
          Timezone
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

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite" className="text-sm text-[var(--muted-strong)]">{recoveryStatus}</p>
          <Button disabled={!editable || !recoveryChanged || savingRecovery} type="submit">
            {savingRecovery ? "Saving…" : "Save delivery settings"}
          </Button>
        </div>
      </form>

      <form
        className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
        onSubmit={saveEmailSettings}
      >
        <h2 className="text-base font-medium text-[var(--foreground)]">Email identity and messages</h2>
        <p className="mt-2 text-sm leading-5 text-[var(--muted-strong)]">
          Set the sender customers see, reply addresses, and recovery message wording.
        </p>

        <label className="mt-5 block text-sm font-medium text-[var(--foreground)]">
          Email tone
          <select
            className={`${fieldClassName} mt-2`}
            disabled={savingEmail}
            onChange={(event) => {
              const tone = event.target.value;
              setSettings((current) => ({
                ...current,
                recovery: {
                  ...current.recovery,
                  defaultEmailTone: tone,
                  messageTemplates: getRecoveryMessageTemplatesForTone(tone),
                },
              }));
            }}
            value={settings.recovery.defaultEmailTone}
          >
            {recoveryToneOptions.map((tone) => <option key={tone}>{tone}</option>)}
          </select>
          <span className="mt-2 block text-xs font-normal leading-4 text-[var(--muted)]">
            Choosing a tone replaces the three draft messages. You can edit them below before saving.
          </span>
        </label>

        <div className="mt-6 border-t border-[var(--border)] pt-6">
          <h3 className="text-sm font-medium text-[var(--foreground)]">Recovery messages</h3>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            Edit the subject and main message. RevRecovery securely adds the customer greeting,
            outstanding amount, Stripe payment button, and footer when each email is sent.
          </p>
          <div className="mt-4 grid gap-5">
            {settings.recovery.messageTemplates.map((template, index) => (
              <fieldset
                className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] p-4"
                disabled={savingEmail}
                key={template.messageKey}
              >
                <legend className="px-1 text-sm font-medium text-[var(--foreground)]">
                  Email {index + 1}
                </legend>
                <label className="mt-2 block text-xs font-medium text-[var(--foreground)]">
                  Subject
                  <input
                    className={`${fieldClassName} mt-2`}
                    maxLength={120}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        recovery: {
                          ...current.recovery,
                          messageTemplates: current.recovery.messageTemplates.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, subject: event.target.value } : item,
                          ),
                        },
                      }))
                    }
                    required
                    value={template.subject}
                  />
                </label>
                <label className="mt-4 block text-xs font-medium text-[var(--foreground)]">
                  Message
                  <textarea
                    className="mt-2 min-h-32 w-full resize-y rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-sm leading-5 text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[var(--background)] disabled:text-[var(--muted)]"
                    maxLength={1000}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        recovery: {
                          ...current.recovery,
                          messageTemplates: current.recovery.messageTemplates.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, bodyPreview: event.target.value } : item,
                          ),
                        },
                      }))
                    }
                    required
                    value={template.bodyPreview}
                  />
                </label>
              </fieldset>
            ))}
          </div>
        </div>

        <label className="mt-5 block text-sm font-medium text-[var(--foreground)]">
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

        <label className="mt-5 block text-sm font-medium text-[var(--foreground)]">
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

        <label className="mt-5 block text-sm font-medium text-[var(--foreground)]">
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

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite" className="text-sm text-[var(--muted-strong)]">{emailStatus}</p>
          <Button disabled={!emailChanged || savingEmail} type="submit">
            {savingEmail ? "Saving…" : "Save email settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
