"use client";
import { WarningRegular } from "@fluentui/react-icons";
import { AUDIT_ACTION_LABELS, AUDIT_RESOURCE_LABELS } from "@/config/admin-labels";
import { getAuditOperation } from "@/lib/admin/audit-operation";
import type { AdminAuditEvent } from "@/types/admin";
import AuditOutcomeBadge from "./AuditOutcomeBadge";

interface AuditDetailProps { event: AdminAuditEvent }
interface DetailField { label: string; value: string | null; code?: boolean }
function DetailGroup({ title, fields }: { title: string; fields: readonly DetailField[] }): React.ReactElement {
  return <section aria-label={title} className="tw:min-w-0 tw:rounded-(--dadam-control-radius) tw:border tw:border-solid tw:border-(--kpc-line-soft) tw:bg-(--kpc-card) tw:p-(--layout-card-inset)">
    <h3 className="tw:mt-0 tw:mb-(--layout-control-gap) tw:text-xs tw:font-semibold">{title}</h3>
    <dl className="tw:m-0 tw:grid tw:grid-cols-1 tw:gap-(--layout-control-gap) tw:sm:grid-cols-2">
      {fields.map(({ label, value, code }) => <div key={label} className="tw:min-w-0"><dt className="tw:mb-0.5 tw:text-[11px] tw:text-(--kpc-muted)">{label}</dt><dd className={"tw:m-0 tw:whitespace-pre-wrap tw:break-words tw:[overflow-wrap:anywhere] " + (code ? "tw:font-mono tw:text-[11px]" : "")}>{value ?? "—"}</dd></div>)}
    </dl>
  </section>;
}
export default function AuditDetail({ event }: AuditDetailProps): React.ReactElement {
  return <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-(--layout-control-gap)">
    <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap)"><strong>{getAuditOperation(event).label}</strong><AuditOutcomeBadge outcome={event.outcome} /><span className="tw:text-[11px] tw:text-(--kpc-muted)">{new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "medium" }).format(new Date(event.occurredAt))} (한국)</span></div>
    {event.outcome === "failure" && <div className="tw:flex tw:items-start tw:gap-(--layout-control-gap) tw:rounded-(--dadam-control-radius) tw:border tw:border-solid tw:border-(--kpc-danger) tw:bg-(--kpc-card) tw:p-(--layout-control-gap) tw:text-(--kpc-danger)">
      <WarningRegular aria-hidden="true" className="tw:mt-0.5 tw:shrink-0" /><div className="tw:min-w-0"><strong>실패 사유</strong><p className="tw:mt-(--layout-inline-gap) tw:mb-0 tw:whitespace-pre-wrap tw:break-words">{event.failureReason ?? "실패 사유가 기록되지 않았습니다."}</p></div>
    </div>}
    <div className="tw:grid tw:min-w-0 tw:grid-cols-1 tw:gap-(--layout-control-gap) tw:lg:grid-cols-2">
      <DetailGroup title="이벤트 정보" fields={[
        { label: "액션 · 리소스", value: `${AUDIT_ACTION_LABELS[event.action]} · ${AUDIT_RESOURCE_LABELS[event.resource]}` },
        { label: "대상", value: event.targetLabel }, { label: "대상 ID", value: event.targetId, code: true },
        { label: "요청 ID", value: event.requestId, code: true }, { label: "사용량 ID", value: event.usageId, code: true },
        { label: "원본 세부 정보", value: event.detail },
      ]} />
      <DetailGroup title="사용자·접속 정보" fields={[
        { label: "사용자", value: event.actorName }, { label: "이메일", value: event.actorEmail },
        { label: "행위자 ID", value: event.actorId, code: true }, { label: "사용 Token", value: event.tokens.toLocaleString("ko-KR") },
        { label: "IP", value: event.ip, code: true }, { label: "브라우저", value: event.userAgent },
      ]} />
    </div>
  </div>;
}
