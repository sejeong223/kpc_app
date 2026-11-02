"use client";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import { AdminBreakdown } from "@/components/admin/ui/AdminCharts";
import AdminPager from "@/components/admin/ui/AdminPager";
import { AUDIT_ACTION_LABELS, AUDIT_RESOURCE_LABELS } from "@/config/admin-labels";
import { DEFAULT_PAGE_SIZE } from "@/config/pagination";
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
      return <AdminCard key={kind.value} title={kind.label} className={kind.value === "details" ? "tw:lg:col-span-2" : ""}
        actions={<span className="tw:text-[11px] tw:text-(--kpc-muted)">{kind.value === "details" ? "활동 로그의 세부 작업 기준 · " : ""}총 {items.length}개 분류</span>}>
        <AdminBreakdown label={kind.label} items={rows.items} columns={kind.value === "details" ? 2 : 1} maxCount={Math.max(1, ...items.map(item => item.count))} />
        {rows.total > DEFAULT_PAGE_SIZE && <AdminPager {...rows} onChange={page => onPageChange(kind.value, page)} />}
      </AdminCard>;
    })}
  </div>;
}
