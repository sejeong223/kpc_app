import { WorkspaceCardSection } from "@/components/layout/WorkspaceCard";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import AdminTable from "@/components/admin/ui/AdminTable";
import AdminPager from "@/components/admin/ui/AdminPager";
import { DEFAULT_PAGE_SIZE } from "@/config/pagination";
import { paginate } from "@/lib/admin/selectors";
import type { DashboardView } from "@/types/admin";
import { AdminStackedBar } from "@/components/admin/ui/AdminCharts";
import { formatWinRate, rfpSegments } from "./rfp-presentation";

interface RfpDepartmentsPanelProps { rows: DashboardView["departments"]; page: number; onPageChange(page: number): void }
export default function RfpDepartmentsPanel({ rows, page, onPageChange }: RfpDepartmentsPanelProps): React.ReactElement {
  const result = paginate([...rows].sort((a, b) => b.total - a.total || a.id.localeCompare(b.id)), { page, pageSize: DEFAULT_PAGE_SIZE });
  return <AdminCard bodyPadding="flush" title="부서별 현황" actions={<span className="tw:text-[11px] tw:text-(--kpc-muted)">조회 기간 전체 · 등록 건수순</span>}>
    <AdminTable label="부서별 RFP 현황" rows={result.items} emptyMessage="해당 부서가 없습니다." columns={[
      { id: "name", label: "부서", render: row => <strong>{row.name}</strong> }, { id: "total", label: "등록", align: "end", render: row => row.total }, { id: "progress", label: "진행", align: "end", render: row => row.counts.review + row.counts.writing },
      { id: "submitted", label: "결과 대기", align: "end", render: row => row.counts.submitted }, { id: "won", label: "수주", align: "end", render: row => row.counts.won }, { id: "lost", label: "실패", align: "end", render: row => row.counts.lost }, { id: "drop", label: "진행 안함", align: "end", render: row => row.counts.dropped },
      { id: "rate", label: "수주율", align: "end", render: row => formatWinRate(row.counts.won, row.counts.lost) },
      { id: "composition", label: "결과 구성", width: "22%", render: row => <AdminStackedBar compact label={row.name + " 결과 구성"} segments={rfpSegments(row.counts)} /> },
    ]} />{result.total > DEFAULT_PAGE_SIZE && <WorkspaceCardSection><AdminPager {...result} onChange={onPageChange} /></WorkspaceCardSection>}
  </AdminCard>;
}
