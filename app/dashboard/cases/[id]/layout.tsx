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
      subtitle="Review the complete failed-payment recovery history"
      title="Case details"
    >
      {children}
    </AppShell>
  );
}
