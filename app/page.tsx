import type { Metadata } from "next";
import { BotpressWidget } from "./components/marketing/botpress-widget";
import { MarketingPage } from "./components/marketing/marketing-page";

export const metadata: Metadata = {
  title: "RevRecovery | Recover Failed Stripe Payments",
  description:
    "Recover revenue from failed subscription payments with automated, carefully timed customer reminders built for Stripe.",
};

export default function Home() {
  return (
    <>
      <MarketingPage />
      <BotpressWidget />
    </>
  );
}
