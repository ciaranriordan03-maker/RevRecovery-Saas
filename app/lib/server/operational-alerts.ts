import "server-only";

import * as Sentry from "@sentry/nextjs";
import {
  buildRedactedOperationalAlert,
  type OperationalAlertInput,
} from "../observability/operational-alerts";

export function captureOperationalFailure(input: OperationalAlertInput) {
  const alert = buildRedactedOperationalAlert(input);

  try {
    return Sentry.withScope((scope) => {
      scope.setContext("operational_alert", alert.context);
      scope.setFingerprint(alert.fingerprint);
      scope.setLevel(alert.level);
      scope.setTags(alert.tags);

      const redactedError = new Error(alert.message);
      redactedError.name = "RevRecoveryOperationalFailure";

      return scope.captureException(redactedError);
    });
  } catch {
    return null;
  }
}
