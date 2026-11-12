import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MarketingPage } from "./components/marketing/marketing-page";
import { buildPasswordRecoveryCallbackPath } from "./lib/auth-callback";

export const metadata: Metadata = {
  title: "RevRecovery | Recover Failed Stripe Payments",
  description:
    "Recover revenue from failed subscription payments with automated, carefully timed customer reminders built for Stripe.",
};

type HomeProps = {
  searchParams?: Promise<{
    code?: string;
    token_hash?: string;
    type?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const callbackPath = buildPasswordRecoveryCallbackPath(params ?? {});

  if (callbackPath) {
    redirect(callbackPath);
  }

  return <MarketingPage />;
}
