"use client";
import { Button, Input, Select } from "@fluentui/react-components";
import { useState } from "react";
import { AdminCard, AdminMetric } from "@/components/admin/ui/AdminPrimitives";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import AdminPeriodFilter from "@/components/admin/ui/AdminPeriodFilter";
import { useAdminAccess, useAdminCommand, useAdminTokens } from "@/hooks/admin/use-admin-data";
import { formatKrw } from "@/lib/admin/cost";
import { formatTokenCount } from "@/lib/profile-preview";
import type { TokenQuery } from "@/types/admin";
import ModelCostTable from "./ModelCostTable";
import TokenAccountsTable from "./TokenAccountsTable";
import TokenPolicyForm from "./TokenPolicyForm";
const statuses: { value: TokenQuery["status"]; label: string }[] = [{ value: "all", label: "전체 상태" }, { value: "normal", label: "정상" }, { value: "warning", label: "경고" }, { value: "over", label: "초과" }, { value: "paused", label: "정지" }];
export default function TokenOverviewPanel(): React.ReactElement {
  const [query, setQuery] = useState<TokenQuery>({ month: "2026-10", from: "2026-10-01", to: "2026-10-20", departmentId: null, search: "", status: "all" }), [notice, setNotice] = useState("");
  const data = useAdminTokens(query), access = useAdminAccess(), command = useAdminCommand();
  const isSuper = access.data?.actor.role === "super_admin", canManage = Boolean(access.data?.grants.tokenPolicies.update);
  return <>
    <AdminCard title="사용량·비용 조회 기간"><AdminPeriodFilter value={{ from: query.from, to: query.to }} maxDate="2026-10-20" onChange={(period) => setQuery({ ...query, ...period })} /></AdminCard>
    {!data.data ? <AdminAsyncState state={data.isError ? "error" : "loading"} onRetry={() => void data.refetch()} /> : <>
      <div className="tw:grid tw:grid-cols-2 tw:gap-3 tw:lg:grid-cols-4"><AdminMetric label={isSuper ? "선택 기간 전사 사용량" : "선택 기간 부서 사용량"} value={formatTokenCount(data.data.usedTokens)} caption="Token" tone="brand" /><AdminMetric label={isSuper ? "전사 월 토큰 한도" : "부서 개인 한도 합계"} value={formatTokenCount(isSuper ? data.data.settings?.monthlyTokenLimit ?? 0 : data.data.personalLimitsTotal)} caption="2026년 10월 · Token" /><AdminMetric label="개인 한도 합계" value={formatTokenCount(data.data.personalLimitsTotal)} caption="2026년 10월 · Token" /><AdminMetric label="선택 기간 예상 비용" value={formatKrw(data.data.cost.krwMicros)} caption="사용 당시 단가·환율" /></div>
      <AdminCard title="부서별 사용량"><div className="tw:flex tw:flex-wrap tw:gap-2">{data.data.byDepartment.map((d) => <Button key={d.id} appearance={query.departmentId === d.id ? "primary" : "secondary"} disabled={!isSuper} onClick={() => setQuery({ ...query, departmentId: query.departmentId === d.id ? null : d.id })}>{d.name} · {formatTokenCount(d.usedTokens)} · {d.userCount}명</Button>)}{isSuper && query.departmentId && <Button appearance="subtle" onClick={() => setQuery({ ...query, departmentId: null })}>전체 부서</Button>}</div></AdminCard>
      <AdminCard title="개인별 토큰 사용량 · 2026년 10월"><div className="tw:mb-3 tw:flex tw:flex-wrap tw:gap-2"><Input aria-label="토큰 사용자 검색" placeholder="이름 또는 부서 검색" value={query.search} onChange={(_, d) => setQuery({ ...query, search: d.value })} /><Select aria-label="토큰 상태 필터" value={query.status} onChange={(_, d) => { const status = statuses.find((s) => s.value === d.value); if (status) setQuery({ ...query, status: status.value }); }}>{statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></div>
        {notice && <p role="status">{notice}</p>}{command.error && <p role="alert">{command.error.message}{command.error.code === "CONFLICT" && <Button onClick={() => void data.refetch()}>다시 불러오기</Button>}</p>}
        <TokenAccountsTable rows={data.data.rows} canManage={canManage} busy={command.isPending} onCommand={async (input) => { await command.mutateAsync(input); setNotice("개인 토큰 설정을 저장했습니다."); }} />
      </AdminCard>
      <AdminCard title="모델별 예상 비용"><ModelCostTable rows={data.data.models} total={data.data.cost} /></AdminCard>
      {data.data.settings && <AdminCard title="전사 토큰 정책"><TokenPolicyForm value={data.data.settings} canEdit={canManage} /></AdminCard>}
    </>}
  </>;
}
