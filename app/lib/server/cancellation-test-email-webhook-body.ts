import "server-only";

import { CANCELLATION_TEST_EMAIL_WEBHOOK_MAX_BYTES as limit } from "../cancellation-rescue/test-email-policy";

export async function readCancellationTestEmailWebhookBody(request: Request): Promise<
  { payload: string } | { error: 400 | 413 }
> {
  const length = request.headers.get("content-length");
  if (length !== null) {
    if (!/^\d+$/.test(length)) return { error: 400 };
    if (Number(length) > limit) return { error: 413 };
  }
  if (!request.body || request.bodyUsed || request.body.locked) return { error: 400 };
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  let size = 0;
  let payload = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) return { error: 413 };
      payload += decoder.decode(value, { stream: true });
    }
    payload += decoder.decode();
    return { payload };
  } catch {
    return { error: 400 };
  } finally {
    // Do not wait for the peer to finish transmitting a rejected body.
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
