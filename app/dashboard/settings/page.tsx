import type { Metadata } from "next";
import { AppShell } from "../../components/dashboard/app-shell";
import { SettingsContent } from "../../components/dashboard/settings-content";
import { requireCompletedOnboarding } from "../../lib/auth";

export const metadata: Metadata = {
  title: "Settings | RecoverFlow",
  description: "Manage account, email, recovery, and notification settings in RecoverFlow.",
};

export default async function SettingsPage() {
  const { claims, profile } = await requireCompletedOnboarding();
  const accountEmail =
    typeof claims.email === "string" ? claims.email : "account@company.com";

  return (
    <AppShell
      active="Settings"
      subtitle="Manage your account and preferences"
      title="Settings"
    >
      <SettingsContent
        accountEmail={accountEmail}
        initialAvatarSeed={profile.avatarSeed}
        initialFullName={profile.fullName}
        userId={claims.sub}
      />
    </AppShell>
  );
}
