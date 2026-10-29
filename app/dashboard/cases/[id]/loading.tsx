import {
  CaseDetailFrame,
  CaseDetailHeader,
  CaseDetailLoadingSkeleton,
} from "../../../components/dashboard/case-detail-frame";

export default function RecoveryCaseLoading() {
  return (
    <CaseDetailFrame>
      <CaseDetailHeader />
      <CaseDetailLoadingSkeleton />
    </CaseDetailFrame>
  );
}
