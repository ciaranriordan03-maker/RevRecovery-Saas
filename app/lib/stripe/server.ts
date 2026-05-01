import "server-only";

import Stripe from "stripe";
import { getStripeSecretKey } from "./env";

export function createStripePlatformClient() {
  const secretKey = getStripeSecretKey();

  if (!secretKey) {
    return null;
  }

  return new Stripe(secretKey);
}

export function createStripeConnectedAccountClient(accessToken: string) {
  return new Stripe(accessToken);
}
