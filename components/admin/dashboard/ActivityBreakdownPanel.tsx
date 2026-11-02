"use client";
import WorkspaceToolbar from "@/components/layout/WorkspaceToolbar";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import { AdminBreakdown } from "@/components/admin/ui/AdminCharts";
import AdminPager from "@/components/admin/ui/AdminPager";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { AUDIT_ACTION_LABELS, AUDIT_RESOURCE_LABELS } from "@/config/admin-labels";
import { DEFAULT_PAGE_SIZE } from "@/config/pagination";
import { AuditActionSchema, AuditResourceSchema } from "@/lib/admin/schemas";
import { paginate } from "@/lib/admin/selectors";
import type { DashboardView, NamedCount } from "@/types/admin";

const kinds = [{ value: "actions", label: "액션별 활동" }, { value: "resources", label: "리소스별 활동" }, { value: "details", label: "세부 작업별 활동" }] as const;
export type BreakdownKind = typeof kinds[number]["value"];
interface ActivityBreakdownPanelProps { view: DashboardView; kind: BreakdownKind; onKindChange(value: BreakdownKind): void; page: number; onPageChange(page: number): void }
export default function ActivityBreakdownPanel({ view, kind, onKindChange, page, onPageChange }: ActivityBreakdownPanelProps): React.ReactElement {
  const items: NamedCount[] = view[kind].map(item => {
    const action = AuditActionSchema.safeParse(item.id), resource = AuditResourceSchema.safeParse(item.id);
    return { ...item, label: kind === "actions" && action.success ? AUDIT_ACTION_LABELS[action.data] : kind === "resources" && resource.success ? AUDIT_RESOURCE_LABELS[resource.data] : item.label };
  });
  const rows = paginate(items, { page, pageSize: DEFAULT_PAGE_SIZE });
  return <AdminCard title="활동 상세 분석">
    <WorkspaceToolbar align="center" className="tw:justify-between">
      <SegmentedControl ariaLabel="활동 집계 기준" options={kinds} value={kind} onChange={onKindChange} variant="chips" />
      <span className="tw:text-[11px] tw:text-(--kpc-muted)">총 {items.length}개 분류 · 건수와 실패 횟수</span>
    </WorkspaceToolbar>
    <AdminBreakdown label={kinds.find(item => item.value === kind)!.label} items={rows.items} columns={2} maxCount={Math.max(1, ...items.map(item => item.count))} />
    <AdminPager {...rows} onChange={onPageChange} />
  </AdminCard>;
}
