import Link from "next/link";
import type { RecoveryFlowView } from "../../lib/recovery/recovery-view";
import type { UserSettings } from "../../lib/settings";
import { RecoveryMessageEditor } from "./recovery-message-editor";

export function MessagesAndTimingWorkspace({
  recoveryView,
  userSettings,
}: {
  recoveryView: RecoveryFlowView;
  userSettings: UserSettings;
}) {
  return (
    <div className="flex flex-col gap-5">
      <RecoveryMessageEditor
        initialSettings={userSettings}
        recoveryView={recoveryView}
      />

      <div className="flex justify-end">
        <Link
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
          href="/dashboard/recovery?step=review"
        >
          Review flow
        </Link>
      </div>
    </div>
  );
}
