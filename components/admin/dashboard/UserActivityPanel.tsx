"use client";
import { DadamInput as Input } from "@/components/ui/DadamControls";
import { WorkspaceCardSection } from "@/components/layout/WorkspaceCard";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import AdminTable from "@/components/admin/ui/AdminTable";
import AdminPager from "@/components/admin/ui/AdminPager";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import AdminUserIdentity from "@/components/admin/ui/AdminUserIdentity";
import { AdminRing } from "@/components/admin/ui/AdminCompositionChart";
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
  return <AdminCard bodyPadding="flush" title="사용자별 활동" actions={<Input aria-label="대시보드 사용자 검색" placeholder="이름·부서·이메일 검색" value={search} onChange={(_, data) => onSearchChange(data.value)} />}>
    {!rows ? <AdminAsyncState state={error ? "error" : "loading"} message={error} onRetry={onRetry} /> : <><AdminTable label="사용자별 활동 집계" rows={rows.items} emptyMessage="조건에 맞는 사용자가 없습니다." columns={[
      { id: "name", label: "사용자 / 부서", render: user => <AdminUserIdentity name={user.name} email={user.email} departmentName={user.departmentName} /> },
      { id: "activities", label: "총 활동 / 성공률", width: "16%", render: user => <div className="tw:flex tw:min-w-28 tw:items-center tw:gap-2">
        <AdminRing compact label={user.name + " 활동 결과"} segments={[
          { id: "success", label: "성공", count: user.activities - user.failures, color: "var(--kpc-success)" },
          { id: "failure", label: "실패", count: user.failures, color: "var(--kpc-danger)" },
        ]} />
        <span><strong className="tw:block tw:tabular-nums">{user.activities.toLocaleString("ko-KR")}<span className="tw:ml-0.5 tw:text-[10px] tw:font-normal">건</span></strong><span className="tw:block tw:text-[10px] tw:text-(--kpc-secondary) tw:tabular-nums">성공 {user.activities ? ((user.activities - user.failures) / user.activities * 100).toFixed(1) + "%" : "—"}</span></span>
      </div> }, { id: "rfp", label: "RFP 등록", align: "end", render: user => user.rfpCreates }, { id: "sections", label: "섹션 작성", align: "end", render: user => user.sectionWrites },
      { id: "gen", label: "AI 생성", align: "end", render: user => user.generations }, { id: "download", label: "다운로드", align: "end", render: user => user.downloads }, { id: "failure", label: "실패", align: "end", render: user => <span className={user.failures ? "tw:font-semibold tw:text-(--kpc-danger)" : ""}>{user.failures}</span> },
      { id: "tokens", label: "Token", align: "end", render: user => user.tokens.toLocaleString("ko-KR") }, { id: "cost", label: "예상 비용", align: "end", render: user => formatKrw(user.cost.krwMicros) },
    ]} /><WorkspaceCardSection><AdminPager {...rows} onChange={onPageChange} /></WorkspaceCardSection></>}
  </AdminCard>;
}
