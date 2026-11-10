"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  getRecoveryMessageTemplateFieldErrors,
  getRecoveryMessageTemplateValidationError,
  type RecoveryMessageKey,
  type RecoveryMessageTemplate,
} from "../../lib/recovery/message-templates";
import {
  formatRecoveryOffset,
  type RecoveryFlowView,
} from "../../lib/recovery/recovery-view";
import {
  RECOVERY_SCHEDULES,
  getRecoverySchedule,
  type RecoveryScheduleId,
} from "../../lib/recovery/schedule-policy";
import { cloneSettings, type UserSettings } from "../../lib/settings";
import { Icon } from "../ui-icon";

type MobileWorkspaceView = "edit" | "preview";

type RecoveryMessageEditorProps = {
  initialSettings: UserSettings;
  recoveryView: RecoveryFlowView;
};

type RecoveryTimingResponse = {
  approvedTestRecipient: string | null;
  mode: RecoveryFlowView["mode"];
  scheduleId: RecoveryScheduleId;
  timezone: string;
};

const fieldClassName =
  "w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:text-[var(--muted)]";

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

function getTemplate(settings: UserSettings, messageKey: RecoveryMessageKey) {
  return settings.recovery.messageTemplates.find(
    (template) => template.messageKey === messageKey,
  );
}

function getMessageNumber(
  templates: readonly RecoveryMessageTemplate[],
  messageKey: RecoveryMessageKey,
) {
  return templates.findIndex((template) => template.messageKey === messageKey) + 1;
}

function replaceTemplate(
  settings: UserSettings,
  messageKey: RecoveryMessageKey,
  patch: Partial<Pick<RecoveryMessageTemplate, "bodyPreview" | "subject">>,
) {
  return {
    ...settings,
    recovery: {
      ...settings.recovery,
      messageTemplates: settings.recovery.messageTemplates.map((template) =>
        template.messageKey === messageKey
          ? { ...template, ...patch }
          : template,
      ),
    },
  };
}

function CustomerEmailPreview({
  messageNumber,
  settings,
  template,
  timing,
}: {
  messageNumber: number;
  settings: UserSettings;
  template: RecoveryMessageTemplate;
  timing: string;
}) {
  const senderName = settings.email.senderName || "Your billing team";
  const replyAddress = settings.email.replyToEmail || settings.email.supportEmail;

  return (
    <section
      aria-labelledby="customer-preview-heading"
      className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Customer view
          </p>
          <h4
            className="mt-1 text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]"
            id="customer-preview-heading"
          >
            Customer preview
          </h4>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Email {messageNumber} · {timing}
          </p>
        </div>
        <span className="rounded-[6px] bg-[var(--primary-soft)] px-2 py-1 text-xs font-semibold text-[var(--primary)]">
          Preview only
        </span>
      </div>

      <div className="bg-[var(--background)] p-3 sm:p-5">
        <div className="overflow-hidden rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white">
              {senderName.slice(0, 1).toUpperCase() || "R"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                {senderName}
              </p>
              <p className="truncate text-xs text-[var(--muted)]">
                Billing update for Alex Morgan
              </p>
            </div>
            <Icon className="size-4 shrink-0 text-[var(--muted)]" name="mail" />
          </div>

          <dl className="grid gap-3 border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs sm:px-5">
            <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2">
              <dt className="font-medium text-[var(--muted)]">From</dt>
              <dd className="truncate font-medium text-[var(--foreground)]">{senderName}</dd>
            </div>
            <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2">
              <dt className="font-medium text-[var(--muted)]">Subject</dt>
              <dd className="font-medium text-[var(--foreground)]">
                {template.subject || "Your subject line will appear here"}
              </dd>
            </div>
          </dl>

          <div className="px-5 py-6 sm:px-7 sm:py-8">
            <div className="mx-auto max-w-xl text-sm leading-6 text-[var(--muted-strong)]">
              <p>Hi Alex,</p>
              <p className="mt-4 whitespace-pre-wrap">
                {template.bodyPreview || "Your message will appear here."}
              </p>

              <div className="mt-6 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <p className="text-xs text-[var(--muted)]">Amount outstanding</p>
                <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">€79.00</p>
              </div>

              <span className="mt-5 inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-5 text-sm font-semibold text-white">
                Update payment details
              </span>

              {replyAddress ? (
                <p className="mt-6 text-xs leading-5 text-[var(--muted)]">
                  Need help? Reply to this email or contact {replyAddress}.
                </p>
              ) : null}
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-[var(--surface-muted)] px-5 py-4 text-center text-xs leading-5 text-[var(--muted)]">
            RevRecovery securely adds the customer greeting, amount, Stripe payment
            button and footer when the email is prepared.
          </div>
        </div>
      </div>
    </section>
  );
}

export function RecoveryMessageEditor({
  initialSettings,
  recoveryView,
}: RecoveryMessageEditorProps) {
  const router = useRouter();
  const initialMessageKey =
    initialSettings.recovery.messageTemplates[0]?.messageKey ?? null;
  const [draftSettings, setDraftSettings] = useState(() =>
    cloneSettings(initialSettings),
  );
  const [savedSettings, setSavedSettings] = useState(() =>
    cloneSettings(initialSettings),
  );
  const [selectedMessageKey, setSelectedMessageKey] =
    useState<RecoveryMessageKey | null>(initialMessageKey);
  const [mobileWorkspaceView, setMobileWorkspaceView] =
    useState<MobileWorkspaceView>("edit");
  const [savingMessageKey, setSavingMessageKey] =
    useState<RecoveryMessageKey | null>(null);
  const [draftScheduleId, setDraftScheduleId] =
    useState<RecoveryScheduleId>(recoveryView.scheduleId);
  const [savedScheduleId, setSavedScheduleId] =
    useState<RecoveryScheduleId>(recoveryView.scheduleId);
  const [showTimingEditor, setShowTimingEditor] = useState(false);
  const [savingTiming, setSavingTiming] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [timingError, setTimingError] = useState("");
  const [timingStatus, setTimingStatus] = useState("");

  const hasUnsavedMessageChanges = useMemo(
    () =>
      JSON.stringify(draftSettings.recovery.messageTemplates) !==
      JSON.stringify(savedSettings.recovery.messageTemplates),
    [draftSettings.recovery.messageTemplates, savedSettings.recovery.messageTemplates],
  );
  const hasUnsavedTimingChanges = draftScheduleId !== savedScheduleId;
  const hasUnsavedChanges =
    hasUnsavedMessageChanges || hasUnsavedTimingChanges;
  const draftSchedule = getRecoverySchedule(draftScheduleId);
  const draftTimings = draftSchedule.offsetsMinutes.map(formatRecoveryOffset);

  const selectedTemplate = selectedMessageKey
    ? getTemplate(draftSettings, selectedMessageKey)
    : undefined;
  const selectedMessageNumber = selectedMessageKey
    ? getMessageNumber(
        draftSettings.recovery.messageTemplates,
        selectedMessageKey,
      )
    : 0;
  const selectedTiming =
    draftTimings[selectedMessageNumber - 1] ?? "Timing unavailable";
  const selectedFieldErrors = selectedTemplate
    ? getRecoveryMessageTemplateFieldErrors(
        selectedTemplate,
        selectedMessageNumber,
      )
    : {};
  const selectedIsSaving = savingMessageKey === selectedMessageKey;

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function warnBeforeLinkNavigation(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      const target = event.target;
      const anchor = target instanceof Element ? target.closest("a[href]") : null;

      if (
        !anchor ||
        anchor.getAttribute("target") === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      if (
        !window.confirm(
          "Leave this page and discard your unsaved message or timing changes?",
        )
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", warnBeforeLinkNavigation, true);

    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", warnBeforeLinkNavigation, true);
    };
  }, [hasUnsavedChanges]);

  function resetMessage(messageKey: RecoveryMessageKey) {
    const savedTemplate = getTemplate(savedSettings, messageKey);

    if (!savedTemplate) {
      return;
    }

    setDraftSettings((current) =>
      replaceTemplate(current, messageKey, savedTemplate),
    );
  }

  function messageHasChanges(messageKey: RecoveryMessageKey) {
    return (
      JSON.stringify(getTemplate(draftSettings, messageKey)) !==
      JSON.stringify(getTemplate(savedSettings, messageKey))
    );
  }

  function selectMessage(messageKey: RecoveryMessageKey) {
    if (selectedMessageKey === messageKey) {
      setMobileWorkspaceView("edit");
      return;
    }

    if (
      selectedMessageKey &&
      messageHasChanges(selectedMessageKey) &&
      !window.confirm("Discard your unsaved changes before opening another message?")
    ) {
      return;
    }

    if (selectedMessageKey) {
      resetMessage(selectedMessageKey);
    }

    setSelectedMessageKey(messageKey);
    setMobileWorkspaceView("edit");
    setShowValidationErrors(false);
    setError("");
    setStatus("");
  }

  function cancelEditing(messageKey: RecoveryMessageKey) {
    resetMessage(messageKey);
    setShowValidationErrors(false);
    setError("");
    setStatus("");
  }

  function toggleTimingEditor() {
    if (
      showTimingEditor &&
      hasUnsavedTimingChanges &&
      !window.confirm("Discard your unsaved timing changes?")
    ) {
      return;
    }

    if (showTimingEditor) {
      setDraftScheduleId(savedScheduleId);
      setTimingError("");
      setTimingStatus("");
    }

    setShowTimingEditor((current) => !current);
  }

  function cancelTimingEditing() {
    setDraftScheduleId(savedScheduleId);
    setTimingError("");
    setTimingStatus("");
    setShowTimingEditor(false);
  }

  async function saveTiming(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTimingError("");
    setTimingStatus("");

    if (!recoveryView.editable) {
      setTimingError(
        "Message timing is temporarily unavailable. Review the advanced recovery settings and try again.",
      );
      return;
    }

    const selectedSchedule = RECOVERY_SCHEDULES.find(
      (schedule) => schedule.id === draftScheduleId,
    );

    if (!selectedSchedule) {
      setTimingError("Choose one of the available message schedules.");
      return;
    }

    setSavingTiming(true);

    try {
      const response = await fetch("/api/recovery/settings", {
        body: JSON.stringify({
          approvedTestRecipient:
            recoveryView.mode === "test"
              ? recoveryView.approvedTestRecipient
              : null,
          mode: recoveryView.mode,
          scheduleId: selectedSchedule.id,
          timezone: recoveryView.timezone,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json()) as {
        error?: string;
        recovery?: RecoveryTimingResponse;
      };

      if (!response.ok || !payload.recovery) {
        throw new Error(
          getErrorMessage(payload, "Unable to save message timing."),
        );
      }

      setDraftScheduleId(payload.recovery.scheduleId);
      setSavedScheduleId(payload.recovery.scheduleId);
      setTimingStatus(
        "Timing saved. Future recovery cases will use this schedule.",
      );
      router.refresh();
    } catch (saveError) {
      setTimingError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save message timing.",
      );
    } finally {
      setSavingTiming(false);
    }
  }

  async function saveMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setShowValidationErrors(true);

    if (!selectedTemplate || !selectedMessageKey || selectedMessageNumber < 1) {
      setError("This recovery message could not be found. Refresh the page and try again.");
      return;
    }

    const validationError = getRecoveryMessageTemplateValidationError(
      selectedTemplate,
      selectedMessageNumber,
    );

    if (validationError) {
      return;
    }

    setSavingMessageKey(selectedMessageKey);

    try {
      const response = await fetch("/api/settings", {
        body: JSON.stringify({ settings: draftSettings }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json()) as {
        error?: string;
        settings?: UserSettings;
      };

      if (!response.ok || !payload.settings) {
        throw new Error(
          getErrorMessage(payload, "Unable to save this recovery message."),
        );
      }

      const nextSettings = cloneSettings(payload.settings);
      setDraftSettings(nextSettings);
      setSavedSettings(cloneSettings(nextSettings));
      setShowValidationErrors(false);
      setMobileWorkspaceView("preview");
      setStatus(
        `Email ${selectedMessageNumber} saved. Future recovery cases will use this copy.`,
      );
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save this recovery message.",
      );
    } finally {
      setSavingMessageKey(null);
    }
  }

  function updateSelectedTemplate(
    patch: Partial<Pick<RecoveryMessageTemplate, "bodyPreview" | "subject">>,
  ) {
    if (!selectedMessageKey) {
      return;
    }

    setDraftSettings((current) =>
      replaceTemplate(current, selectedMessageKey, patch),
    );
    setError("");
    setStatus("");
  }

  if (!selectedMessageKey || !selectedTemplate) {
    return (
      <section
        aria-labelledby="message-editor-heading"
        className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5"
      >
        <h3 className="text-base font-semibold text-[var(--foreground)]" id="message-editor-heading">
          No recovery messages available
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Your saved message sequence could not be loaded. Review the advanced settings or
          refresh the page before making changes.
        </p>
        <Link
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)]"
          href="/dashboard/recovery?step=customize#email-identity"
        >
          Open advanced message settings
          <Icon className="size-4" name="arrow-right" />
        </Link>
      </section>
    );
  }

  const selectedIsDirty = messageHasChanges(selectedMessageKey);
  const subjectErrorId = `subject-error-${selectedMessageKey}`;
  const messageErrorId = `message-error-${selectedMessageKey}`;

  return (
    <section aria-labelledby="message-editor-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Customer messages
          </p>
          <h3
            className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]"
            id="message-editor-heading"
          >
            Edit your recovery sequence
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Choose a message, update the wording and preview how it will feel to a customer.
          </p>
        </div>
        <Link
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--muted-strong)] transition hover:text-[var(--foreground)]"
          href="/dashboard/recovery?step=customize#email-identity"
        >
          Advanced message settings
          <Icon className="size-4" name="arrow-right" />
        </Link>
      </div>

      <div className="flex items-start gap-3 rounded-[var(--radius-control)] border border-[var(--primary-border)] bg-[var(--primary-soft)] px-4 py-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--primary)]">
          <Icon className="size-3.5" name="lock" />
        </span>
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">
            Message and timing changes do not send anything
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">
            Saved changes apply to future cases. Active sequences keep their original copy,
            timing and delivery settings.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <section
            aria-labelledby="sequence-heading"
            className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
              <div>
                <h4 className="text-sm font-semibold text-[var(--foreground)]" id="sequence-heading">
                  Three-message sequence
                </h4>
                <p className="mt-0.5 text-xs text-[var(--muted)]">Select a message to edit</p>
              </div>
              <button
                aria-controls="recovery-timing-editor"
                aria-expanded={showTimingEditor}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                onClick={toggleTimingEditor}
                type="button"
              >
                <Icon className="size-3.5" name="clock" />
                {showTimingEditor ? "Close timing" : "Edit timing"}
                {hasUnsavedTimingChanges ? (
                  <span className="size-1.5 rounded-full bg-[var(--warning-text)]" />
                ) : null}
              </button>
            </div>

            {showTimingEditor ? (
              <form
                className="border-b border-[var(--border)] bg-[var(--background)] p-4 sm:p-5"
                id="recovery-timing-editor"
                onSubmit={saveTiming}
              >
                <fieldset disabled={savingTiming || !recoveryView.editable}>
                  <legend className="text-sm font-semibold text-[var(--foreground)]">
                    Choose message timing
                  </legend>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Select one supported sequence. Messages always stay in order.
                  </p>

                  <div className="mt-3 grid gap-2">
                    {RECOVERY_SCHEDULES.map((schedule) => {
                      const timings = schedule.offsetsMinutes.map(formatRecoveryOffset);
                      const isSelected = draftScheduleId === schedule.id;

                      return (
                        <label
                          className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border px-3 py-3 transition focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:ring-offset-2 ${
                            isSelected
                              ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                              : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                          } has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60`}
                          key={schedule.id}
                        >
                          <input
                            checked={isSelected}
                            className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                            name="recovery-schedule"
                            onChange={() => {
                              setDraftScheduleId(schedule.id);
                              setTimingError("");
                              setTimingStatus("");
                            }}
                            type="radio"
                            value={schedule.id}
                          />
                          <span className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
                            {timings.map((timing, index) => (
                              <span className="min-w-0" key={`${schedule.id}-${timing}`}>
                                <span className="block text-[11px] font-medium text-[var(--muted)]">
                                  Email {index + 1}
                                </span>
                                <span className="mt-0.5 block text-xs font-semibold text-[var(--foreground)]">
                                  {timing}
                                </span>
                              </span>
                            ))}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {!recoveryView.editable ? (
                  <div
                    className="mt-3 flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--warning)] bg-[var(--warning-soft)] px-3 py-2.5 text-xs leading-5 text-[var(--warning-text)]"
                    role="status"
                  >
                    <Icon className="mt-0.5 size-3.5 shrink-0" name="alert" />
                    Message timing is temporarily unavailable. Review the advanced recovery
                    settings before making changes.
                  </div>
                ) : null}

                {timingError ? (
                  <div
                    className="mt-3 flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2.5 text-xs leading-5 text-[var(--danger)]"
                    role="alert"
                  >
                    <Icon className="mt-0.5 size-3.5 shrink-0" name="alert" />
                    <p>{timingError}</p>
                  </div>
                ) : null}

                {timingStatus ? (
                  <div
                    aria-live="polite"
                    className="mt-3 flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--success-badge)] bg-[var(--success-soft)] px-3 py-2.5 text-xs leading-5 text-[var(--success)]"
                    role="status"
                  >
                    <Icon className="mt-0.5 size-3.5 shrink-0" name="check-circle" />
                    <p>{timingStatus}</p>
                  </div>
                ) : null}

                <div className="mt-4 border-t border-[var(--border)] pt-4">
                  <div className="flex flex-col gap-1 text-xs leading-5 text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
                    <p>
                      Times use {recoveryView.timezone}.{" "}
                      <Link
                        className="font-semibold text-[var(--primary)] hover:underline"
                        href="/dashboard/recovery?step=customize#recovery-delivery"
                      >
                        Advanced settings
                      </Link>
                    </p>
                    <p>
                      Future cases use the new timing; active sequences keep their original
                      schedule.
                    </p>
                  </div>

                  <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={savingTiming}
                      onClick={cancelTimingEditing}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={
                        !hasUnsavedTimingChanges ||
                        savingTiming ||
                        !recoveryView.editable
                      }
                      type="submit"
                    >
                      {savingTiming ? "Saving…" : "Save timing"}
                    </button>
                  </div>
                </div>
              </form>
            ) : null}

            <div className="grid gap-px bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-1">
              {draftSettings.recovery.messageTemplates.map((template, index) => {
                const messageNumber = index + 1;
                const timing = draftTimings[index] ?? "Timing unavailable";
                const isSelected = selectedMessageKey === template.messageKey;
                const isDirty = messageHasChanges(template.messageKey);

                return (
                  <button
                    aria-current={isSelected ? "true" : undefined}
                    className={`group min-w-0 bg-[var(--surface)] px-4 py-4 text-left transition sm:px-3 lg:px-5 ${
                      isSelected
                        ? "shadow-[inset_3px_0_0_var(--primary)]"
                        : "hover:bg-[var(--surface-muted)]"
                    }`}
                    key={template.messageKey}
                    onClick={() => selectMessage(template.messageKey)}
                    type="button"
                  >
                    <span className="flex items-start gap-3">
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] text-sm font-semibold ${
                          isSelected
                            ? "bg-[var(--primary)] text-white"
                            : "bg-[var(--primary-soft)] text-[var(--primary)]"
                        }`}
                      >
                        {messageNumber}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold text-[var(--foreground)]">
                            Email {messageNumber}
                          </span>
                          <span className="rounded-[6px] bg-[var(--surface-muted)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--muted-strong)]">
                            {timing}
                          </span>
                          {isDirty ? (
                            <span className="rounded-[6px] bg-[var(--warning-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--warning-text)]">
                              Unsaved
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1.5 block truncate text-xs font-medium text-[var(--foreground)]">
                          {template.subject || "Subject needed"}
                        </span>
                        <span className="mt-1 hidden line-clamp-2 text-xs leading-5 text-[var(--muted)] lg:block">
                          {template.bodyPreview || "Message copy needed"}
                        </span>
                      </span>
                      <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-[var(--primary)] lg:flex">
                        {isSelected ? "Editing" : "Edit"}
                        <Icon className="size-3.5" name="edit" />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div
            aria-label="Message workspace view"
            className="grid grid-cols-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-1 lg:hidden"
            role="tablist"
          >
            {(["edit", "preview"] as const).map((view) => (
              <button
                aria-controls={view === "edit" ? "message-edit-panel" : "message-preview-panel"}
                aria-selected={mobileWorkspaceView === view}
                className={`rounded-[6px] px-3 py-2 text-sm font-semibold capitalize transition ${
                  mobileWorkspaceView === view
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted-strong)] hover:bg-[var(--surface-muted)]"
                }`}
                key={view}
                onClick={() => setMobileWorkspaceView(view)}
                role="tab"
                type="button"
              >
                {view}
              </button>
            ))}
          </div>

          <section
            aria-labelledby="edit-message-heading"
            className={`${mobileWorkspaceView === "edit" ? "block" : "hidden"} overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] lg:block`}
            id="message-edit-panel"
            role="tabpanel"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
                  Email {selectedMessageNumber} · {selectedTiming}
                </p>
                <h4
                  className="mt-1 text-base font-semibold text-[var(--foreground)]"
                  id="edit-message-heading"
                >
                  Edit message copy
                </h4>
              </div>
              <span className="rounded-[6px] bg-[var(--surface-muted)] px-2 py-1 text-xs font-medium text-[var(--muted-strong)]">
                Copy only
              </span>
            </div>

            <form className="p-4 sm:p-5" onSubmit={saveMessage}>
              <div className="grid gap-5">
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Subject line
                  <input
                    aria-describedby={`${showValidationErrors && selectedFieldErrors.subject ? `${subjectErrorId} ` : ""}subject-count-${selectedMessageKey}`}
                    aria-invalid={showValidationErrors && Boolean(selectedFieldErrors.subject)}
                    className={`${fieldClassName} mt-2 h-[46px]`}
                    disabled={selectedIsSaving}
                    maxLength={120}
                    onChange={(event) => updateSelectedTemplate({ subject: event.target.value })}
                    required
                    value={selectedTemplate.subject}
                  />
                  <span className="mt-1.5 flex items-start justify-between gap-3 text-xs font-normal">
                    <span className="text-[var(--danger)]" id={subjectErrorId}>
                      {showValidationErrors ? selectedFieldErrors.subject : ""}
                    </span>
                    <span
                      className="ml-auto shrink-0 text-[var(--muted)]"
                      id={`subject-count-${selectedMessageKey}`}
                    >
                      {selectedTemplate.subject.length}/120
                    </span>
                  </span>
                </label>

                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Message
                  <textarea
                    aria-describedby={`${showValidationErrors && selectedFieldErrors.bodyPreview ? `${messageErrorId} ` : ""}message-help-${selectedMessageKey}`}
                    aria-invalid={showValidationErrors && Boolean(selectedFieldErrors.bodyPreview)}
                    className={`${fieldClassName} mt-2 min-h-40 resize-y py-3 leading-6`}
                    disabled={selectedIsSaving}
                    maxLength={1000}
                    onChange={(event) =>
                      updateSelectedTemplate({ bodyPreview: event.target.value })
                    }
                    required
                    value={selectedTemplate.bodyPreview}
                  />
                  <span className="mt-1.5 block text-xs font-normal leading-5 text-[var(--danger)]" id={messageErrorId}>
                    {showValidationErrors ? selectedFieldErrors.bodyPreview : ""}
                  </span>
                  <span
                    className="mt-1 flex flex-col gap-1 text-xs font-normal leading-5 text-[var(--muted)] sm:flex-row sm:justify-between"
                    id={`message-help-${selectedMessageKey}`}
                  >
                    <span>
                      Greeting, amount, Stripe payment button and footer are added automatically.
                    </span>
                    <span className="shrink-0 text-right">
                      {selectedTemplate.bodyPreview.length}/1000
                    </span>
                  </span>
                </label>
              </div>

              {error ? (
                <div
                  className="mt-5 flex items-start gap-3 rounded-[var(--radius-control)] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]"
                  role="alert"
                >
                  <Icon className="mt-0.5 size-4 shrink-0" name="alert" />
                  <div>
                    <p>{error}</p>
                    <Link
                      className="mt-2 inline-flex font-semibold underline underline-offset-2"
                      href="/dashboard/recovery?step=customize#email-identity"
                    >
                      Review advanced email settings
                    </Link>
                  </div>
                </div>
              ) : null}

              {status ? (
                <div
                  aria-live="polite"
                  className="mt-5 flex items-start gap-3 rounded-[var(--radius-control)] border border-[var(--success-badge)] bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]"
                  role="status"
                >
                  <Icon className="mt-0.5 size-4 shrink-0" name="check-circle" />
                  <p>{status}</p>
                </div>
              ) : null}

              <div className="mt-5 flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-[var(--muted)]">
                  Saving updates copy only. It does not send an email or enable delivery.
                </p>
                <div className="flex gap-2 sm:shrink-0">
                  <button
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                    disabled={!selectedIsDirty || selectedIsSaving}
                    onClick={() => cancelEditing(selectedMessageKey)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                    disabled={!selectedIsDirty || selectedIsSaving}
                    type="submit"
                  >
                    {selectedIsSaving ? "Saving…" : "Save message"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>

        <div
          className={`${mobileWorkspaceView === "preview" ? "block" : "hidden"} lg:sticky lg:top-5 lg:block`}
          id="message-preview-panel"
          role="tabpanel"
        >
          <CustomerEmailPreview
            messageNumber={selectedMessageNumber}
            settings={draftSettings}
            template={selectedTemplate}
            timing={selectedTiming}
          />
        </div>
      </div>
    </section>
  );
}
