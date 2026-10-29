"use client";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import { AdminSeriesChart } from "@/components/admin/ui/AdminCharts";
import SegmentedControl from "@/components/ui/SegmentedControl";
import type { DashboardView } from "@/types/admin";
interface UsageTrendPanelProps { view: DashboardView; chartKind: "bar" | "line"; onChartKindChange(value: "bar" | "line"): void }
export default function UsageTrendPanel({ view, chartKind, onChartKindChange }: UsageTrendPanelProps): React.ReactElement {
  return <><div className="tw:flex tw:justify-end"><SegmentedControl ariaLabel="차트 유형" options={[{ value: "bar", label: "막대" }, { value: "line", label: "선" }]} value={chartKind} onChange={onChartKindChange} /></div>
    {([{ id: "activities", label: "일별 활동", unit: "건" }, { id: "tokens", label: "일별 토큰 사용량", unit: "Token" }, { id: "activeUsers", label: "일별 활성 사용자", unit: "명" }] as const).map((item) => <AdminCard key={item.id} title={item.label}><AdminSeriesChart label={item.label} kind={chartKind} unit={item.unit} points={view.trends.map((p) => ({ id: p.id, label: p.label, value: p[item.id], tooltip: p.id + " · " + p[item.id].toLocaleString("ko-KR") + item.unit }))} /></AdminCard>)}
  </>;
}
