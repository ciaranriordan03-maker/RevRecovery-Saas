export type AuthorizedTestDeliveryConnectionDecision =
  | { allowed: true }
  | { allowed: false; reason: "authorized_test_delivery_disabled" | "global_disabled" };

export function evaluateAuthorizedTestDeliveryConnection({
  authorizedTestEnabled,
  globalEnabled,
}: {
  authorizedTestEnabled: boolean;
  globalEnabled: boolean;
}): AuthorizedTestDeliveryConnectionDecision {
  if (!globalEnabled) return { allowed: false, reason: "global_disabled" };
  if (!authorizedTestEnabled) {
    return { allowed: false, reason: "authorized_test_delivery_disabled" };
  }
  return { allowed: true };
}
