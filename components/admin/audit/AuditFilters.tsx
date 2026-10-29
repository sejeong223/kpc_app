"use client";
import { Button, Input, Select } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import AdminPeriodFilter from "@/components/admin/ui/AdminPeriodFilter";
import { AUDIT_ACTION_LABELS, AUDIT_RESOURCE_LABELS } from "@/config/admin-labels";
import type { AuditAction, AuditQuery, AuditResource } from "@/types/admin";
export const DEFAULT_AUDIT_QUERY: AuditQuery = { from: "2026-07-23", to: "2026-10-20", userSearch: "", targetSearch: "", action: "all", resource: "all", outcome: "all", sortKey: "occurredAt", direction: "desc", page: 1, pageSize: 20 };
interface AuditFiltersProps { value: AuditQuery; actions: readonly AuditAction[]; resources: readonly AuditResource[]; onChange(value: AuditQuery): void; exporting: boolean; onExport(): void }
export default function AuditFilters({ value, actions, resources, onChange, exporting, onExport }: AuditFiltersProps): React.ReactElement {
  const [userSearch, setUserSearch] = useState(value.userSearch), [targetSearch, setTargetSearch] = useState(value.targetSearch);
  useEffect(() => { if (userSearch === value.userSearch && targetSearch === value.targetSearch) return; const timer = setTimeout(() => onChange({ ...value, userSearch, targetSearch, page: 1 }), 250); return () => clearTimeout(timer); }, [userSearch, targetSearch, value, onChange]);
  return <div className="tw:flex tw:flex-col tw:gap-3">
    <AdminPeriodFilter value={{ from: value.from, to: value.to }} maxDate="2026-10-20" onChange={(period) => onChange({ ...value, ...period, page: 1 })} />
    <div className="tw:flex tw:flex-wrap tw:gap-2">
      <Input aria-label="로그 사용자 검색" placeholder="사용자 이름 또는 이메일" value={userSearch} onChange={(_, d) => setUserSearch(d.value)} />
      <Input aria-label="로그 대상 검색" placeholder="대상, ID 또는 세부 작업" value={targetSearch} onChange={(_, d) => setTargetSearch(d.value)} />
      <Select aria-label="로그 액션" value={value.action} onChange={(_, d) => onChange({ ...value, action: actions.find((a) => a === d.value) ?? "all", page: 1 })}><option value="all">전체 액션</option>{actions.map((a) => <option key={a} value={a}>{AUDIT_ACTION_LABELS[a]}</option>)}</Select>
      <Select aria-label="로그 리소스" value={value.resource} onChange={(_, d) => onChange({ ...value, resource: resources.find((r) => r === d.value) ?? "all", page: 1 })}><option value="all">전체 리소스</option>{resources.map((r) => <option key={r} value={r}>{AUDIT_RESOURCE_LABELS[r]}</option>)}</Select>
      <Select aria-label="로그 결과" value={value.outcome} onChange={(_, d) => onChange({ ...value, outcome: d.value === "success" || d.value === "failure" ? d.value : "all", page: 1 })}><option value="all">전체 결과</option><option value="success">성공</option><option value="failure">실패</option></Select>
      <Button onClick={() => { setUserSearch(""); setTargetSearch(""); onChange({ ...DEFAULT_AUDIT_QUERY }); }}>초기화</Button>
      <Button disabled={exporting} onClick={onExport}>{exporting ? "내보내는 중…" : "CSV 내보내기"}</Button>
    </div>
  </div>;
}
