"use client";
import Link from "next/link";
import { Button } from "@fluentui/react-components";
import { useState } from "react";
import { AdminCard, AdminPage } from "@/components/admin/ui/AdminPrimitives";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import AdminTabs from "@/components/admin/ui/AdminTabs";
import AdminPeriodFilter from "@/components/admin/ui/AdminPeriodFilter";
import { useAdminAccess, useAdminDashboard } from "@/hooks/admin/use-admin-data";
import type { DashboardQuery } from "@/types/admin";
import RfpDashboardPanel, { type RfpView } from "./RfpDashboardPanel";
import UsageTrendPanel, { type UsageMetric } from "./UsageTrendPanel";
import ActivityBreakdownPanel, { type BreakdownKind } from "./ActivityBreakdownPanel";
import UserActivityPanel from "./UserActivityPanel";
import DashboardActivitySummary from "./DashboardActivitySummary";

const dashboardTabs = [{ value: "rfp", label: "RFP 현황" }, { value: "trend", label: "사용량 트렌드" }, { value: "activity", label: "작업·리소스 상세" }, { value: "users", label: "사용자별 현황" }] as const;
type DashboardTab = typeof dashboardTabs[number]["value"];
interface DashboardUiState {
  rfpView: RfpView; departmentPage: number; userPage: number; focusRfpList: boolean;
  chartKind: "bar" | "line"; trendMetric: UsageMetric; breakdownKind: BreakdownKind; breakdownPage: number;
}
export default function DashboardPage(): React.ReactElement {
  const [tab, setTab] = useState<DashboardTab>("rfp");
  const [ui, setUi] = useState<DashboardUiState>({ rfpView: "overview", departmentPage: 1, userPage: 1, focusRfpList: false, chartKind: "bar", trendMetric: "activities", breakdownKind: "actions", breakdownPage: 1 });
  const [query, setQuery] = useState<DashboardQuery>({ from: "2025-01-01", to: "2026-10-20", rfpStatus: "all", bucketStart: null, userSearch: "", rfpPage: 1 });
  const data = useAdminDashboard(query), access = useAdminAccess(), view = data.data;
  const updateUi = (patch: Partial<DashboardUiState>) => setUi(current => ({ ...current, ...patch }));
  const retry = () => { void data.refetch(); };
  if (!access.data) return <AdminPage title="대시보드"><AdminAsyncState state={access.isError ? "error" : "loading"} onRetry={() => void access.refetch()} /></AdminPage>;
  if (!access.data.grants.dashboard.read) return <AdminPage title="대시보드"><AdminAsyncState state="forbidden" /></AdminPage>;

  return <AdminPage title="대시보드" description={access.data.actor.role === "super_admin" ? "전사 제안 현황과 AI 활용을 살펴봅니다." : "우리 부서의 제안 현황과 AI 활용을 살펴봅니다."} actions={access.data.grants.audit.read && <Link href="/workspace/audit" className="tw:text-(--kpc-brand) tw:no-underline">활동 로그 보기 →</Link>}>
    <AdminCard><div className="tw:flex tw:flex-wrap tw:items-end tw:justify-between tw:gap-(--layout-control-gap)">
      <AdminPeriodFilter value={{ from: query.from, to: query.to }} maxDate="2026-10-20" onChange={(period) => {
        setQuery(current => ({ ...current, ...period, bucketStart: null, rfpPage: 1 }));
        updateUi({ departmentPage: 1, userPage: 1, breakdownPage: 1, focusRfpList: false });
      }} />
      <span className="tw:text-[11px] tw:text-(--kpc-muted)">조회 범위 · {access.data.actor.role === "super_admin" ? "전사" : "소속 부서"}</span>
    </div></AdminCard>
    <AdminTabs<DashboardTab> label="대시보드 탭" value={tab} options={dashboardTabs} onChange={setTab} />
    {tab !== "rfp" && <DashboardActivitySummary view={view} />}
    {data.isError && view && <div role="alert" className="tw:flex tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap)">최신 데이터를 불러오지 못했습니다. <Button size="small" onClick={retry}>다시 시도</Button></div>}
    {tab === "users" ? <UserActivityPanel view={view} error={data.error?.message} onRetry={retry} search={query.userSearch}
      onSearchChange={(userSearch) => { setQuery(current => ({ ...current, userSearch })); updateUi({ userPage: 1 }); }}
      page={ui.userPage} onPageChange={(userPage) => updateUi({ userPage })} /> : !view ? <AdminAsyncState state={data.isError ? "error" : "loading"} onRetry={retry} /> : <>
      {tab === "rfp" && <RfpDashboardPanel view={view} query={query} onChange={setQuery} activeView={ui.rfpView}
        onViewChange={(rfpView) => updateUi({ rfpView, focusRfpList: false })} departmentPage={ui.departmentPage} onDepartmentPageChange={(departmentPage) => updateUi({ departmentPage })}
        onDrillDown={(next) => { setQuery(next); updateUi({ rfpView: "list", focusRfpList: true }); }} focusList={ui.focusRfpList} onListFocused={() => updateUi({ focusRfpList: false })} />}
      {tab === "trend" && <UsageTrendPanel view={view} chartKind={ui.chartKind} onChartKindChange={(chartKind) => updateUi({ chartKind })} metric={ui.trendMetric} onMetricChange={(trendMetric) => updateUi({ trendMetric })} />}
      {tab === "activity" && <ActivityBreakdownPanel view={view} kind={ui.breakdownKind} onKindChange={(breakdownKind) => updateUi({ breakdownKind, breakdownPage: 1 })} page={ui.breakdownPage} onPageChange={(breakdownPage) => updateUi({ breakdownPage })} />}
    </>}
  </AdminPage>;
}
