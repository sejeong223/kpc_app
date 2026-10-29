"use client";
import { Select } from "@fluentui/react-components";
import { useCallback, useState } from "react";
import { AdminCard, AdminMetric, AdminPage } from "@/components/admin/ui/AdminPrimitives";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import AdminPager from "@/components/admin/ui/AdminPager";
import { useAdminAccess, useAdminAudit, useExportAudit } from "@/hooks/admin/use-admin-data";
import { downloadCsv } from "@/lib/admin/csv";
import type { AuditQuery, AuditSortKey } from "@/types/admin";
import AuditFilters, { DEFAULT_AUDIT_QUERY } from "./AuditFilters";
import AuditTable from "./AuditTable";
export default function AuditPage(): React.ReactElement {
  const [query, setQuery] = useState<AuditQuery>({ ...DEFAULT_AUDIT_QUERY }), [expandedId, setExpandedId] = useState<string | null>(null), [notice, setNotice] = useState("");
  const access = useAdminAccess(), data = useAdminAudit(query), exporting = useExportAudit();
  const change = useCallback((value: AuditQuery) => { setQuery(value); setExpandedId(null); }, []);
  const sort = (key: AuditSortKey) => change({ ...query, sortKey: key, direction: query.sortKey === key ? query.direction === "asc" ? "desc" : "asc" : key === "occurredAt" || key === "tokens" ? "desc" : "asc", page: 1 });
  if (!access.data?.grants.audit.read) return <AdminAsyncState state="forbidden" />;
  return <AdminPage title="활동 로그" description={access.data.actor.role === "super_admin" ? "전사 사용자의 활동과 처리 결과를 확인합니다." : "우리 부서의 활동과 처리 결과를 확인합니다."}>
    <div className="tw:grid tw:grid-cols-3 tw:gap-3" aria-label="결과 조건을 제외한 현재 필터의 건수">
      <AdminMetric label="전체 활동" value={data.data ? String(data.data.successCount + data.data.failureCount) : "—"} selected={query.outcome === "all"} onClick={() => change({ ...query, outcome: "all", page: 1 })} />
      <AdminMetric label="성공" value={String(data.data?.successCount ?? "—")} tone="success" selected={query.outcome === "success"} onClick={() => change({ ...query, outcome: "success", page: 1 })} />
      <AdminMetric label="실패" value={String(data.data?.failureCount ?? "—")} tone="danger" selected={query.outcome === "failure"} onClick={() => change({ ...query, outcome: "failure", page: 1 })} />
    </div>
    <AdminCard title="로그 조회"><AuditFilters value={query} actions={data.data?.actions ?? []} resources={data.data?.resources ?? []} onChange={change} exporting={exporting.isPending} onExport={() => exporting.mutate({ ...query }, { onSuccess: (csv) => { downloadCsv("활동로그_2026-10-20.csv", csv); setNotice("현재 조건의 전체 로그를 내보냈습니다."); } })} /></AdminCard>
    <AdminCard title="활동 내역" actions={<Select aria-label="로그 페이지당 행 수" size="small" value={String(query.pageSize)} onChange={(_, d) => change({ ...query, page: 1, pageSize: d.value === "50" ? 50 : 20 })}><option value="20">20행</option><option value="50">50행</option></Select>}>
      {notice && <p role="status">{notice}</p>}{exporting.error && <p role="alert">{exporting.error.message}</p>}
      {!data.data ? <AdminAsyncState state={data.isError ? "error" : "loading"} onRetry={() => void data.refetch()} /> : <><AuditTable rows={data.data.rows.items} sortKey={query.sortKey} direction={query.direction} expandedId={expandedId} onExpand={setExpandedId} onSort={sort} /><AdminPager {...data.data.rows} onChange={(page) => change({ ...query, page })} /></>}
    </AdminCard>
  </AdminPage>;
}
