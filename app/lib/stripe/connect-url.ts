export function getStripeConnectHref(next: string) {
  const searchParams = new URLSearchParams({
    next,
  });

  return `/api/stripe/connect?${searchParams.toString()}`;
}
