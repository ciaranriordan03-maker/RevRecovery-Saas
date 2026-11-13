import {
  CANCELLATION_RESCUE_COPY_VERSION,
  CANCELLATION_RESCUE_TEMPLATES,
  type CancellationRescueTemplate,
} from "./templates";

const MINIMUM_WINDOW_MINUTES = 30;
const FIRST_DRAFT_DELAY_MINUTES = 15;
const MINIMUM_DRAFT_SPACING_MINUTES = 12 * 60;
const FINAL_DRAFT_LEAD_MINUTES = 24 * 60;
const MIDDLE_DRAFT_LEAD_MINUTES = 72 * 60;

export const CANCELLATION_SEQUENCE_POLICY_VERSION = 1 as const;

export type CancellationDraftProjection = {
  bodyPreview: string;
  messageKey: string;
  scheduledFor: string;
  stepNumber: number;
  subject: string;
};

export type CancellationSequenceProjection =
  | {
      configurationSnapshot: CancellationSequenceSnapshot;
      messages: CancellationDraftProjection[];
      status: "draft";
    }
  | {
      configurationSnapshot: CancellationSequenceSnapshot;
      messages: [];
      reason: "invalid_anchor" | "insufficient_window" | "missing_scheduled_end";
      status: "ineligible";
    };

export type CancellationSequenceSnapshot = {
  anchorSemantics: "later_of_detection_or_projection";
  copyVersion: typeof CANCELLATION_RESCUE_COPY_VERSION;
  firstDraftDelayMinutes: number;
  minimumDraftSpacingMinutes: number;
  minimumWindowMinutes: number;
  policyVersion: typeof CANCELLATION_SEQUENCE_POLICY_VERSION;
  scheduleSemantics: "bounded_before_subscription_end";
  templateKeys: string[];
};

export function buildCancellationSequenceSnapshot(
  templates: readonly CancellationRescueTemplate[] = CANCELLATION_RESCUE_TEMPLATES,
): CancellationSequenceSnapshot {
  return {
    anchorSemantics: "later_of_detection_or_projection",
    copyVersion: CANCELLATION_RESCUE_COPY_VERSION,
    firstDraftDelayMinutes: FIRST_DRAFT_DELAY_MINUTES,
    minimumDraftSpacingMinutes: MINIMUM_DRAFT_SPACING_MINUTES,
    minimumWindowMinutes: MINIMUM_WINDOW_MINUTES,
    policyVersion: CANCELLATION_SEQUENCE_POLICY_VERSION,
    scheduleSemantics: "bounded_before_subscription_end",
    templateKeys: templates.map((template) => template.messageKey),
  };
}

function selectSpacedDraftTimes(candidates: number[]) {
  const sortedCandidates = [...new Set(candidates)].sort((left, right) => left - right);
  const selected: number[] = [];

  for (const candidate of sortedCandidates) {
    const previous = selected.at(-1);

    if (
      previous === undefined ||
      candidate - previous >= MINIMUM_DRAFT_SPACING_MINUTES * 60_000
    ) {
      selected.push(candidate);
    }
  }

  return selected;
}

export function projectCancellationSequence({
  detectedAt,
  projectedAt,
  scheduledEndAt,
  templates = CANCELLATION_RESCUE_TEMPLATES,
}: {
  detectedAt: string;
  projectedAt: string;
  scheduledEndAt: string | null;
  templates?: readonly CancellationRescueTemplate[];
}): CancellationSequenceProjection {
  const configurationSnapshot = buildCancellationSequenceSnapshot(templates);

  if (!scheduledEndAt) {
    return {
      configurationSnapshot,
      messages: [],
      reason: "missing_scheduled_end",
      status: "ineligible",
    };
  }

  const detectedTime = new Date(detectedAt).getTime();
  const projectedTime = new Date(projectedAt).getTime();
  const scheduledEndTime = new Date(scheduledEndAt).getTime();

  if (
    !Number.isFinite(detectedTime) ||
    !Number.isFinite(projectedTime) ||
    !Number.isFinite(scheduledEndTime)
  ) {
    return {
      configurationSnapshot,
      messages: [],
      reason: "invalid_anchor",
      status: "ineligible",
    };
  }

  const anchorTime = Math.max(detectedTime, projectedTime);

  if (
    scheduledEndTime - anchorTime <
    MINIMUM_WINDOW_MINUTES * 60_000
  ) {
    return {
      configurationSnapshot,
      messages: [],
      reason: "insufficient_window",
      status: "ineligible",
    };
  }

  const firstDraftTime = anchorTime + FIRST_DRAFT_DELAY_MINUTES * 60_000;
  const candidateTimes = [
    firstDraftTime,
    scheduledEndTime - MIDDLE_DRAFT_LEAD_MINUTES * 60_000,
    scheduledEndTime - FINAL_DRAFT_LEAD_MINUTES * 60_000,
  ].filter(
    (candidate) => candidate >= firstDraftTime && candidate < scheduledEndTime,
  );
  const scheduledTimes = selectSpacedDraftTimes(candidateTimes).slice(0, templates.length);

  return {
    configurationSnapshot,
    messages: scheduledTimes.map((scheduledTime, index) => ({
      bodyPreview: templates[index].bodyPreview,
      messageKey: templates[index].messageKey,
      scheduledFor: new Date(scheduledTime).toISOString(),
      stepNumber: index + 1,
      subject: templates[index].subject,
    })),
    status: "draft",
  };
}
