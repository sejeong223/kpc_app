"use client";
import { Badge } from "@fluentui/react-components";
import AdminTable from "@/components/admin/ui/AdminTable";
import { AUDIT_ACTION_LABELS, AUDIT_RESOURCE_LABELS, FEATURE_LABELS } from "@/config/admin-labels";
import { AuditSortKeySchema, UsageFeatureSchema } from "@/lib/admin/schemas";
import type { AdminAuditEvent, AuditSortKey } from "@/types/admin";
import AuditDetail from "./AuditDetail";
interface AuditTableProps { rows: readonly AdminAuditEvent[]; sortKey: AuditSortKey; direction: "asc" | "desc"; expandedId: string | null; onExpand(id: string | null): void; onSort(key: AuditSortKey): void }
export default function AuditTable({ rows, sortKey, direction, expandedId, onExpand, onSort }: AuditTableProps): React.ReactElement {
  return <AdminTable label="활동 로그 목록" rows={rows} expandedId={expandedId} onExpand={onExpand} renderExpanded={(event) => <AuditDetail event={event} />} sort={{ columnId: sortKey, direction }} onSort={(key) => { const result = AuditSortKeySchema.safeParse(key); if (result.success) onSort(result.data); }} emptyMessage="조건에 맞는 활동 로그가 없습니다." columns={[
    { id: "occurredAt", label: "시간", sortable: true, render: (e) => <span className="tw:whitespace-nowrap">{new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(e.occurredAt))}</span> },
    { id: "actorName", label: "사용자", sortable: true, render: (e) => <div><strong className="tw:whitespace-nowrap">{e.actorName}</strong><div className="tw:text-[11px] tw:text-(--kpc-muted)">{e.actorEmail}</div></div> },
    { id: "action", label: "액션", sortable: true, render: (e) => <Badge appearance="tint">{AUDIT_ACTION_LABELS[e.action]}</Badge> },
    { id: "detail", label: "세부 작업", render: (e) => { const feature = UsageFeatureSchema.safeParse(e.detail); return <span className="tw:block tw:min-w-24 tw:max-w-48 tw:break-words">{feature.success ? FEATURE_LABELS[feature.data] : e.detail}</span>; } },
    { id: "resource", label: "리소스", sortable: true, render: (e) => AUDIT_RESOURCE_LABELS[e.resource] },
    { id: "target", label: "대상", render: (e) => <span className="tw:block tw:min-w-32 tw:max-w-56 tw:break-words">{e.targetLabel}</span> },
    { id: "targetId", label: "대상 ID", render: (e) => <span className="tw:block tw:max-w-28 tw:break-all tw:text-[11px] tw:text-(--kpc-muted)">{e.targetId}</span> },
    { id: "outcome", label: "결과", sortable: true, render: (e) => <Badge color={e.outcome === "success" ? "success" : "danger"} appearance="tint">{e.outcome === "success" ? "성공" : "실패"}</Badge> },
    { id: "tokens", label: "Token", sortable: true, align: "end", render: (e) => e.tokens ? e.tokens.toLocaleString("ko-KR") : "—" },
  ]} />;
}
