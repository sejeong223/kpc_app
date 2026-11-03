"use client";
import DashboardCard from "./DashboardCard";
import { AdminSeriesChart } from "@/components/admin/ui/AdminCharts";
import AdminCalendarHeatmap from "@/components/admin/ui/AdminCalendarHeatmap";
import AdminChartDataTable from "@/components/admin/ui/AdminChartDataTable";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { DASHBOARD_CHART_COLORS } from "@/config/dashboard-charts";
import { sumWeeklyChartPoints } from "@/lib/admin/chart-data";
import type { DashboardView } from "@/types/admin";

const metrics = [
  { value: "activities", title: "일별 활동 이벤트 수", unit: "건", area: true },
  { value: "tokens", title: "일별 AI Token 사용량", unit: "Token", area: true },
  { value: "activeUsers", title: "일별 활성 사용자", unit: "명", area: false },
] as const;
export type UsageChartKind = "auto" | "bar" | "line";
interface UsageTrendPanelProps { view: DashboardView; chartKind: UsageChartKind; onChartKindChange(value: UsageChartKind): void }
export default function UsageTrendPanel({ view, chartKind, onChartKindChange }: UsageTrendPanelProps): React.ReactElement {
  return <div className="tw:grid tw:gap-(--layout-section-gap) tw:lg:grid-cols-2">
    {metrics.map((item, index) => {
      const daily = view.trends.map(point => ({ id: point.id, label: point.label, tableLabel: point.id, value: point[item.value], tooltip: point.id + " · " + point[item.value].toLocaleString("ko-KR") + item.unit }));
      const weekly = chartKind === "auto" && item.value === "tokens", title = weekly ? "주별 AI Token 사용량" : item.title;
      return <DashboardCard key={item.value} title={title} className={index === 0 ? "tw:lg:col-span-2" : ""}
        actions={index === 0 && <SegmentedControl ariaLabel="사용량 차트 유형" options={[{ value: "auto", label: "패턴 보기" }, { value: "bar", label: "일별 막대" }, { value: "line", label: "일별 선" }]} value={chartKind} onChange={onChartKindChange} />}>
        {chartKind === "auto" && item.value === "activeUsers" ? <AdminCalendarHeatmap label={item.title} points={daily} unit={item.unit} color={DASHBOARD_CHART_COLORS[item.value]} /> : <>
          {weekly && <p className="tw:text-[11px] tw:text-(--kpc-secondary)">월–일 합계 · 첫 주와 마지막 주는 조회 기간 내 날짜만 포함합니다.</p>}
          <AdminSeriesChart label={title} kind={chartKind === "auto" ? "bar" : chartKind} variant={item.value === "activities" ? "simple" : "default"} color={DASHBOARD_CHART_COLORS[item.value]} area={item.area} unit={item.unit} points={weekly ? sumWeeklyChartPoints(daily, item.unit) : daily} />
          {weekly && <AdminChartDataTable label={item.title} points={daily} unit={item.unit} summary="원본 일별 데이터 보기" />}
        </>}
      </DashboardCard>;
    })}
  </div>;
}
