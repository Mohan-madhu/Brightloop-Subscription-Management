import { NajidFeaturePending } from '../../../features/najid/contract-pending';
export default function FinanceReportsPage() { return <NajidFeaturePending area="Finance" page="Quarterly reports" dependencies={["Vijay: report-run list/status, queue/run and download API contracts. The UI must display server run states.", "Basim: shared authenticated API client/session."]} />; }
