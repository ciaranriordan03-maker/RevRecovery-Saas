import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const delivery = readFileSync(
  join(process.cwd(), "app/lib/server/recovery-delivery.ts"),
  "utf8",
);
const eventPersistence = readFileSync(
  join(process.cwd(), "app/lib/server/recovery-message-events.ts"),
  "utf8",
);
const suppressions = readFileSync(
  join(process.cwd(), "app/lib/server/recovery-recipient-suppressions.ts"),
  "utf8",
);

describe("recovery recipient suppression boundaries", () => {
  it("checks an account-scoped normalized recipient before calling Resend", () => {
    expect(suppressions).toContain('.eq("user_id", userId)');
    expect(suppressions).toContain('.eq("normalized_recipient_email", normalizedEmail)');
    const suppressionCheck = delivery.indexOf("getRecoveryRecipientSuppression({");
    expect(suppressionCheck).toBeGreaterThan(-1);
    expect(delivery.indexOf("sendWithResend({", suppressionCheck)).toBeGreaterThan(
      suppressionCheck,
    );
  });

  it("cancels a suppressed due message instead of retrying delivery", () => {
    expect(delivery).toContain("if (suppression)");
    expect(delivery).toContain("await cancelRecoveryMessage(");
    expect(delivery).toContain("result.canceled += 1");
  });

  it("uses one database RPC for event insertion, projection, and suppression", () => {
    expect(eventPersistence).toContain('.rpc("record_recovery_message_event"');
    expect(eventPersistence).not.toContain('.from("recovery_message_events").insert');
  });
});
