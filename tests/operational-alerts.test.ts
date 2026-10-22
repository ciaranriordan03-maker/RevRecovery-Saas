import { describe, expect, it, vi } from "vitest";
import {
  buildRedactedOperationalAlert,
  dispatchRedactedOperationalAlert,
  OPERATIONAL_ALERT_POLICIES,
} from "../app/lib/observability/operational-alerts";

describe("operational alert contract", () => {
  it("defines bounded thresholds for every operational signal", () => {
    for (const policy of Object.values(OPERATIONAL_ALERT_POLICIES)) {
      expect(policy.thresholdCount).toBeGreaterThan(0);
      expect(policy.thresholdWindowMinutes).toBeGreaterThan(0);
      expect(policy.operatorAction.length).toBeGreaterThan(20);
      expect(["engineering", "operator_and_engineering"]).toContain(
        policy.route,
      );
    }
  });

  it("drops exception messages and accepts only bounded operational context", () => {
    const alert = buildRedactedOperationalAlert({
      code: "recovery_cron_failed",
      context: {
        attemptCount: 999_999,
        batchLimit: -10,
        httpStatus: 999,
        retryScheduled: false,
        stage: "processing",
      },
      error: new Error(
        "customer@example.com bearer-secret private-token-value",
      ),
    });
    const serialized = JSON.stringify(alert);

    expect(alert.context).toMatchObject({
      attempt_count: 10_000,
      batch_limit: 0,
      customer_contact: "none",
      error_type: "Error",
      http_status: 599,
      retry_scheduled: false,
      stage: "processing",
    });
    expect(serialized).not.toContain("customer@example.com");
    expect(serialized).not.toContain("bearer-secret");
    expect(serialized).not.toContain("private-token-value");
  });

  it("runs the safe non-delivery alert drill", async () => {
    const captured: string[] = [];

    const result = dispatchRedactedOperationalAlert(
      {
        code: "notification_reconciliation_required",
        context: {
          attemptCount: 1,
          retryScheduled: false,
          stage: "reconciliation",
        },
        error: new Error("provider payload and recipient must not escape"),
      },
      (alert) => {
        captured.push(JSON.stringify(alert));
        return {
          customerContact: alert.context.customer_contact,
          fingerprint: alert.fingerprint.join(":"),
        };
      },
    );

    expect(captured).toHaveLength(1);
    expect(captured[0]).not.toContain("provider payload");
    expect(captured[0]).not.toContain("recipient");
    expect(result).toEqual({
      customerContact: "none",
      fingerprint:
        "revrecovery-operational:notification_reconciliation_required",
    });

    const captureException = vi.fn((error: unknown) => {
      void error;
      return "drill-event-id";
    });
    const scope = {
      captureException,
      setContext: vi.fn(),
      setFingerprint: vi.fn(),
      setLevel: vi.fn(),
      setTags: vi.fn(),
    };
    vi.doMock("@sentry/nextjs", () => ({
      withScope: (callback: (activeScope: typeof scope) => unknown) =>
        callback(scope),
    }));
    const { captureOperationalFailure } = await import(
      "../app/lib/server/operational-alerts"
    );

    const eventId = captureOperationalFailure({
      code: "notification_reconciliation_required",
      context: {
        attemptCount: 1,
        retryScheduled: false,
        stage: "reconciliation",
      },
      error: new Error("customer@example.com provider-secret"),
    });

    expect(eventId).toBe("drill-event-id");
    expect(scope.setFingerprint).toHaveBeenCalledWith([
      "revrecovery-operational",
      "notification_reconciliation_required",
    ]);
    expect(scope.setTags).toHaveBeenCalledWith(
      expect.objectContaining({
        alert_route: "operator_and_engineering",
        customer_contact: "none",
      }),
    );
    expect(scope.setContext).toHaveBeenCalledWith(
      "operational_alert",
      expect.objectContaining({
        customer_contact: "none",
        error_type: "Error",
        retry_scheduled: false,
      }),
    );
    const capturedError = captureException.mock.calls[0]?.[0];
    expect(capturedError).toBeInstanceOf(Error);
    expect(String(capturedError)).not.toContain("customer@example.com");
    expect(String(capturedError)).not.toContain("provider-secret");
  });
});
