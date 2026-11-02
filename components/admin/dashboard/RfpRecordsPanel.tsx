"use client";
import { Badge } from "@fluentui/react-components";
import { useEffect, useRef } from "react";
import { WorkspaceCardSection } from "@/components/layout/WorkspaceCard";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import AdminTable from "@/components/admin/ui/AdminTable";
import AdminPager from "@/components/admin/ui/AdminPager";
import { RFP_STATUS_LABELS } from "@/config/admin-labels";
import { toKoreanDay } from "@/lib/admin/dates";
import type { DashboardQuery, DashboardView } from "@/types/admin";

interface RfpRecordsPanelProps {
  rows: DashboardView["rfps"]; query: DashboardQuery; bucketLabel: string | null; onChange(query: DashboardQuery): void;
  focusRequested: boolean; onFocused(): void;
}
export default function RfpRecordsPanel({ rows, query, bucketLabel, onChange, focusRequested, onFocused }: RfpRecordsPanelProps): React.ReactElement {
  const region = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusRequested && region.current) { region.current.focus(); onFocused(); }
  }, [focusRequested, onFocused]);
  return <div ref={region} role="region" aria-label="선택 조건 RFP 목록" tabIndex={-1} className="tw:rounded-(--kpc-radius-card) tw:focus-visible:outline-2 tw:focus-visible:outline-(--kpc-brand)">
    <AdminCard bodyPadding="flush" title={(bucketLabel ? bucketLabel + " 등록분" : "조회 기간 전체") + " · RFP 목록"}>
      <AdminTable label="RFP 목록" rows={rows.items} emptyMessage="조건에 맞는 RFP가 없습니다." columns={[
        { id: "number", label: "번호", render: row => <span className="tw:whitespace-nowrap tw:text-[11px]">{row.number}</span> }, { id: "name", label: "사업명", render: row => <strong className="tw:block tw:min-w-40">{row.name}</strong> },
        { id: "department", label: "부서", render: row => row.departmentName }, { id: "pm", label: "PM", render: row => row.pmName }, { id: "date", label: "등록일", render: row => toKoreanDay(row.registeredAt) },
        { id: "budget", label: "예산 (원)", align: "end", render: row => row.budgetKrw.toLocaleString("ko-KR") }, { id: "status", label: "상태", render: row => <Badge appearance="tint" color={row.status === "won" ? "success" : row.status === "lost" ? "danger" : "informative"}>{RFP_STATUS_LABELS[row.status]}</Badge> },
      ]} /><WorkspaceCardSection><AdminPager {...rows} onChange={(rfpPage) => onChange({ ...query, rfpPage })} /></WorkspaceCardSection>
    </AdminCard>
  </div>;
}
