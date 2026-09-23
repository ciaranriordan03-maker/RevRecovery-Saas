import type {
  RecoveryCaseEventSource,
  RecoveryCaseTimelineEvent,
} from "../server/recovery-case-events";

export type RecoveryCaseTimelineView = {
  detail: string;
  eventType: string;
  id: string;
  occurredAt: string;
  sourceLabel: string;
  title: string;
  tone: "danger" | "neutral" | "success" | "warning";
};

function stringValue(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatLabel(value: string) {
  return value
    .replaceAll(".", "_")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sourceLabel(source: RecoveryCaseEventSource) {
  const labels: Record<RecoveryCaseEventSource, string> = {
    case_transition: "RevRecovery",
    provider_message_event: "Email provider",
    recovery_message_schedule: "RevRecovery",
    recovery_message_status: "RevRecovery",
    stripe: "Stripe",
  };
  return labels[source];
}

function stepDetail(metadata: Record<string, unknown>, action: string) {
  const step = numberValue(metadata, "step_number");
  return step === null ? action : `Recovery email ${step} ${action}.`;
}

export function buildRecoveryCaseTimelineView(
  event: RecoveryCaseTimelineEvent,
): RecoveryCaseTimelineView {
  const base = {
    eventType: event.eventType,
    id: event.id,
    occurredAt: event.occurredAt,
    sourceLabel: sourceLabel(event.source),
  };

  if (event.eventType === "invoice.payment_failed") {
    const attempt = numberValue(event.metadata, "attempt_count");
    const decline = stringValue(event.metadata, "decline_code");
    return {
      ...base,
      detail: [
        attempt === null ? null : `Stripe recorded payment attempt ${attempt}.`,
        decline ? `Decline code: ${formatLabel(decline)}.` : null,
      ].filter(Boolean).join(" ") || "Stripe reported that the invoice payment failed.",
      title: "Payment failed",
      tone: "danger",
    };
  }

  if (event.eventType === "invoice.paid" || event.eventType === "invoice.payment_succeeded") {
    return {
      ...base,
      detail: "Stripe confirmed that the invoice was paid.",
      title: "Payment recovered",
      tone: "success",
    };
  }

  if (event.eventType === "case_status_changed") {
    const from = stringValue(event.metadata, "from_status");
    const to = stringValue(event.metadata, "to_status");
    const reason = stringValue(event.metadata, "reason");
    return {
      ...base,
      detail: [
        from && to
          ? `Status changed from ${formatLabel(from)} to ${formatLabel(to)}.`
          : to
            ? `Status changed to ${formatLabel(to)}.`
            : "The recovery case status changed.",
        reason ? `Reason: ${formatLabel(reason)}.` : null,
      ].filter(Boolean).join(" "),
      title: "Recovery status updated",
      tone: to === "recovered" ? "success" : to === "failed_operationally" ? "warning" : "neutral",
    };
  }

  const messageEvents: Record<string, { action: string; title: string; tone: RecoveryCaseTimelineView["tone"] }> = {
    recovery_message_canceled: { action: "was canceled", title: "Recovery email canceled", tone: "neutral" },
    recovery_message_failed_terminal: { action: "could not be sent after the allowed attempts", title: "Recovery email failed", tone: "warning" },
    recovery_message_paused: { action: "was paused", title: "Recovery email paused", tone: "warning" },
    recovery_message_scheduled: { action: "was added to the schedule", title: "Recovery email scheduled", tone: "neutral" },
    recovery_message_sent: { action: "was sent to the email provider", title: "Recovery email sent", tone: "neutral" },
  };
  const messageEvent = messageEvents[event.eventType];
  if (messageEvent) {
    return {
      ...base,
      detail: stepDetail(event.metadata, messageEvent.action),
      title: messageEvent.title,
      tone: messageEvent.tone,
    };
  }

  const emailEvents: Record<string, { detail: string; title: string; tone: RecoveryCaseTimelineView["tone"] }> = {
    email_bounced: { detail: "The email provider reported that the message bounced.", title: "Email bounced", tone: "warning" },
    email_canceled: { detail: "The email provider reported that the message was canceled.", title: "Email canceled", tone: "neutral" },
    email_clicked: { detail: "The email provider reported a link click.", title: "Email link clicked", tone: "neutral" },
    email_complained: { detail: "The email provider reported a spam complaint.", title: "Spam complaint reported", tone: "warning" },
    email_delivery_delayed: { detail: "The email provider reported a delivery delay.", title: "Email delivery delayed", tone: "warning" },
    email_delivered: { detail: "The email provider reported successful delivery.", title: "Email delivered", tone: "success" },
    email_failed: { detail: "The email provider reported that delivery failed.", title: "Email delivery failed", tone: "warning" },
    email_opened: { detail: "The email provider reported an open. Open tracking can be approximate.", title: "Email opened", tone: "neutral" },
    email_scheduled: { detail: "The email provider accepted the message for scheduled delivery.", title: "Email scheduled by provider", tone: "neutral" },
    email_sent: { detail: "The email provider reported that the message was sent.", title: "Email sent by provider", tone: "neutral" },
    email_suppressed: { detail: "The email provider suppressed delivery to protect sender reputation.", title: "Email suppressed", tone: "warning" },
  };
  const emailEvent = emailEvents[event.eventType];
  if (emailEvent) {
    return { ...base, ...emailEvent };
  }

  return {
    ...base,
    detail: `${sourceLabel(event.source)} recorded this event.`,
    title: formatLabel(event.eventType) || "Recovery event",
    tone: "neutral",
  };
}
