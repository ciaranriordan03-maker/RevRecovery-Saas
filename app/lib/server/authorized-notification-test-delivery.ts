import "server-only";

import { evaluateAuthorizedTestDeliveryConnection } from "../recovery/authorized-test-delivery-policy";
import { isEnvironmentFlagEnabled } from "../recovery/environment-policy";
import { deliverReservedTestNotification, type NotificationDeliveryResult } from "./recovery-notification-delivery";
import { reserveNotificationTestDelivery } from "./notification-test-delivery-reservation";

/**
 * Dormant D4n orchestration boundary. It has no route, UI action, cron, or
 * webhook caller. Both environment gates must be explicitly enabled before
 * an authorization can be consumed or a provider can be contacted.
 */
export async function executeAuthorizedNotificationTestDelivery({
  authorizationId,
  eventId,
  userId,
}: {
  authorizationId: string;
  eventId: string;
  userId: string;
}): Promise<NotificationDeliveryResult> {
  const connection = evaluateAuthorizedTestDeliveryConnection({
    authorizedTestEnabled: isEnvironmentFlagEnabled(
      process.env.ESSENTIAL_NOTIFICATION_AUTHORIZED_TEST_DELIVERY_ENABLED,
    ),
    globalEnabled: isEnvironmentFlagEnabled(
      process.env.ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED,
    ),
  });

  if (!connection.allowed) return { outcome: "blocked", reason: connection.reason };

  const reservation = await reserveNotificationTestDelivery({ authorizationId, eventId, userId });
  return deliverReservedTestNotification(eventId, reservation.claimToken);
}
