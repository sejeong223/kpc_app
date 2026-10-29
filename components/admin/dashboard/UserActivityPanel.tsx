"use client";
import { Input } from "@fluentui/react-components";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import AdminTable from "@/components/admin/ui/AdminTable";
import { formatKrw } from "@/lib/admin/cost";
import type { DashboardView } from "@/types/admin";
interface UserActivityPanelProps { view: DashboardView; search: string; onSearchChange(value: string): void }
export default function UserActivityPanel({ view, search, onSearchChange }: UserActivityPanelProps): React.ReactElement {
  return <AdminCard title="사용자별 활동" actions={<Input aria-label="대시보드 사용자 검색" placeholder="이름 또는 부서 검색" value={search} onChange={(_, d) => onSearchChange(d.value)} />}><AdminTable label="사용자별 활동 집계" rows={view.users} emptyMessage="조건에 맞는 사용자가 없습니다." columns={[
    { id: "name", label: "사용자 / 부서", render: (u) => <div><strong>{u.name}</strong><div className="tw:text-[11px] tw:text-(--kpc-muted)">{u.departmentName}</div></div> },
    { id: "activities", label: "총 활동", align: "end", render: (u) => u.activities }, { id: "rfp", label: "RFP 등록", align: "end", render: (u) => u.rfpCreates }, { id: "sections", label: "섹션 작성", align: "end", render: (u) => u.sectionWrites },
    { id: "gen", label: "AI 생성", align: "end", render: (u) => u.generations }, { id: "download", label: "다운로드", align: "end", render: (u) => u.downloads }, { id: "failure", label: "실패", align: "end", render: (u) => u.failures },
    { id: "tokens", label: "Token", align: "end", render: (u) => u.tokens.toLocaleString("ko-KR") }, { id: "cost", label: "예상 비용", align: "end", render: (u) => formatKrw(u.cost.krwMicros) },
  ]} /></AdminCard>;
}
