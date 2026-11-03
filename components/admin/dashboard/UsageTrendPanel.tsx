"use client";
import DashboardCard from "./DashboardCard";
import { AdminSeriesChart } from "@/components/admin/ui/AdminCharts";
import SegmentedControl from "@/components/ui/SegmentedControl";
import type { DashboardView } from "@/types/admin";

const metrics = [{ value: "activities", title: "일별 활동 이벤트 수", unit: "건" }, { value: "tokens", title: "일별 AI Token 사용량", unit: "Token" }, { value: "activeUsers", title: "일별 활성 사용자", unit: "명" }] as const;
interface UsageTrendPanelProps { view: DashboardView; chartKind: "bar" | "line"; onChartKindChange(value: "bar" | "line"): void }
export default function UsageTrendPanel({ view, chartKind, onChartKindChange }: UsageTrendPanelProps): React.ReactElement {
  return <div className="tw:grid tw:gap-(--layout-section-gap) tw:lg:grid-cols-2">
    {metrics.map((item, index) => <DashboardCard key={item.value} title={item.title} className={index === 0 ? "tw:lg:col-span-2" : ""}
      actions={index === 0 && <SegmentedControl ariaLabel="차트 유형" options={[{ value: "bar", label: "막대" }, { value: "line", label: "선" }]} value={chartKind} onChange={onChartKindChange} />}>
      <AdminSeriesChart label={item.title} kind={chartKind} unit={item.unit} points={view.trends.map(point => ({ id: point.id, label: point.label, value: point[item.value], tooltip: point.id + " · " + point[item.value].toLocaleString("ko-KR") + item.unit }))} />
    </DashboardCard>)}
  </div>;
}
