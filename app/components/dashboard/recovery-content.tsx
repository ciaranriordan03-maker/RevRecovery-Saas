import type { RecoveryFlowView } from "../../lib/recovery/recovery-view";
import type { AtRiskCustomer } from "../../lib/server/at-risk-customers";
import type { UserSettings } from "../../lib/settings";
import type { ActivationReadiness } from "../../lib/recovery/activation-readiness";
import type { ControlledTestEligibility } from "../../lib/recovery/controlled-test-plan";
import type { RecoveryOpportunityReport } from "../../lib/recovery/opportunity-report";
import { buildRecoveryHealthSummary } from "../../lib/recovery/recovery-health";
import type { PreviewNotificationHistory } from "../../lib/recovery/notification-event-history";
import type { NotificationActivationReadiness } from "../../lib/recovery/notification-activation-readiness";
import type { NotificationActivationReview as NotificationActivationReviewModel } from "../../lib/recovery/notification-activation-review";
import {
  RecoveryOverview,
  RecoveryWorkspaceHeader,
  RecoveryWorkspaceNavigation,
  RecoveryWorkspaceSection,
  type RecoveryWorkspaceView,
} from "./recovery-workspace";
import {
  MessagesAndTimingWorkspace,
  NotificationsWorkspace,
  SafetyWorkspace,
} from "./recovery-workspace-details";
import {
  RecoveryReviewWorkspace,
  RecoverySettingsWorkspace,
} from "./recovery-settings-workspace";

type RecoveryContentProps = {
  accountEmail: string;
  atRiskCustomers?: AtRiskCustomer[];
  activationReadiness: ActivationReadiness;
  controlledTestEligibility: ControlledTestEligibility;
  mode?: "sequence" | "customize" | "review";
  opportunityReport: RecoveryOpportunityReport;
  notificationHistory: PreviewNotificationHistory;
  notificationActivationReview: NotificationActivationReviewModel;
  notificationReadiness: NotificationActivationReadiness;
  recoveryView: RecoveryFlowView;
  userSettings: UserSettings;
  view?: RecoveryWorkspaceView;
};

function RecoverySequence({ accountEmail, activationReadiness, atRiskCustomers, notificationActivationReview, notificationHistory, notificationReadiness, opportunityReport, recoveryView, view }: { accountEmail: string; activationReadiness: ActivationReadiness; atRiskCustomers: AtRiskCustomer[]; notificationActivationReview: NotificationActivationReviewModel; notificationHistory: PreviewNotificationHistory; notificationReadiness: NotificationActivationReadiness; opportunityReport: RecoveryOpportunityReport; recoveryView: RecoveryFlowView; view: RecoveryWorkspaceView }) {
  const recoveryHealth = buildRecoveryHealthSummary(
    activationReadiness,
    recoveryView.mode,
  );

  return (
    <div className="px-5 py-7 sm:px-8 lg:px-8 lg:py-8 xl:px-10">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-7">
        <RecoveryWorkspaceHeader mode={recoveryView.mode} />
        <RecoveryWorkspaceNavigation active={view} />

        {view === "overview" ? (
          <RecoveryOverview
            activationReadiness={activationReadiness}
            atRiskCustomers={atRiskCustomers}
            opportunityReport={opportunityReport}
            recoveryHealth={recoveryHealth}
            recoveryView={recoveryView}
          />
        ) : null}

        {view === "flow" ? (
          <RecoveryWorkspaceSection
            description="Review the saved three-message sequence, delivery timing, and customer-facing copy used for new recovery cases."
            title="Messages & timing"
          >
            <MessagesAndTimingWorkspace recoveryView={recoveryView} />
          </RecoveryWorkspaceSection>
        ) : null}

        {view === "notifications" ? (
          <RecoveryWorkspaceSection
            description="Review the proposed alert policy, recorded preview events, and controlled delivery evidence. Nothing on this screen sends a notification."
            title="Notifications"
          >
            <NotificationsWorkspace
              accountEmail={accountEmail}
              activationReview={notificationActivationReview}
              history={notificationHistory}
              readiness={notificationReadiness}
            />
          </RecoveryWorkspaceSection>
        ) : null}

        {view === "safety" ? (
          <RecoveryWorkspaceSection
            description="Inspect recovery health and the safeguards that must pass before controlled testing or live activation can be considered."
            title="Safety & audit"
          >
            <SafetyWorkspace health={recoveryHealth} readiness={activationReadiness} />
          </RecoveryWorkspaceSection>
        ) : null}
      </div>
    </div>
  );
}

export function RecoveryContent({ accountEmail, activationReadiness, atRiskCustomers = [], controlledTestEligibility, mode = "sequence", notificationActivationReview, notificationHistory, notificationReadiness, opportunityReport, recoveryView, userSettings, view = "overview" }: RecoveryContentProps) {
  if (mode === "review") return <RecoveryReviewWorkspace recoveryView={recoveryView} />;
  if (mode === "customize") return <RecoverySettingsWorkspace controlledTestEligibility={controlledTestEligibility} recoveryView={recoveryView} userSettings={userSettings} />;
  return <RecoverySequence accountEmail={accountEmail} activationReadiness={activationReadiness} atRiskCustomers={atRiskCustomers} notificationActivationReview={notificationActivationReview} notificationHistory={notificationHistory} notificationReadiness={notificationReadiness} opportunityReport={opportunityReport} recoveryView={recoveryView} view={view} />;
}
