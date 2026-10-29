"use client";
import type { AdminAuditEvent } from "@/types/admin";
interface AuditDetailProps { event: AdminAuditEvent }
export default function AuditDetail({ event }: AuditDetailProps): React.ReactElement {
  const items = [["요청 ID", event.requestId], ["발생 시각 (한국)", new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "medium" }).format(new Date(event.occurredAt))], ["행위자 ID", event.actorId], ["대상 ID", event.targetId], ["실패 사유", event.failureReason ?? "—"], ["사용량 ID", event.usageId ?? "—"], ["IP (예시)", event.ip], ["브라우저 (예시)", event.userAgent]];
  return <dl className="tw:m-0 tw:grid tw:gap-3 tw:sm:grid-cols-2 tw:lg:grid-cols-4">{items.map(([label, value]) => <div key={label}><dt className="tw:text-[11px] tw:text-(--kpc-muted)">{label}</dt><dd className="tw:m-0 tw:break-all">{value}</dd></div>)}</dl>;
}
