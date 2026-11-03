"use client";
import DashboardCard from "./DashboardCard";
import { AdminSeriesChart } from "@/components/admin/ui/AdminCharts";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { DASHBOARD_CHART_COLORS } from "@/config/dashboard-charts";
import type { DashboardView } from "@/types/admin";

const metrics = [
  { value: "activities", title: "일별 활동 이벤트 수", unit: "건", kind: "line", area: true },
  { value: "tokens", title: "일별 AI Token 사용량", unit: "Token", kind: "bar", area: true },
  { value: "activeUsers", title: "일별 활성 사용자", unit: "명", kind: "line", area: false },
] as const;
export type UsageChartKind = "auto" | "bar" | "line";
interface UsageTrendPanelProps { view: DashboardView; chartKind: UsageChartKind; onChartKindChange(value: UsageChartKind): void }
export default function UsageTrendPanel({ view, chartKind, onChartKindChange }: UsageTrendPanelProps): React.ReactElement {
  return <div className="tw:grid tw:gap-(--layout-section-gap) tw:lg:grid-cols-2">
    {metrics.map((item, index) => <DashboardCard key={item.value} title={item.title} className={index === 0 ? "tw:lg:col-span-2" : ""}
      actions={index === 0 && <SegmentedControl ariaLabel="사용량 차트 유형" options={[{ value: "auto", label: "추천" }, { value: "bar", label: "전체 막대" }, { value: "line", label: "전체 선" }]} value={chartKind} onChange={onChartKindChange} />}>
      <AdminSeriesChart label={item.title} kind={chartKind === "auto" ? item.kind : chartKind} color={DASHBOARD_CHART_COLORS[item.value]} area={item.area} unit={item.unit} points={view.trends.map(point => ({ id: point.id, label: point.label, value: point[item.value], tooltip: point.id + " · " + point[item.value].toLocaleString("ko-KR") + item.unit }))} />
    </DashboardCard>)}
  </div>;
}
