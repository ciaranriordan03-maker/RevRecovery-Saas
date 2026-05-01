import type { Metadata } from "next";
import { AppShell } from "../../components/dashboard/app-shell";
import { SettingsContent } from "../../components/dashboard/settings-content";
import { requireCompletedOnboarding } from "../../lib/auth";

export const metadata: Metadata = {
  title: "Settings | RecoverFlow",
  description: "Manage account, email, recovery, and notification settings in RecoverFlow.",
};

export default async function SettingsPage() {
  await requireCompletedOnboarding();
  return (
    <AppShell
      active="Settings"
      subtitle="Manage your account and preferences"
      title="Settings"
    >
      <SettingsContent />
    </AppShell>
  );
}
