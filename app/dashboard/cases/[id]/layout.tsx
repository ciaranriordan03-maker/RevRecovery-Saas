import { AppShell } from "../../../components/dashboard/app-shell";

export default function RecoveryCaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      active="Cases"
      showPageHeading={false}
      subtitle="Review the payment issue, recovery progress, and history"
      title="Case details"
    >
      {children}
    </AppShell>
  );
}
