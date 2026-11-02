"use client";
import { getAuditOperation } from "@/lib/admin/audit-operation";
import { Avatar, Badge } from "@fluentui/react-components";
import AdminTable from "@/components/admin/ui/AdminTable";
import { AUDIT_ACTION_LABELS, AUDIT_RESOURCE_LABELS } from "@/config/admin-labels";
import { AuditSortKeySchema } from "@/lib/admin/schemas";
import type { AdminAuditEvent, AuditSortKey } from "@/types/admin";
import AuditDetail from "./AuditDetail";
import AuditOutcomeBadge from "./AuditOutcomeBadge";
interface AuditTableProps { rows: readonly AdminAuditEvent[]; sortKey: AuditSortKey; direction: "asc" | "desc"; expandedId: string | null; onExpand(id: string | null): void; onSort(key: AuditSortKey): void }
const dayFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
export default function AuditTable({ rows, sortKey, direction, expandedId, onExpand, onSort }: AuditTableProps): React.ReactElement {
  return <AdminTable label="활동 로그 목록" rows={rows} expandedId={expandedId} onExpand={onExpand} renderExpanded={(event) => <AuditDetail event={event} />} sort={{ columnId: sortKey, direction }} onSort={(key) => { const result = AuditSortKeySchema.safeParse(key); if (result.success) onSort(result.data); }} emptyMessage="조건에 맞는 활동 로그가 없습니다." columns={[
    { id: "occurredAt", label: "시간", sortable: true, width: "13%", render: (e) => <time dateTime={e.occurredAt} title="한국 표준시" className="tw:block tw:whitespace-nowrap tw:tabular-nums"><span className="tw:block">{dayFormat.format(new Date(e.occurredAt))}</span><span className="tw:text-[11px] tw:text-(--kpc-muted)">{timeFormat.format(new Date(e.occurredAt))}</span></time> },
    { id: "actorName", label: "사용자", sortable: true, width: "20%", render: (e) => <div className="tw:flex tw:items-center tw:gap-(--layout-control-gap)"><Avatar name={e.actorName} size={28} color="neutral" aria-hidden="true" /><div className="tw:min-w-24 tw:max-w-48"><strong className="tw:block tw:truncate">{e.actorName}</strong><div title={e.actorEmail} className="tw:truncate tw:text-[11px] tw:text-(--kpc-muted)">{e.actorEmail}</div></div></div> },
    { id: "action", label: "작업", sortable: true, width: "22%", render: (e) => <div className="tw:flex tw:min-w-32 tw:max-w-64 tw:flex-col tw:items-start tw:gap-(--layout-inline-gap)"><span className="tw:max-w-full tw:truncate tw:font-medium" title={getAuditOperation(e).label}>{getAuditOperation(e).label}</span><Badge appearance="tint" color="subtle" shape="rounded">{AUDIT_ACTION_LABELS[e.action]}</Badge></div> },
    { id: "resource", label: "대상 · 리소스", sortable: true, width: "28%", render: (e) => <div className="tw:min-w-32 tw:max-w-80"><span className="tw:block tw:truncate" title={e.targetLabel}>{e.targetLabel}</span><span className="tw:text-[11px] tw:text-(--kpc-muted)">{AUDIT_RESOURCE_LABELS[e.resource]}</span></div> },
    { id: "outcome", label: "결과", sortable: true, render: (e) => <AuditOutcomeBadge outcome={e.outcome} /> },
    { id: "tokens", label: "Token", sortable: true, align: "end", render: (e) => <span className={"tw:whitespace-nowrap tw:tabular-nums " + (e.tokens ? "tw:font-medium" : "tw:text-(--kpc-muted)")}>{e.tokens ? e.tokens.toLocaleString("ko-KR") : "—"}</span> },
  ]} />;
}
