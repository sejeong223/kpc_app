"use client";
import Link from "next/link";
import { useState } from "react";
import { AdminCard, AdminMetric, AdminPage } from "@/components/admin/ui/AdminPrimitives";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import AdminTabs from "@/components/admin/ui/AdminTabs";
import AdminPeriodFilter from "@/components/admin/ui/AdminPeriodFilter";
import { useAdminAccess, useAdminDashboard } from "@/hooks/admin/use-admin-data";
import { formatKrw } from "@/lib/admin/cost";
import { formatTokenCount } from "@/lib/profile-preview";
import type { DashboardQuery } from "@/types/admin";
import RfpDashboardPanel from "./RfpDashboardPanel";
import UsageTrendPanel from "./UsageTrendPanel";
import ActivityBreakdownPanel from "./ActivityBreakdownPanel";
import UserActivityPanel from "./UserActivityPanel";
type DashboardTab = "rfp" | "trend" | "activity" | "users";
export default function DashboardPage(): React.ReactElement {
  const [tab, setTab] = useState<DashboardTab>("rfp"), [chartKind, setChartKind] = useState<"bar" | "line">("bar");
  const [query, setQuery] = useState<DashboardQuery>({ from: "2025-01-01", to: "2026-10-20", rfpStatus: "all", bucketStart: null, userSearch: "", rfpPage: 1 });
  const data = useAdminDashboard(query), access = useAdminAccess(), view = data.data;
  if (!access.data?.grants.dashboard.read) return <AdminAsyncState state="forbidden" />;
  const cards: { id: DashboardQuery["rfpStatus"]; label: string; count: number }[] = view ? [{ id: "all", label: "전체 RFP", count: view.totalRfps }, { id: "progress", label: "진행 중", count: view.rfpCounts.review + view.rfpCounts.writing }, { id: "submitted", label: "제출·결과 대기", count: view.rfpCounts.submitted }, { id: "won", label: "수주", count: view.rfpCounts.won }, { id: "lost", label: "수주 실패", count: view.rfpCounts.lost }, { id: "dropped", label: "진행 안함", count: view.rfpCounts.dropped }] : [];
  return <AdminPage title="대시보드" description={access.data.actor.role === "super_admin" ? "전사 제안 현황과 AI 활용을 살펴봅니다." : "우리 부서의 제안 현황과 AI 활용을 살펴봅니다."} actions={access.data.grants.audit.read && <Link href="/workspace/audit" className="tw:text-(--kpc-brand) tw:no-underline">활동 로그 보기 →</Link>}>
    <AdminCard title="공통 조회 기간"><AdminPeriodFilter value={{ from: query.from, to: query.to }} maxDate="2026-10-20" onChange={(period) => setQuery({ ...query, ...period, bucketStart: null, rfpPage: 1 })} /></AdminCard>
    {view && <><div className="tw:grid tw:grid-cols-2 tw:gap-3 tw:md:grid-cols-3 tw:xl:grid-cols-6">{cards.map((c) => <AdminMetric key={c.id} label={c.label} value={String(c.count)} selected={query.rfpStatus === c.id} tone={c.id === "won" ? "success" : c.id === "lost" ? "danger" : "neutral"} onClick={() => { setTab("rfp"); setQuery({ ...query, rfpStatus: query.rfpStatus === c.id ? "all" : c.id, rfpPage: 1 }); }} />)}</div>
      {view.activityCapped && <p role="status" className="tw:m-0 tw:text-[11px] tw:text-(--kpc-secondary)">{view.activityPeriod ? "활동·토큰 집계는 최근 90일 중 " + view.activityPeriod.from + " ~ " + view.activityPeriod.to + "입니다. RFP는 공통 조회 기간을 사용합니다." : "선택 기간에 보관된 활동이 없습니다. 활동은 최근 90일까지만 제공됩니다."}</p>}
      <div className="tw:grid tw:grid-cols-2 tw:gap-3 tw:lg:grid-cols-5"><AdminMetric label="총 활동" value={view.activities.toLocaleString("ko-KR")} /><AdminMetric label="활성 사용자" value={String(view.activeUsers)} caption="명" /><AdminMetric label="AI 생성" value={view.generations.toLocaleString("ko-KR")} /><AdminMetric label="다운로드" value={String(view.downloads)} /><AdminMetric label="토큰 사용량" value={formatTokenCount(view.tokens)} caption={formatKrw(view.cost.krwMicros) + " 예상 비용"} tone="brand" /></div></>}
    <AdminTabs<DashboardTab> label="대시보드 탭" value={tab} options={[{ value: "rfp", label: "RFP 현황" }, { value: "trend", label: "사용량 트렌드" }, { value: "activity", label: "작업·리소스 상세" }, { value: "users", label: "사용자별 현황" }]} onChange={setTab} />
    {!view ? <AdminAsyncState state={data.isError ? "error" : "loading"} onRetry={() => void data.refetch()} /> : <>{tab === "rfp" && <RfpDashboardPanel view={view} query={query} onChange={setQuery} />}{tab === "trend" && <UsageTrendPanel view={view} chartKind={chartKind} onChartKindChange={setChartKind} />}{tab === "activity" && <ActivityBreakdownPanel view={view} />}{tab === "users" && <UserActivityPanel view={view} search={query.userSearch} onSearchChange={(userSearch) => setQuery({ ...query, userSearch })} />}</>}
  </AdminPage>;
}
