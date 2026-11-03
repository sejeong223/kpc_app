import { ArrowDownloadRegular, ArrowRightRegular, DataUsageRegular, FlashRegular, PeopleRegular, SparkleRegular } from "@fluentui/react-icons";
import Button from "@/components/common/Button";
import { DASHBOARD_CHART_COLORS } from "@/config/dashboard-charts";
import { formatKrw } from "@/lib/admin/cost";
import { formatTokenCount } from "@/lib/profile-preview";
import type { DashboardView } from "@/types/admin";

import DashboardCard from "./DashboardCard";

interface DashboardActivitySummaryProps { view?: DashboardView; onOpen?: () => void }
export default function DashboardActivitySummary({ view, onOpen }: DashboardActivitySummaryProps): React.ReactElement {
  const metrics = [
    { label: "총 활동", value: view?.activities.toLocaleString("ko-KR"), unit: "건", icon: <FlashRegular />, color: DASHBOARD_CHART_COLORS.activities },
    { label: "활성 사용자", value: view?.activeUsers.toLocaleString("ko-KR"), unit: "명", icon: <PeopleRegular />, color: DASHBOARD_CHART_COLORS.activeUsers },
    { label: "AI 생성", value: view?.generations.toLocaleString("ko-KR"), unit: "회", icon: <SparkleRegular />, color: DASHBOARD_CHART_COLORS.tokens },
    { label: "다운로드", value: view?.downloads.toLocaleString("ko-KR"), unit: "회", icon: <ArrowDownloadRegular />, color: DASHBOARD_CHART_COLORS.activities },
    { label: "AI Token", value: view ? formatTokenCount(view.tokens) : undefined, unit: "", icon: <DataUsageRegular />, color: DASHBOARD_CHART_COLORS.tokens },
  ];
  return <DashboardCard title="활동 요약" actions={onOpen ? <Button className="ghost tw:h-7 tw:px-2 tw:text-xs" onClick={onOpen}>사용량 분석 <ArrowRightRegular aria-hidden="true" /></Button> : undefined}>
    <p className="tw:text-[11px] tw:text-(--kpc-secondary)">{!view ? "활동 집계 기간" : view.activityPeriod ? `${view.activityPeriod.from} — ${view.activityPeriod.to}` : "집계 가능한 활동 기간 없음"}{view?.activityCapped && " · 최근 90일 보관 범위"}</p>
    <dl className="tw:m-0 tw:grid tw:grid-cols-[repeat(auto-fit,minmax(80px,1fr))] tw:gap-x-3 tw:gap-y-4">
      {metrics.map(metric => <div key={metric.label} className="tw:min-w-0"><dt className="tw:mb-2 tw:flex tw:items-center tw:gap-1.5 tw:text-[11px] tw:text-(--kpc-secondary)"><span aria-hidden="true" className="tw:text-base" style={{ color: metric.color }}>{metric.icon}</span>{metric.label}</dt><dd className="tw:m-0 tw:whitespace-nowrap tw:text-xl tw:font-semibold tw:tracking-tight tw:tabular-nums">{metric.value ?? "—"}<span className="tw:ml-1 tw:text-[10px] tw:font-normal tw:text-(--kpc-muted)">{metric.unit}</span></dd></div>)}
    </dl>
    <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:border-0 tw:border-t tw:border-solid tw:border-(--kpc-line-soft) tw:pt-3 tw:text-[11px] tw:text-(--kpc-secondary)"><span>활동 로그·사용량 원장 기준</span><span>예상 비용 <strong className="tw:ml-1 tw:font-semibold tw:text-(--kpc-ink)">{view ? formatKrw(view.cost.krwMicros) : "—"}</strong></span></div>
  </DashboardCard>;
}
