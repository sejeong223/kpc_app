"use client";
import DashboardCard from "./DashboardCard";
import { AdminBreakdown } from "@/components/admin/ui/AdminCharts";
import AdminCompositionChart from "@/components/admin/ui/AdminCompositionChart";
import AdminPager from "@/components/admin/ui/AdminPager";
import { AUDIT_ACTION_LABELS, AUDIT_RESOURCE_LABELS } from "@/config/admin-labels";
import { DASHBOARD_CHART_COLORS, dashboardCategoryColor } from "@/config/dashboard-charts";
import { DEFAULT_PAGE_SIZE } from "@/config/pagination";
import { summarizeChartSegments } from "@/lib/admin/chart-data";
import { AuditActionSchema, AuditResourceSchema } from "@/lib/admin/schemas";
import { paginate } from "@/lib/admin/selectors";
import type { DashboardView, NamedCount } from "@/types/admin";

const kinds = [{ value: "actions", label: "액션별 활동" }, { value: "resources", label: "리소스별 활동" }, { value: "details", label: "업무 기준 상세" }] as const;
export type BreakdownKind = typeof kinds[number]["value"];
interface ActivityBreakdownPanelProps { view: DashboardView; pages: Record<BreakdownKind, number>; onPageChange(kind: BreakdownKind, page: number): void }
export default function ActivityBreakdownPanel({ view, pages, onPageChange }: ActivityBreakdownPanelProps): React.ReactElement {
  return <div className="tw:grid tw:items-start tw:gap-(--layout-section-gap) tw:lg:grid-cols-2">
    {kinds.map(kind => {
      const items: NamedCount[] = view[kind.value].map(item => {
        const action = AuditActionSchema.safeParse(item.id), resource = AuditResourceSchema.safeParse(item.id);
        return { ...item, label: kind.value === "actions" && action.success ? AUDIT_ACTION_LABELS[action.data] : kind.value === "resources" && resource.success ? AUDIT_RESOURCE_LABELS[resource.data] : item.label };
      });
      const rows = paginate(items, { page: pages[kind.value], pageSize: DEFAULT_PAGE_SIZE });
      const colorForId = (id: string) => dashboardCategoryColor(kind.value === "details" ? id.split(":")[0] : id);
      const breakdown = <>
        <AdminBreakdown label={kind.label} items={rows.items} variant="dot" colorForId={colorForId} columns={kind.value === "details" ? 2 : 1} maxCount={Math.max(1, ...items.map(item => item.count))} />
        {rows.total > DEFAULT_PAGE_SIZE && <AdminPager {...rows} onChange={page => onPageChange(kind.value, page)} />}
      </>;
      return <DashboardCard key={kind.value} title={kind.label} className={kind.value === "details" ? "tw:lg:col-span-2" : ""}
        actions={<span className="tw:text-[11px] tw:text-(--kpc-muted)">{kind.value === "details" ? "활동 로그의 세부 작업 기준 · " : ""}총 {items.length}개 분류</span>}>
        {kind.value === "details" ? breakdown : <>
          <AdminCompositionChart label={kind.label + " 구성 비율"} kind={kind.value === "actions" ? "donut" : "strip"}
            segments={summarizeChartSegments(items.map(item => ({ ...item, color: colorForId(item.id) })), DASHBOARD_CHART_COLORS.other)} />
          {items.length > 0 && <details className="tw:border-0 tw:border-t tw:border-solid tw:border-(--kpc-line-soft) tw:pt-3">
            <summary className="tw:cursor-pointer tw:text-[11px] tw:text-(--kpc-secondary)">전체 {items.length}개 분류 보기</summary>
            <div className="tw:mt-4 tw:flex tw:flex-col tw:gap-3">{breakdown}</div>
          </details>}
        </>}
      </DashboardCard>;
    })}
  </div>;
}
