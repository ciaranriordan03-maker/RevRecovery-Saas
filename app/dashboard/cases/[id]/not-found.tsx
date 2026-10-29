import {
  CaseDetailFeedback,
  CaseDetailFrame,
  CaseDetailHeader,
} from "../../../components/dashboard/case-detail-frame";

export default function RecoveryCaseNotFound() {
  return (
    <CaseDetailFrame>
      <CaseDetailHeader />
      <CaseDetailFeedback
        body="This case could not be found or is not accessible. Return to cases to continue."
        title="Case not found"
      />
    </CaseDetailFrame>
  );
}
