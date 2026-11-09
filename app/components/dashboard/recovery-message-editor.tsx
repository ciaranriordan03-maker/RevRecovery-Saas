"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getRecoveryMessageTemplateValidationError,
  type RecoveryMessageKey,
  type RecoveryMessageTemplate,
} from "../../lib/recovery/message-templates";
import type { RecoveryFlowView } from "../../lib/recovery/recovery-view";
import { cloneSettings, type UserSettings } from "../../lib/settings";
import { Icon } from "../ui-icon";

type EditorMode = "edit" | "preview";

type RecoveryMessageEditorProps = {
  initialSettings: UserSettings;
  recoveryView: RecoveryFlowView;
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

function getTemplate(
  settings: UserSettings,
  messageKey: RecoveryMessageKey,
) {
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
}: {
  messageNumber: number;
  settings: UserSettings;
  template: RecoveryMessageTemplate;
}) {
  const senderName = settings.email.senderName || "Your billing team";
  const replyAddress = settings.email.replyToEmail || settings.email.supportEmail;

  return (
    <section
      aria-label={`Example customer preview for Email ${messageNumber}`}
      className="overflow-hidden rounded-[var(--radius-dashboard-card)] border border-[var(--border)] bg-[var(--background)]"
    >
      <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white">
            {senderName.slice(0, 1).toUpperCase() || "R"}
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">{senderName}</p>
            <p className="text-xs text-[var(--muted)]">Example customer email</p>
          </div>
        </div>
        <span className="w-fit rounded-[6px] bg-[var(--surface-muted)] px-2 py-1 text-xs font-medium text-[var(--muted-strong)]">
          Preview only
        </span>
      </div>

      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--muted)]">
          Subject
        </p>
        <h4 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">
          {template.subject || "Your subject line will appear here"}
        </h4>

        <div className="mt-7 max-w-2xl text-sm leading-6 text-[var(--muted-strong)]">
          <p>Hi Alex,</p>
          <p className="mt-4 whitespace-pre-wrap">
            {template.bodyPreview || "Your message will appear here."}
          </p>
          <div className="mt-5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs text-[var(--muted)]">Amount outstanding</p>
            <p className="mt-1 text-base font-semibold text-[var(--foreground)]">€79.00</p>
          </div>
          <span className="mt-5 inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-5 text-sm font-semibold text-white">
            Update payment details
          </span>
          <p className="mt-6 text-xs leading-5 text-[var(--muted)]">
            RevRecovery adds the customer greeting, amount, secure Stripe payment button,
            and footer automatically when the message is prepared.
          </p>
          {replyAddress ? (
            <p className="mt-2 text-xs text-[var(--muted)]">Replies go to {replyAddress}.</p>
          ) : null}
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
  const [draftSettings, setDraftSettings] = useState(() =>
    cloneSettings(initialSettings),
  );
  const [savedSettings, setSavedSettings] = useState(() =>
    cloneSettings(initialSettings),
  );
  const [openMessageKey, setOpenMessageKey] =
    useState<RecoveryMessageKey | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("edit");
  const [savingMessageKey, setSavingMessageKey] =
    useState<RecoveryMessageKey | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const hasUnsavedChanges = useMemo(
    () =>
      JSON.stringify(draftSettings.recovery.messageTemplates) !==
      JSON.stringify(savedSettings.recovery.messageTemplates),
    [draftSettings.recovery.messageTemplates, savedSettings.recovery.messageTemplates],
  );

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

      if (!window.confirm("Leave this page and discard your unsaved message changes?")) {
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

  function openMessage(messageKey: RecoveryMessageKey) {
    if (openMessageKey === messageKey) {
      if (
        messageHasChanges(messageKey) &&
        !window.confirm("Discard your unsaved changes to this message?")
      ) {
        return;
      }

      resetMessage(messageKey);
      setOpenMessageKey(null);
      setError("");
      setStatus("");
      return;
    }

    if (
      openMessageKey &&
      messageHasChanges(openMessageKey) &&
      !window.confirm("Discard your unsaved changes before opening another message?")
    ) {
      return;
    }

    if (openMessageKey) {
      resetMessage(openMessageKey);
    }

    setOpenMessageKey(messageKey);
    setEditorMode("edit");
    setError("");
    setStatus("");
  }

  function cancelEditing(messageKey: RecoveryMessageKey) {
    resetMessage(messageKey);
    setOpenMessageKey(null);
    setEditorMode("edit");
    setError("");
    setStatus("");
  }

  async function saveMessage(
    event: FormEvent<HTMLFormElement>,
    messageKey: RecoveryMessageKey,
  ) {
    event.preventDefault();
    setError("");
    setStatus("");

    const template = getTemplate(draftSettings, messageKey);
    const messageNumber = getMessageNumber(
      draftSettings.recovery.messageTemplates,
      messageKey,
    );

    if (!template || messageNumber < 1) {
      setError("This recovery message could not be found. Refresh the page and try again.");
      return;
    }

    const validationError = getRecoveryMessageTemplateValidationError(
      template,
      messageNumber,
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    setSavingMessageKey(messageKey);

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
      setEditorMode("preview");
      setStatus(
        `Email ${messageNumber} saved. Future recovery cases will use this copy.`,
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
            Your three-email sequence
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Open an email to edit its wording or preview what a customer will see.
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
            Safe to edit—nothing is sent from this screen
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">
            Saved wording applies to future cases. Active sequences keep the copy they started with,
            and your timing and delivery settings stay unchanged.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {draftSettings.recovery.messageTemplates.map((template, index) => {
          const messageNumber = index + 1;
          const timing = recoveryView.messages[index]?.timing ?? "Timing unavailable";
          const isOpen = openMessageKey === template.messageKey;
          const isSaving = savingMessageKey === template.messageKey;
          const isDirty = messageHasChanges(template.messageKey);
          const panelId = `recovery-message-panel-${template.messageKey}`;

          return (
            <article
              className={`overflow-hidden rounded-[var(--radius-dashboard-card)] border bg-[var(--surface)] transition-shadow ${
                isOpen
                  ? "border-[var(--primary-border)] shadow-[var(--shadow-card)]"
                  : "border-[var(--border)] hover:border-[var(--border-strong)]"
              }`}
              key={template.messageKey}
            >
              <button
                aria-controls={panelId}
                aria-expanded={isOpen}
                className="flex w-full items-start gap-3 px-4 py-4 text-left sm:items-center sm:gap-4 sm:px-5"
                onClick={() => openMessage(template.messageKey)}
                type="button"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary-soft)] text-sm font-semibold text-[var(--primary)]">
                  {messageNumber}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      Email {messageNumber}
                    </span>
                    <span className="rounded-[6px] bg-[var(--surface-muted)] px-2 py-1 text-xs font-medium text-[var(--muted-strong)]">
                      {timing}
                    </span>
                    {isDirty ? (
                      <span className="rounded-[6px] bg-[var(--warning-soft)] px-2 py-1 text-xs font-medium text-[var(--warning-text)]">
                        Unsaved
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block truncate text-sm font-medium text-[var(--foreground)]">
                    {template.subject}
                  </span>
                  <span className="mt-1 block line-clamp-2 text-xs leading-5 text-[var(--muted)] sm:line-clamp-1">
                    {template.bodyPreview}
                  </span>
                </span>
                <span className="mt-1 flex shrink-0 items-center gap-2 text-sm font-medium text-[var(--primary)] sm:mt-0">
                  <span className="hidden sm:inline">{isOpen ? "Close" : "Edit"}</span>
                  <Icon
                    className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    name="chevron-down"
                  />
                </span>
              </button>

              {isOpen ? (
                <div
                  className="border-t border-[var(--border)] bg-[var(--background)] p-4 sm:p-5"
                  id={panelId}
                >
                  <div
                    aria-label={`Email ${messageNumber} view`}
                    className="mb-5 inline-flex rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-1"
                    role="group"
                  >
                    {(["edit", "preview"] as const).map((mode) => (
                      <button
                        aria-pressed={editorMode === mode}
                        className={`rounded-[6px] px-3 py-2 text-xs font-semibold capitalize transition ${
                          editorMode === mode
                            ? "bg-[var(--primary)] text-white"
                            : "text-[var(--muted-strong)] hover:bg-[var(--surface-muted)]"
                        }`}
                        key={mode}
                        onClick={() => {
                          setEditorMode(mode);
                          setError("");
                          setStatus("");
                        }}
                        type="button"
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  {editorMode === "edit" ? (
                    <form onSubmit={(event) => saveMessage(event, template.messageKey)}>
                      <div className="grid gap-5">
                        <label className="block text-sm font-medium text-[var(--foreground)]">
                          Subject line
                          <input
                            aria-describedby={`subject-count-${template.messageKey}`}
                            className={`${fieldClassName} mt-2 h-[46px]`}
                            disabled={isSaving}
                            maxLength={120}
                            onChange={(event) => {
                              setDraftSettings((current) =>
                                replaceTemplate(current, template.messageKey, {
                                  subject: event.target.value,
                                }),
                              );
                              setError("");
                              setStatus("");
                            }}
                            required
                            value={template.subject}
                          />
                          <span
                            className="mt-1.5 block text-right text-xs font-normal text-[var(--muted)]"
                            id={`subject-count-${template.messageKey}`}
                          >
                            {template.subject.length}/120
                          </span>
                        </label>

                        <label className="block text-sm font-medium text-[var(--foreground)]">
                          Message
                          <textarea
                            aria-describedby={`message-help-${template.messageKey}`}
                            className={`${fieldClassName} mt-2 min-h-36 resize-y py-3 leading-6`}
                            disabled={isSaving}
                            maxLength={1000}
                            onChange={(event) => {
                              setDraftSettings((current) =>
                                replaceTemplate(current, template.messageKey, {
                                  bodyPreview: event.target.value,
                                }),
                              );
                              setError("");
                              setStatus("");
                            }}
                            required
                            value={template.bodyPreview}
                          />
                          <span
                            className="mt-1.5 flex flex-col gap-1 text-xs font-normal leading-5 text-[var(--muted)] sm:flex-row sm:justify-between"
                            id={`message-help-${template.messageKey}`}
                          >
                            <span>
                              Greeting, amount, secure payment button and footer are added automatically.
                            </span>
                            <span className="shrink-0 text-right">
                              {template.bodyPreview.length}/1000
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

                      <div className="mt-5 flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs leading-5 text-[var(--muted)]">
                          Saving updates copy only. It does not send an email or enable delivery.
                        </p>
                        <div className="flex gap-2 sm:shrink-0">
                          <button
                            className="inline-flex h-10 flex-1 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--muted-strong)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                            disabled={isSaving}
                            onClick={() => cancelEditing(template.messageKey)}
                            type="button"
                          >
                            Cancel
                          </button>
                          <button
                            className="inline-flex h-10 flex-1 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                            disabled={!isDirty || isSaving}
                            type="submit"
                          >
                            {isSaving ? "Saving…" : "Save message"}
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <CustomerEmailPreview
                      messageNumber={messageNumber}
                      settings={draftSettings}
                      template={template}
                    />
                  )}

                  <p
                    aria-live="polite"
                    className={`mt-4 text-sm ${status ? "text-[var(--success)]" : "text-[var(--muted)]"}`}
                  >
                    {status}
                  </p>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
