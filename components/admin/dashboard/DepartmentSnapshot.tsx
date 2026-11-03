"use client";
import Button from "@/components/common/Button";
import AdminDotTrack from "@/components/admin/ui/AdminDotTrack";
import { dashboardCategoryColor } from "@/config/dashboard-charts";
import { ArrowRightRegular } from "@fluentui/react-icons";
import type { DashboardView } from "@/types/admin";
import DashboardCard from "./DashboardCard";

interface DepartmentSnapshotProps { rows: DashboardView["departments"]; onOpen(): void }
export default function DepartmentSnapshot({ rows, onOpen }: DepartmentSnapshotProps): React.ReactElement {
  const sorted = [...rows].sort((a, b) => b.total - a.total || a.id.localeCompare(b.id));
  const maximum = Math.max(1, ...sorted.map(row => row.total));
  return <DashboardCard title="부서별 등록 현황" actions={<Button className="ghost tw:h-7 tw:px-2 tw:text-xs" onClick={onOpen}>전체 부서 <ArrowRightRegular aria-hidden="true" /></Button>}>
    <p className="tw:text-[11px] tw:text-(--kpc-muted)">조회 기간 내 등록 건수 · 상위 {Math.min(4, rows.length)}개 부서</p>
    {!rows.length ? <p role="status" className="tw:py-4 tw:text-(--kpc-muted)">조회 가능한 부서가 없습니다.</p> : <ol className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-3 tw:p-0">
      {sorted.slice(0, 4).map((row, index) => <li key={row.id} className="tw:grid tw:grid-cols-[20px_minmax(0,1fr)_minmax(40px,1.3fr)_42px] tw:items-center tw:gap-2">
        <span className="tw:text-[11px] tw:text-(--kpc-muted)">{index + 1}</span><span className="tw:truncate tw:font-medium" title={row.name}>{row.name}</span>
        <AdminDotTrack value={row.total} maximum={maximum} color={dashboardCategoryColor(row.id)} /><strong className="tw:text-right tw:tabular-nums">{row.total}<span className="tw:ml-1 tw:text-[10px] tw:font-normal tw:text-(--kpc-muted)">건</span></strong>
      </li>)}
    </ol>}
  </DashboardCard>;
}
