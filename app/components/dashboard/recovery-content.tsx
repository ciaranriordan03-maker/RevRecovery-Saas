import type { RecoveryFlowView } from "../../lib/recovery/recovery-view";
import type { AtRiskCustomer } from "../../lib/server/at-risk-customers";
import type { UserSettings } from "../../lib/settings";
import type { ActivationReadiness } from "../../lib/recovery/activation-readiness";
import type { ControlledTestEligibility } from "../../lib/recovery/controlled-test-plan";
import type { RecoveryOpportunityReport } from "../../lib/recovery/opportunity-report";
import { buildRecoveryHealthSummary } from "../../lib/recovery/recovery-health";
import {
  RecoveryOverview,
  RecoveryWorkspaceHeader,
  RecoveryWorkspaceNavigation,
  RecoveryWorkspaceSection,
  type RecoveryWorkspaceView,
} from "./recovery-workspace";
import {
  MessagesAndTimingWorkspace,
  SafetyWorkspace,
} from "./recovery-workspace-details";
import {
  RecoveryReviewWorkspace,
  RecoverySettingsWorkspace,
} from "./recovery-settings-workspace";

type RecoveryContentProps = {
  atRiskCustomers?: AtRiskCustomer[];
  activationReadiness: ActivationReadiness;
  controlledTestEligibility: ControlledTestEligibility;
  mode?: "sequence" | "customize" | "review";
  opportunityReport: RecoveryOpportunityReport;
  recoveryView: RecoveryFlowView;
  userSettings: UserSettings;
  view?: RecoveryWorkspaceView;
};

function RecoverySequence({ activationReadiness, atRiskCustomers, opportunityReport, recoveryView, userSettings, view }: { activationReadiness: ActivationReadiness; atRiskCustomers: AtRiskCustomer[]; opportunityReport: RecoveryOpportunityReport; recoveryView: RecoveryFlowView; userSettings: UserSettings; view: RecoveryWorkspaceView }) {
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
            <MessagesAndTimingWorkspace
              recoveryView={recoveryView}
              userSettings={userSettings}
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

export function RecoveryContent({ activationReadiness, atRiskCustomers = [], controlledTestEligibility, mode = "sequence", opportunityReport, recoveryView, userSettings, view = "overview" }: RecoveryContentProps) {
  if (mode === "review") return <RecoveryReviewWorkspace recoveryView={recoveryView} />;
  if (mode === "customize") return <RecoverySettingsWorkspace controlledTestEligibility={controlledTestEligibility} recoveryView={recoveryView} userSettings={userSettings} />;
  return <RecoverySequence activationReadiness={activationReadiness} atRiskCustomers={atRiskCustomers} opportunityReport={opportunityReport} recoveryView={recoveryView} userSettings={userSettings} view={view} />;
}
