"use client";
import Link from "next/link";
import Button from "@/components/common/Button";
import { useEffect, useRef, useState } from "react";
import WorkspaceActionRow from "@/components/layout/WorkspaceActionRow";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { AdminPage } from "@/components/admin/ui/AdminPrimitives";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import AdminTabs from "@/components/admin/ui/AdminTabs";
import AdminPeriodFilter from "@/components/admin/ui/AdminPeriodFilter";
import { useAdminAccess, useAdminDashboard } from "@/hooks/admin/use-admin-data";
import type { DashboardQuery } from "@/types/admin";
import RfpStatisticsPanel from "./RfpStatisticsPanel";
import RfpRecordsPanel from "./RfpRecordsPanel";
import UsageTrendPanel from "./UsageTrendPanel";
import ActivityBreakdownPanel, { type BreakdownKind } from "./ActivityBreakdownPanel";
import UserActivityPanel from "./UserActivityPanel";
import DashboardActivitySummary from "./DashboardActivitySummary";
import RfpSummary from "./RfpSummary";
import DashboardOverview from "./DashboardOverview";
import RfpDepartmentsPanel from "./RfpDepartmentsPanel";

const dashboardTabs = [{ value: "overview", label: "개요" }, { value: "rfp", label: "RFP 현황" }, { value: "trend", label: "사용량 트렌드" }, { value: "activity", label: "작업·리소스" }, { value: "users", label: "사용자별 현황" }] as const;
type DashboardTab = typeof dashboardTabs[number]["value"];
interface DashboardUiState {
  departmentPage: number; userPage: number; focusRfpList: boolean;
  rfpView: "records" | "statistics" | "departments";
  chartKind: "bar" | "line"; breakdownPages: Record<BreakdownKind, number>;
}
export default function DashboardPage(): React.ReactElement {
  const [tab, setTab] = useState<DashboardTab>("overview");
  const [ui, setUi] = useState<DashboardUiState>({ departmentPage: 1, userPage: 1, focusRfpList: false, rfpView: "records", chartKind: "line", breakdownPages: { actions: 1, resources: 1, details: 1 } });
  const [query, setQuery] = useState<DashboardQuery>({ from: "2025-01-01", to: "2026-10-20", rfpStatus: "all", bucketStart: null, userSearch: "", rfpPage: 1 });
  // 상태/페이지를 조회하는 동안에도 같은 기간의 요약 숫자와 버튼을 유지한다.
  const summary = useAdminDashboard({ ...query, rfpStatus: "all", bucketStart: null, userSearch: "", rfpPage: 1 });
  const data = useAdminDashboard(query), access = useAdminAccess();
  const activeData = tab === "overview" || tab === "trend" || tab === "activity" || tab === "rfp" && ui.rfpView === "departments" ? summary : data;
  const view = activeData.data, summaryView = summary.data ?? data.data;
  const panel = useRef<HTMLDivElement>(null), focusPanel = useRef(false);
  useEffect(() => {
    if (focusPanel.current) { panel.current?.focus({ preventScroll: true }); focusPanel.current = false; }
  }, [tab, ui.rfpView]);
  const updateUi = (patch: Partial<DashboardUiState>) => setUi(current => ({ ...current, ...patch }));
  const showRfpList = (next: DashboardQuery, focus = false) => { setQuery(next); setTab("rfp"); updateUi({ rfpView: "records", focusRfpList: focus }); };
  const openUsage = () => { focusPanel.current = true; setTab("trend"); updateUi({ focusRfpList: false }); };
  const openDepartments = () => { focusPanel.current = true; setTab("rfp"); updateUi({ rfpView: "departments", departmentPage: 1, focusRfpList: false }); };
  const retry = () => { void activeData.refetch(); };
  if (!access.data) return <AdminPage title="대시보드"><AdminAsyncState state={access.isError ? "error" : "loading"} onRetry={() => void access.refetch()} /></AdminPage>;
  if (!access.data.grants.dashboard.read) return <AdminPage title="대시보드"><AdminAsyncState state="forbidden" /></AdminPage>;

  return <AdminPage title="대시보드">
    <WorkspaceActionRow className="tw:border-0 tw:border-b tw:border-solid tw:border-(--kpc-line) tw:pb-2" actions={<>
      <AdminPeriodFilter compact value={{ from: query.from, to: query.to }} maxDate="2026-10-20" onChange={(period) => {
        setQuery(current => ({ ...current, ...period, bucketStart: null, rfpPage: 1 }));
        updateUi({ departmentPage: 1, userPage: 1, breakdownPages: { actions: 1, resources: 1, details: 1 }, focusRfpList: false });
      }} />
      {access.data.grants.audit.read && <Link href="/workspace/audit" className="tw:inline-flex tw:min-h-(--dadam-control-height-compact) tw:items-center tw:whitespace-nowrap tw:rounded-(--dadam-control-radius) tw:border tw:border-solid tw:border-(--dadam-control-border) tw:bg-(--kpc-card) tw:px-(--layout-control-gap) tw:text-xs tw:text-(--dadam-control-ink) tw:no-underline tw:hover:bg-(--dadam-control-muted)">활동 로그 →</Link>}
    </>}>
      <AdminTabs<DashboardTab> label="대시보드 탭" value={tab} options={dashboardTabs} onChange={value => { focusPanel.current = false; setTab(value); updateUi({ focusRfpList: false }); }} />
    </WorkspaceActionRow>
    {tab === "rfp" && <WorkspaceActionRow actions={<SegmentedControl ariaLabel="RFP 보기" value={ui.rfpView} options={[{ value: "records", label: "목록" }, { value: "statistics", label: "추이·분포" }, { value: "departments", label: "부서별" }]} onChange={rfpView => updateUi({ rfpView, focusRfpList: false })} />}>
      <RfpSummary view={summaryView} status={query.rfpStatus} onSelect={rfpStatus => showRfpList({ ...query, rfpStatus, bucketStart: null, rfpPage: 1 })} />
    </WorkspaceActionRow>}
    <div ref={panel} role="region" aria-label={(dashboardTabs.find(item => item.value === tab)?.label ?? "대시보드") + " 분석 영역"} tabIndex={-1} className="tw:flex tw:min-w-0 tw:flex-col tw:gap-(--layout-section-gap) tw:rounded-(--kpc-radius-card) tw:focus-visible:outline-2 tw:focus-visible:outline-(--kpc-brand)">
    {tab !== "overview" && tab !== "rfp" && <DashboardActivitySummary view={summaryView} />}
    {activeData.isError && view && <div role="alert" className="tw:flex tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap)">최신 데이터를 불러오지 못했습니다. <Button className="tw:h-8" onClick={retry}>다시 시도</Button></div>}
    {tab === "rfp" && ui.rfpView === "records" ? <RfpRecordsPanel rows={view?.rfps} query={query} bucketLabel={view?.registrations.find(row => row.id === query.bucketStart)?.label ?? query.bucketStart} onChange={setQuery}
      error={activeData.error?.message} onRetry={retry} focusRequested={ui.focusRfpList} onFocused={() => updateUi({ focusRfpList: false })} /> : tab === "users" ? <UserActivityPanel view={view} error={activeData.error?.message} onRetry={retry} search={query.userSearch}
      onSearchChange={(userSearch) => { setQuery(current => ({ ...current, userSearch })); updateUi({ userPage: 1 }); }}
      page={ui.userPage} onPageChange={(userPage) => updateUi({ userPage })} /> : !view ? <AdminAsyncState state={activeData.isError ? "error" : "loading"} onRetry={retry} /> : <>
      {tab === "overview" && <DashboardOverview view={view} query={query} onShowList={next => showRfpList(next, true)} onOpenUsage={openUsage} onOpenDepartments={openDepartments} />}
      {tab === "rfp" && ui.rfpView === "departments" && <RfpDepartmentsPanel rows={view.departments} page={ui.departmentPage} onPageChange={departmentPage => updateUi({ departmentPage })} />}
      {tab === "rfp" && ui.rfpView === "statistics" && <RfpStatisticsPanel view={view} query={query} onChange={setQuery}
        onShowList={(next) => showRfpList(next, true)} />}
      {tab === "trend" && <UsageTrendPanel view={view} chartKind={ui.chartKind} onChartKindChange={(chartKind) => updateUi({ chartKind })} />}
      {tab === "activity" && <ActivityBreakdownPanel view={view} pages={ui.breakdownPages} onPageChange={(kind, page) => setUi(current => ({ ...current, breakdownPages: { ...current.breakdownPages, [kind]: page } }))} />}
    </>}
    </div>
  </AdminPage>;
}
