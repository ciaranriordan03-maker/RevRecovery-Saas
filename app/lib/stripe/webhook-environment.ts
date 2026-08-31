export type WebhookEnvironmentDisposition =
  | "process"
  | "connected_account_not_found"
  | "connected_account_environment_unknown"
  | "stripe_environment_mismatch";

export function getWebhookEnvironmentDisposition(
  connectionLivemode: boolean | null | undefined,
  eventLivemode: boolean,
): WebhookEnvironmentDisposition {
  if (connectionLivemode === undefined) {
    return "connected_account_not_found";
  }

  if (connectionLivemode === null) {
    return "connected_account_environment_unknown";
  }

  return connectionLivemode === eventLivemode
    ? "process"
    : "stripe_environment_mismatch";
}
