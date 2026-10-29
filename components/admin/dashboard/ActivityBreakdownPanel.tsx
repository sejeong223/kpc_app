"use client";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import { AdminBreakdown } from "@/components/admin/ui/AdminCharts";
import { AUDIT_ACTION_LABELS, AUDIT_RESOURCE_LABELS, FEATURE_LABELS } from "@/config/admin-labels";
import { AuditActionSchema, AuditResourceSchema, UsageFeatureSchema } from "@/lib/admin/schemas";
import type { DashboardView } from "@/types/admin";
export default function ActivityBreakdownPanel({ view }: { view: DashboardView }): React.ReactElement {
  return <div className="tw:grid tw:gap-4 tw:lg:grid-cols-3">
    <AdminCard title="액션별 활동"><AdminBreakdown label="액션별 활동" items={view.actions.map((i) => { const id = AuditActionSchema.safeParse(i.id); return { ...i, label: id.success ? AUDIT_ACTION_LABELS[id.data] : i.label }; })} /></AdminCard>
    <AdminCard title="리소스별 활동"><AdminBreakdown label="리소스별 활동" items={view.resources.map((i) => { const id = AuditResourceSchema.safeParse(i.id); return { ...i, label: id.success ? AUDIT_RESOURCE_LABELS[id.data] : i.label }; })} /></AdminCard>
    <AdminCard title="세부 작업별 활동"><AdminBreakdown label="세부 작업별 활동" items={view.details.map((i) => { const id = UsageFeatureSchema.safeParse(i.id); return { ...i, label: id.success ? FEATURE_LABELS[id.data] : i.label }; })} /></AdminCard>
  </div>;
}
