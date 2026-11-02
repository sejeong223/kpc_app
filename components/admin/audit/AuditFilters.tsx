"use client";
import WorkspaceToolbar from "@/components/layout/WorkspaceToolbar";
import WorkspaceActionRow from "@/components/layout/WorkspaceActionRow";
import { ArrowDownloadRegular, ArrowCounterclockwiseRegular, SearchRegular } from "@fluentui/react-icons";
import { DadamButton as Button, DadamInput as Input, DadamSelect as Select } from "@/components/ui/DadamControls";
import { useEffect, useState } from "react";
import AdminPeriodFilter from "@/components/admin/ui/AdminPeriodFilter";
import { AUDIT_ACTION_LABELS, AUDIT_RESOURCE_LABELS } from "@/config/admin-labels";
import { DEFAULT_PAGE_SIZE } from "@/config/pagination";
import type { AuditAction, AuditQuery, AuditResource } from "@/types/admin";
export const DEFAULT_AUDIT_QUERY: AuditQuery = { from: "2026-07-23", to: "2026-10-20", userSearch: "", targetSearch: "", action: "all", resource: "all", outcome: "all", sortKey: "occurredAt", direction: "desc", page: 1, pageSize: DEFAULT_PAGE_SIZE };
interface AuditFiltersProps { value: AuditQuery; actions: readonly AuditAction[]; resources: readonly AuditResource[]; summary: React.ReactNode; onChange(value: AuditQuery): void; exporting: boolean; onExport(value: AuditQuery): void }
export default function AuditFilters({ value, actions, resources, summary, onChange, exporting, onExport }: AuditFiltersProps): React.ReactElement {
  const [userSearch, setUserSearch] = useState(value.userSearch), [targetSearch, setTargetSearch] = useState(value.targetSearch);
  const [resetVersion, setResetVersion] = useState(0);
  const current = { ...value, userSearch, targetSearch };
  const actionOptions = [...new Set([...actions, ...(value.action === "all" ? [] : [value.action])])];
  const resourceOptions = [...new Set([...resources, ...(value.resource === "all" ? [] : [value.resource])])];
  useEffect(() => { if (userSearch === value.userSearch && targetSearch === value.targetSearch) return; const timer = setTimeout(() => onChange({ ...value, userSearch, targetSearch, page: 1 }), 250); return () => clearTimeout(timer); }, [userSearch, targetSearch, value, onChange]);
  return <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-(--layout-section-gap)">
    <WorkspaceActionRow actions={<>
      <AdminPeriodFilter key={resetVersion} compact value={{ from: value.from, to: value.to }} maxDate="2026-10-20" onChange={(period) => onChange({ ...current, ...period, page: 1 })} />
      <Button size="small" icon={<ArrowDownloadRegular />} disabled={exporting} onClick={() => { if (userSearch !== value.userSearch || targetSearch !== value.targetSearch) onChange({ ...current, page: 1 }); onExport({ ...current, page: 1 }); }}>{exporting ? "내보내는 중…" : "CSV 내보내기"}</Button>
    </>}>{summary}</WorkspaceActionRow>
    <WorkspaceToolbar align="center">
      <Input size="small" className="tw:min-w-0 tw:flex-[1_1_14rem]" contentBefore={<SearchRegular aria-hidden="true" />} aria-label="로그 사용자 검색" placeholder="사용자 이름 또는 이메일" maxLength={254} value={userSearch} onChange={(_, d) => setUserSearch(d.value)} />
      <Input size="small" className="tw:min-w-0 tw:flex-[1_1_14rem]" contentBefore={<SearchRegular aria-hidden="true" />} aria-label="로그 대상 검색" placeholder="대상, ID 또는 세부 작업" maxLength={254} value={targetSearch} onChange={(_, d) => setTargetSearch(d.value)} />
      <Select size="small" aria-label="로그 액션" value={value.action} onChange={(_, d) => onChange({ ...current, action: actionOptions.find((a) => a === d.value) ?? "all", page: 1 })}><option value="all">전체 액션</option>{actionOptions.map((a) => <option key={a} value={a}>{AUDIT_ACTION_LABELS[a]}</option>)}</Select>
      <Select size="small" aria-label="로그 리소스" value={value.resource} onChange={(_, d) => onChange({ ...current, resource: resourceOptions.find((r) => r === d.value) ?? "all", page: 1 })}><option value="all">전체 리소스</option>{resourceOptions.map((r) => <option key={r} value={r}>{AUDIT_RESOURCE_LABELS[r]}</option>)}</Select>
      <Button size="small" appearance="subtle" icon={<ArrowCounterclockwiseRegular />} onClick={() => { setUserSearch(""); setTargetSearch(""); setResetVersion((version) => version + 1); onChange({ ...DEFAULT_AUDIT_QUERY }); }}>초기화</Button>
    </WorkspaceToolbar>
  </div>;
}
