"use client";
import { Input } from "@fluentui/react-components";
import { WorkspaceCardSection } from "@/components/layout/WorkspaceCard";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import AdminTable from "@/components/admin/ui/AdminTable";
import AdminPager from "@/components/admin/ui/AdminPager";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import { DEFAULT_PAGE_SIZE } from "@/config/pagination";
import { formatKrw } from "@/lib/admin/cost";
import { paginate } from "@/lib/admin/selectors";
import type { DashboardView } from "@/types/admin";

interface UserActivityPanelProps {
  view?: DashboardView; search: string; onSearchChange(value: string): void;
  page: number; onPageChange(page: number): void; error?: string; onRetry(): void;
}
export default function UserActivityPanel({ view, search, onSearchChange, page, onPageChange, error, onRetry }: UserActivityPanelProps): React.ReactElement {
  const rows = view ? paginate(view.users, { page, pageSize: DEFAULT_PAGE_SIZE }) : null;
  const maximum = Math.max(1, ...view?.users.map(user => user.activities) ?? []);
  return <AdminCard bodyPadding="flush" title="사용자별 활동" actions={<Input aria-label="대시보드 사용자 검색" placeholder="이름 또는 부서 검색" value={search} onChange={(_, data) => onSearchChange(data.value)} />}>
    {!rows ? <AdminAsyncState state={error ? "error" : "loading"} message={error} onRetry={onRetry} /> : <><AdminTable label="사용자별 활동 집계" rows={rows.items} emptyMessage="조건에 맞는 사용자가 없습니다." columns={[
      { id: "name", label: "사용자 / 부서", render: user => <div><strong>{user.name}</strong><div className="tw:text-[11px] tw:text-(--kpc-muted)">{user.departmentName}</div></div> },
      { id: "activities", label: "총 활동", width: "16%", render: user => <div className="tw:flex tw:min-w-24 tw:items-center tw:gap-(--layout-control-gap)"><strong className="tw:tabular-nums">{user.activities}</strong><span aria-hidden="true" className="tw:h-1.5 tw:flex-1 tw:overflow-hidden tw:rounded-full tw:bg-(--kpc-line-soft)"><span className="tw:block tw:h-full tw:bg-(--kpc-info)" style={{ width: user.activities / maximum * 100 + "%" }} /></span></div> }, { id: "rfp", label: "RFP 등록", align: "end", render: user => user.rfpCreates }, { id: "sections", label: "섹션 작성", align: "end", render: user => user.sectionWrites },
      { id: "gen", label: "AI 생성", align: "end", render: user => user.generations }, { id: "download", label: "다운로드", align: "end", render: user => user.downloads }, { id: "failure", label: "실패", align: "end", render: user => <span className={user.failures ? "tw:font-semibold tw:text-(--kpc-danger)" : ""}>{user.failures}</span> },
      { id: "tokens", label: "Token", align: "end", render: user => user.tokens.toLocaleString("ko-KR") }, { id: "cost", label: "예상 비용", align: "end", render: user => formatKrw(user.cost.krwMicros) },
    ]} /><WorkspaceCardSection><AdminPager {...rows} onChange={onPageChange} /></WorkspaceCardSection></>}
  </AdminCard>;
}
