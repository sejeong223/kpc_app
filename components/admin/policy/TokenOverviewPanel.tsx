"use client";
import { ProgressBar } from "@fluentui/react-components";
import { useState } from "react";
import WorkspaceToolbar from "@/components/layout/WorkspaceToolbar";
import { WorkspaceCardSection } from "@/components/layout/WorkspaceCard";
import { DadamButton as Button, DadamInput as Input, DadamSelect as Select } from "@/components/ui/DadamControls";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import AdminPager from "@/components/admin/ui/AdminPager";
import AdminPeriodFilter from "@/components/admin/ui/AdminPeriodFilter";
import { ADMIN_DEMO_TIME } from "@/config/admin-seed";
import { DEFAULT_PAGE_SIZE } from "@/config/pagination";
import { useAdminAccess, useAdminCommand, useAdminTokens } from "@/hooks/admin/use-admin-data";
import { formatKrw } from "@/lib/admin/cost";
import { toKoreanDay } from "@/lib/admin/dates";
import { paginate } from "@/lib/admin/selectors";
import { formatTokenCount } from "@/lib/profile-preview";
import type { TokenQuery } from "@/types/admin";
import ModelCostTable from "./ModelCostTable";
import TokenAccountsTable from "./TokenAccountsTable";
import TokenMonthSummary from "./TokenMonthSummary";

const statuses: { value: TokenQuery["status"]; label: string }[] = [{ value: "all", label: "전체" }, { value: "normal", label: "정상" }, { value: "warning", label: "경고" }, { value: "over", label: "초과" }, { value: "paused", label: "정지" }];
const today = toKoreanDay(ADMIN_DEMO_TIME), month = today.slice(0, 7);
const initialQuery: TokenQuery = { month, from: month + "-01", to: today, departmentId: null, search: "", status: "all" };
export default function TokenOverviewPanel(): React.ReactElement {
  const [query, setQuery] = useState<TokenQuery>(initialQuery);
  const [page, setPage] = useState(1), [notice, setNotice] = useState("");
  const monthly = useAdminTokens(initialQuery), data = useAdminTokens(query), access = useAdminAccess(), command = useAdminCommand();
  const isSuper = access.data?.actor.role === "super_admin", canManage = Boolean(access.data?.grants.tokenPolicies.update);
  function filter(change: Partial<Pick<TokenQuery, "search" | "status" | "departmentId">>) { setQuery((current) => ({ ...current, ...change })); setPage(1); setNotice(""); command.reset(); }
  if (!monthly.data) return <AdminAsyncState state={monthly.isError ? "error" : "loading"} onRetry={() => void monthly.refetch()} />;
  const overview = monthly.data, rows = paginate(data.data?.rows ?? [], { page, pageSize: DEFAULT_PAGE_SIZE });
  const monthLabel = `${query.month.slice(0, 4)}년 ${Number(query.month.slice(5))}월`;
  const largestDepartment = Math.max(1, ...overview.byDepartment.map((department) => department.usedTokens));
  const selectedDepartment = overview.departments.find((department) => department.id === query.departmentId);
  return <>
    {monthly.isError && <AdminAsyncState state="error" onRetry={() => void monthly.refetch()} />}
    <TokenMonthSummary value={overview} monthLabel={monthLabel} canEdit={canManage} isSuper={Boolean(isSuper)} />
    <AdminCard title="부서별 사용량" actions={<Button size="small" aria-pressed={query.departmentId === null} onClick={() => filter({ departmentId: null })}>전체 부서</Button>}>
      <div className="tw:grid tw:grid-cols-1 tw:gap-(--layout-control-gap) tw:sm:grid-cols-2 tw:xl:grid-cols-3">
        {overview.byDepartment.map((department) => <button type="button" key={department.id} aria-pressed={query.departmentId === department.id} onClick={() => filter({ departmentId: query.departmentId === department.id ? null : department.id })}
          className={"tw:min-w-0 tw:cursor-pointer tw:rounded-(--dadam-control-radius) tw:border tw:border-solid tw:p-(--layout-control-gap) tw:text-left tw:text-inherit tw:focus-visible:outline-2 tw:focus-visible:outline-(--kpc-brand) " + (query.departmentId === department.id ? "tw:border-(--kpc-brand) tw:bg-(--kpc-brand-soft)" : "tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:hover:border-(--kpc-brand)")}>
          <span className="tw:mb-(--layout-control-gap) tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-(--layout-inline-gap)"><strong>{department.name}</strong><span>{formatTokenCount(department.usedTokens)} Token · {department.userCount}명</span></span>
          <ProgressBar aria-label={department.name + " 부서 사용량 비교"} value={department.usedTokens / largestDepartment} />
        </button>)}
        {!overview.byDepartment.length && <p>조회할 부서가 없습니다.</p>}
      </div>
    </AdminCard>
    <AdminCard bodyPadding="flush" title="개인별 토큰 사용량" actions={<span className="tw:text-[11px] tw:text-(--kpc-muted)">{monthLabel} · {data.data ? rows.total : "—"}명</span>}>
      <WorkspaceCardSection afterHeader>
        <WorkspaceToolbar>
          <Input aria-label="토큰 사용자 검색" placeholder="이름 또는 부서 검색" value={query.search} onChange={(_, d) => filter({ search: d.value })} />
          <Select aria-label="토큰 부서 필터" value={query.departmentId ?? ""} onChange={(_, d) => filter({ departmentId: d.value || null })}><option value="">전체 부서</option>{overview.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select>
          <SegmentedControl ariaLabel="토큰 상태 필터" variant="chips" value={query.status} options={statuses.map((status) => ({ value: status.value, label: `${status.label} ${data.data?.statusCounts[status.value] ?? "—"}명` }))} onChange={(status) => filter({ status })} />
          {(query.search || query.departmentId || query.status !== "all") && <Button size="small" onClick={() => filter({ search: "", departmentId: null, status: "all" })}>필터 초기화</Button>}
        </WorkspaceToolbar>
        {notice && <p role="status">{notice}</p>}{command.error && <p role="alert">{command.error.message}{command.error.code === "CONFLICT" && <> 입력값은 유지됩니다. 해당 행의 ‘최신 값’으로 초기화 후 다시 변경해 주세요.</>}<Button size="small" onClick={() => void data.refetch()}>다시 불러오기</Button></p>}
      </WorkspaceCardSection>
      {!data.data ? <AdminAsyncState state={data.isError ? "error" : "loading"} onRetry={() => void data.refetch()} /> : <>
        {data.isError && <AdminAsyncState state="error" onRetry={() => void data.refetch()} />}
        <TokenAccountsTable rows={rows.items} canManage={canManage} busy={command.isPending} onCommand={async (input) => { setNotice(""); await command.mutateAsync(input); setNotice("개인 토큰 설정을 저장했습니다."); }} />
        <WorkspaceCardSection><AdminPager page={rows.page} total={rows.total} pageSize={rows.pageSize} onChange={setPage} /></WorkspaceCardSection>
      </>}
    </AdminCard>
    <AdminCard bodyPadding="flush" title="모델별 예상 비용" actions={<AdminPeriodFilter compact value={{ from: query.from, to: query.to }} maxDate={today} onChange={(period) => setQuery({ ...query, ...period })} />}>
      {data.data ? <>
        <WorkspaceCardSection afterHeader><div className="tw:flex tw:flex-wrap tw:gap-(--layout-section-gap)"><span>{selectedDepartment?.name ?? (isSuper ? "전사" : "소속 부서")} · {query.from} ~ {query.to}</span><strong>{formatTokenCount(data.data.usedTokens)} Token</strong><strong>{formatKrw(data.data.cost.krwMicros)}</strong></div></WorkspaceCardSection>
        <ModelCostTable rows={data.data.models} total={data.data.cost} />
      </> : <AdminAsyncState state={data.isError ? "error" : "loading"} onRetry={() => void data.refetch()} />}
    </AdminCard>
  </>;
}
