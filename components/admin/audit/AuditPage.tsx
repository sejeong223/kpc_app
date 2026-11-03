"use client";
import { WorkspaceCardSection } from "@/components/layout/WorkspaceCard";
import WorkspaceActionRow from "@/components/layout/WorkspaceActionRow";
import { DadamButton as Button, DadamSelect as Select } from "@/components/ui/DadamControls";
import { useCallback, useState } from "react";
import { AdminCard, AdminPage } from "@/components/admin/ui/AdminPrimitives";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import AdminPager from "@/components/admin/ui/AdminPager";
import { useAdminAccess, useAdminAudit, useExportAudit } from "@/hooks/admin/use-admin-data";
import { downloadCsv } from "@/lib/admin/csv";
import { PageInputSchema } from "@/lib/admin/schemas";
import { PAGE_SIZE_OPTIONS } from "@/config/pagination";
import type { AuditQuery, AuditSortKey } from "@/types/admin";
import AuditFilters, { DEFAULT_AUDIT_QUERY } from "./AuditFilters";
import AuditTable from "./AuditTable";
import AuditSummaryFilter from "./AuditSummaryFilter";
export default function AuditPage(): React.ReactElement {
  const [query, setQuery] = useState<AuditQuery>({ ...DEFAULT_AUDIT_QUERY }), [expandedId, setExpandedId] = useState<string | null>(null), [notice, setNotice] = useState("");
  // 검색 결과가 갱신되는 동안에도 권한 범위의 필터 선택지를 유지한다. 초기 동일 조회는 캐시를 공유한다.
  const access = useAdminAccess(), options = useAdminAudit(DEFAULT_AUDIT_QUERY), data = useAdminAudit(query), exporting = useExportAudit();
  const change = useCallback((value: AuditQuery) => { setQuery(value); setExpandedId(null); setNotice(""); }, []);
  const sort = (key: AuditSortKey) => change({ ...query, sortKey: key, direction: query.sortKey === key ? query.direction === "asc" ? "desc" : "asc" : key === "occurredAt" || key === "tokens" ? "desc" : "asc", page: 1 });
  if (!access.data) return <AdminPage title="활동 로그"><AdminAsyncState state={access.isError ? "error" : "loading"} onRetry={() => void access.refetch()} /></AdminPage>;
  if (!access.data.grants.audit.read) return <AdminPage title="활동 로그"><AdminAsyncState state="forbidden" /></AdminPage>;
  return <AdminPage title="활동 로그">
    <AdminCard bodyPadding="flush">
      <WorkspaceCardSection>
        <AuditFilters value={query} actions={data.data?.actions ?? options.data?.actions ?? []} resources={data.data?.resources ?? options.data?.resources ?? []} onChange={change}
          summary={<AuditSummaryFilter counts={data.data} value={query.outcome} onChange={(outcome) => change({ ...query, outcome, page: 1 })} />}
          exporting={exporting.isPending} onExport={(value) => exporting.mutate(value, { onSuccess: (csv) => { downloadCsv("활동로그_2026-10-20.csv", csv); setNotice("현재 조건의 전체 로그를 내보냈습니다."); } })} />
        {notice && <p role="status" className="tw:text-(--kpc-success)">{notice}</p>}{exporting.error && <p role="alert" className="tw:text-(--kpc-danger)">{exporting.error.message}</p>}
      </WorkspaceCardSection>
      <WorkspaceCardSection className="tw:border-0 tw:border-t tw:border-solid tw:border-(--kpc-line-soft)">
        <WorkspaceActionRow actions={<Select aria-label="로그 페이지당 행 수" size="small" value={String(query.pageSize)} onChange={(_, d) => { const result = PageInputSchema.shape.pageSize.safeParse(Number(d.value)); if (result.success) change({ ...query, page: 1, pageSize: result.data }); }}>{PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}행씩 보기</option>)}</Select>}>
          <h2 className="tw:m-0 tw:text-[13px] tw:font-bold">활동 내역 <span className="tw:ml-(--layout-inline-gap) tw:font-normal tw:tabular-nums tw:text-(--kpc-muted)">{data.data ? data.data.rows.total.toLocaleString("ko-KR") + "건" : "—"}</span></h2>
        </WorkspaceActionRow>
      </WorkspaceCardSection>
      {!data.data ? <AdminAsyncState state={data.isError ? "error" : "loading"} onRetry={() => void data.refetch()} /> : <>
        {data.isError && <WorkspaceCardSection><p role="alert">최신 데이터를 불러오지 못했습니다. <Button size="small" onClick={() => void data.refetch()}>다시 시도</Button></p></WorkspaceCardSection>}
        <AuditTable rows={data.data.rows.items} sortKey={query.sortKey} direction={query.direction} expandedId={expandedId} onExpand={setExpandedId} onSort={sort} />
        <WorkspaceCardSection><AdminPager {...data.data.rows} onChange={(page) => change({ ...query, page })} /></WorkspaceCardSection>
      </>}
    </AdminCard>
  </AdminPage>;
}
