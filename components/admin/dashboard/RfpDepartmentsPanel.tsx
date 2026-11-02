import { WorkspaceCardSection } from "@/components/layout/WorkspaceCard";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import AdminTable from "@/components/admin/ui/AdminTable";
import AdminPager from "@/components/admin/ui/AdminPager";
import { DEFAULT_PAGE_SIZE } from "@/config/pagination";
import { paginate } from "@/lib/admin/selectors";
import type { DashboardView } from "@/types/admin";

interface RfpDepartmentsPanelProps { rows: DashboardView["departments"]; page: number; onPageChange(page: number): void }
export default function RfpDepartmentsPanel({ rows, page, onPageChange }: RfpDepartmentsPanelProps): React.ReactElement {
  const result = paginate(rows, { page, pageSize: DEFAULT_PAGE_SIZE });
  return <AdminCard bodyPadding="flush" title="부서별 RFP 현황 · 조회 기간 전체">
    <AdminTable label="부서별 RFP 현황" rows={result.items} emptyMessage="해당 부서가 없습니다." columns={[
      { id: "name", label: "부서", render: row => <strong>{row.name}</strong> }, { id: "total", label: "등록", align: "end", render: row => row.total }, { id: "progress", label: "진행", align: "end", render: row => row.counts.review + row.counts.writing },
      { id: "submitted", label: "결과 대기", align: "end", render: row => row.counts.submitted }, { id: "won", label: "수주", align: "end", render: row => row.counts.won }, { id: "lost", label: "실패", align: "end", render: row => row.counts.lost }, { id: "drop", label: "진행 안함", align: "end", render: row => row.counts.dropped },
      { id: "rate", label: "수주율", align: "end", render: row => row.counts.won + row.counts.lost === 0 ? "—" : (row.counts.won / (row.counts.won + row.counts.lost) * 100).toFixed(1) + "%" },
      { id: "composition", label: "결과 구성", render: row => <span className="tw:whitespace-nowrap tw:text-[11px]">수주 {row.counts.won} · 실패 {row.counts.lost} · 대기 {row.counts.submitted}</span> },
    ]} /><WorkspaceCardSection><AdminPager {...result} onChange={onPageChange} /></WorkspaceCardSection>
  </AdminCard>;
}
