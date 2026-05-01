import type { Metadata } from "next";
import { AppShell } from "../components/dashboard/app-shell";
import { DashboardContent } from "../components/dashboard/dashboard-content";
import { requireCompletedOnboarding } from "../lib/auth";

export const metadata: Metadata = {
  title: "Dashboard | RecoverFlow",
  description: "Review failed payment recovery opportunities in RecoverFlow.",
};

export default async function DashboardPage() {
  await requireCompletedOnboarding();
  return (
    <AppShell
      active="Dashboard"
      subtitle="Here's what we found in your Stripe account"
      title="Instant Insights"
    >
      <DashboardContent />
    </AppShell>
  );
}
