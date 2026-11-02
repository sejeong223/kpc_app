"use client";
import WorkspaceToolbar from "@/components/layout/WorkspaceToolbar";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import { AdminSeriesChart } from "@/components/admin/ui/AdminCharts";
import SegmentedControl from "@/components/ui/SegmentedControl";
import type { DashboardView } from "@/types/admin";

const metrics = [{ value: "activities", label: "활동", title: "일별 활동", unit: "건" }, { value: "tokens", label: "토큰 사용량", title: "일별 토큰 사용량", unit: "Token" }, { value: "activeUsers", label: "활성 사용자", title: "일별 활성 사용자", unit: "명" }] as const;
export type UsageMetric = typeof metrics[number]["value"];
interface UsageTrendPanelProps { view: DashboardView; chartKind: "bar" | "line"; onChartKindChange(value: "bar" | "line"): void; metric: UsageMetric; onMetricChange(value: UsageMetric): void }
export default function UsageTrendPanel({ view, chartKind, onChartKindChange, metric, onMetricChange }: UsageTrendPanelProps): React.ReactElement {
  const item = metrics.find(item => item.value === metric) ?? metrics[0];
  return <AdminCard title="사용량 추이">
    <WorkspaceToolbar align="center" className="tw:justify-between">
      <SegmentedControl ariaLabel="추이 지표" options={metrics} value={metric} onChange={onMetricChange} />
      <SegmentedControl ariaLabel="차트 유형" options={[{ value: "bar", label: "막대" }, { value: "line", label: "선" }]} value={chartKind} onChange={onChartKindChange} />
    </WorkspaceToolbar>
    <AdminSeriesChart label={item.title} kind={chartKind} unit={item.unit} points={view.trends.map(point => ({ id: point.id, label: point.label, value: point[item.value], tooltip: point.id + " · " + point[item.value].toLocaleString("ko-KR") + item.unit }))} />
  </AdminCard>;
}
