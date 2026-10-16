import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";

export type NotificationTestDeliveryReservation = {
  claimToken: string;
};

export class NotificationTestDeliveryReservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationTestDeliveryReservationError";
  }
}

/**
 * Reserves one queued test event and consumes one approved authorization.
 * This deliberately does not call an email provider or complete delivery.
 */
export async function reserveNotificationTestDelivery({
  authorizationId,
  eventId,
  userId,
}: {
  authorizationId: string;
  eventId: string;
  userId: string;
}): Promise<NotificationTestDeliveryReservation> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new NotificationTestDeliveryReservationError("Notification delivery storage is unavailable.");
  }

  const { data, error } = await supabase.rpc("reserve_authorized_notification_test_delivery", {
    requested_authorization_id: authorizationId,
    requested_event_id: eventId,
    requested_global_delivery_enabled: process.env.ESSENTIAL_NOTIFICATION_DELIVERY_ENABLED === "true",
    requested_user_id: userId,
  });

  if (error || typeof data !== "string") {
    throw new NotificationTestDeliveryReservationError(
      `Unable to reserve notification test delivery: ${error?.message ?? "missing claim token"}`,
    );
  }

  return { claimToken: data };
}
