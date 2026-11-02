"use client";
import { Button } from "@fluentui/react-components";
import WorkspaceToolbar from "@/components/layout/WorkspaceToolbar";
import { AdminCard, AdminMetric } from "@/components/admin/ui/AdminPrimitives";
import { AdminBreakdown, AdminSeriesChart } from "@/components/admin/ui/AdminCharts";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { RFP_STATUS_LABELS } from "@/config/admin-labels";
import { RfpStatusSchema } from "@/lib/admin/schemas";
import type { DashboardQuery, DashboardView, RfpStatus } from "@/types/admin";
import RfpRecordsPanel from "./RfpRecordsPanel";
import RfpDepartmentsPanel from "./RfpDepartmentsPanel";

const views = [{ value: "overview", label: "요약" }, { value: "list", label: "RFP 목록" }, { value: "departments", label: "부서별 현황" }] as const;
export type RfpView = typeof views[number]["value"];
interface RfpDashboardPanelProps {
  view: DashboardView; query: DashboardQuery; onChange(query: DashboardQuery): void;
  activeView: RfpView; onViewChange(value: RfpView): void;
  departmentPage: number; onDepartmentPageChange(page: number): void;
  onDrillDown(query: DashboardQuery): void; focusList: boolean; onListFocused(): void;
}
const statuses: RfpStatus[] = ["review", "writing", "submitted", "won", "lost", "dropped"];
const winRate = (won: number, lost: number): string => won + lost === 0 ? "—" : (won / (won + lost) * 100).toFixed(1) + "%";

export default function RfpDashboardPanel({ view, query, onChange, activeView, onViewChange, departmentPage, onDepartmentPageChange, onDrillDown, focusList, onListFocused }: RfpDashboardPanelProps): React.ReactElement {
  const bucket = view.registrations.find(row => row.id === query.bucketStart);
  const cards: { id: DashboardQuery["rfpStatus"]; label: string; count: number }[] = [
    { id: "all", label: "전체 RFP", count: view.totalRfps }, { id: "progress", label: "진행 중", count: view.rfpCounts.review + view.rfpCounts.writing },
    { id: "submitted", label: "제출·결과 대기", count: view.rfpCounts.submitted }, { id: "won", label: "수주", count: view.rfpCounts.won },
    { id: "lost", label: "수주 실패", count: view.rfpCounts.lost }, { id: "dropped", label: "진행 안함", count: view.rfpCounts.dropped },
  ];
  const stats = [
    { label: "선택 구간 등록", value: view.selectedRfpCount + "건" },
    { label: "선택 구간 수주율", value: winRate(view.distribution.won, view.distribution.lost), hint: "수주 / (수주 + 실패)" },
    { label: "선택 구간 수주 금액", value: (view.wonBudgetKrw / 100000000).toLocaleString("ko-KR", { maximumFractionDigits: 2 }) + "억 원", hint: "예산 기준" },
    { label: "선택 구간 결과 대기", value: view.distribution.submitted + "건" },
  ];
  const statusLabel = query.rfpStatus === "all" ? "전체 상태" : query.rfpStatus === "progress" ? "진행 중" : RFP_STATUS_LABELS[query.rfpStatus];
  return <>
    <div aria-label="조회 기간 전체 RFP 요약" className="tw:grid tw:grid-cols-2 tw:gap-(--layout-section-gap) tw:md:grid-cols-3 tw:xl:grid-cols-6">
      {cards.map(card => <AdminMetric key={card.id} label={card.label} value={String(card.count)} selected={query.rfpStatus === card.id} tone={card.id === "won" ? "success" : card.id === "lost" ? "danger" : "neutral"}
        onClick={() => onDrillDown({ ...query, rfpStatus: query.rfpStatus === card.id ? "all" : card.id, rfpPage: 1 })} />)}
    </div>
    <WorkspaceToolbar align="center" className="tw:justify-between">
      <SegmentedControl ariaLabel="RFP 보기" options={views} value={activeView} onChange={onViewChange} />
      {activeView !== "departments" && <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap)">
        {bucket ? <Button size="small" aria-label="RFP 등록 구간 해제" onClick={() => onChange({ ...query, bucketStart: null, rfpPage: 1 })}>{bucket.label} 등록분 ×</Button> : <span className="tw:text-[11px] tw:text-(--kpc-secondary)">조회 기간 전체</span>}
        {query.rfpStatus !== "all" ? <Button size="small" aria-label="RFP 상태 필터 해제" onClick={() => onChange({ ...query, rfpStatus: "all", rfpPage: 1 })}>{statusLabel} ×</Button> : <span className="tw:text-[11px] tw:text-(--kpc-secondary)">전체 상태</span>}
        {query.bucketStart && query.rfpStatus !== "all" && <Button size="small" onClick={() => onChange({ ...query, bucketStart: null, rfpStatus: "all", rfpPage: 1 })}>RFP 필터 초기화</Button>}
      </div>}
    </WorkspaceToolbar>
    {activeView === "overview" && <div className="tw:grid tw:items-start tw:gap-(--layout-section-gap) tw:lg:grid-cols-2">
      <AdminCard title="RFP 등록 추이 · 조회 기간 전체">
        <AdminSeriesChart label="등록 추이" kind="bar" unit="건" points={view.registrations.map(row => ({ id: row.id, label: row.label, value: row.count, tooltip: row.from + " 이후 등록 " + row.count + "건" }))}
          selectedId={query.bucketStart} onSelect={(id) => onDrillDown({ ...query, bucketStart: id, rfpPage: 1 })} />
        <dl className="tw:m-0 tw:grid tw:grid-cols-2 tw:gap-(--layout-control-gap) tw:border-0 tw:border-t tw:border-solid tw:border-(--kpc-line-soft) tw:pt-(--layout-section-gap)">
          {stats.map(stat => <div key={stat.label}><dt className="tw:text-[11px] tw:text-(--kpc-muted)">{stat.label}</dt><dd className="tw:m-0 tw:text-[16px] tw:font-bold tw:tabular-nums">{stat.value}</dd>{stat.hint && <span className="tw:text-[10px] tw:text-(--kpc-muted)">{stat.hint}</span>}</div>)}
        </dl>
      </AdminCard>
      <AdminCard title={bucket ? bucket.label + " 등록분 · 결과 분포" : "조회 기간 전체 · 결과 분포"}>
        <p className="tw:text-[11px] tw:text-(--kpc-muted)">지표나 차트를 선택하면 해당 조건의 RFP 목록으로 이동합니다.</p>
        <AdminBreakdown label="RFP 결과 분포" items={statuses.map(id => ({ id, label: RFP_STATUS_LABELS[id], count: view.distribution[id], failures: 0 }))} selectedId={query.rfpStatus} onSelect={(id) => {
          const result = RfpStatusSchema.safeParse(id); onDrillDown({ ...query, rfpStatus: result.success ? result.data : "all", rfpPage: 1 });
        }} />
      </AdminCard>
    </div>}
    {activeView === "list" && <RfpRecordsPanel rows={view.rfps} query={query} bucketLabel={bucket?.label ?? null} onChange={onChange} focusRequested={focusList} onFocused={onListFocused} />}
    {activeView === "departments" && <RfpDepartmentsPanel rows={view.departments} page={departmentPage} onPageChange={onDepartmentPageChange} />}
  </>;
}
