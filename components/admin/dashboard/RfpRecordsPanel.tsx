"use client";
import { Button } from "@fluentui/react-components";
import { useEffect, useRef } from "react";
import { WorkspaceCardSection } from "@/components/layout/WorkspaceCard";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import AdminTable from "@/components/admin/ui/AdminTable";
import AdminPager from "@/components/admin/ui/AdminPager";
import { RFP_STATUS_LABELS } from "@/config/admin-labels";
import { toKoreanDay } from "@/lib/admin/dates";
import type { DashboardQuery, DashboardView } from "@/types/admin";
import { RFP_STATUS_COLORS } from "./rfp-presentation";

interface RfpRecordsPanelProps {
  rows: DashboardView["rfps"]; query: DashboardQuery; bucketLabel: string | null; onChange(query: DashboardQuery): void;
  focusRequested: boolean; onFocused(): void;
}
export default function RfpRecordsPanel({ rows, query, bucketLabel, onChange, focusRequested, onFocused }: RfpRecordsPanelProps): React.ReactElement {
  const region = useRef<HTMLDivElement>(null);
  const statusLabel = query.rfpStatus === "all" ? "전체" : query.rfpStatus === "progress" ? "진행 중" : RFP_STATUS_LABELS[query.rfpStatus];
  useEffect(() => {
    if (focusRequested && region.current) { region.current.focus(); onFocused(); }
  }, [focusRequested, onFocused]);
  return <div ref={region} role="region" aria-label="선택 조건 RFP 목록" tabIndex={-1} className="tw:rounded-(--kpc-radius-card) tw:focus-visible:outline-2 tw:focus-visible:outline-(--kpc-brand)">
    <AdminCard bodyPadding="flush" title="RFP 목록" actions={<div className="tw:flex tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap)">
      <span role="status" className="tw:rounded-md tw:bg-(--kpc-bg) tw:px-(--layout-control-gap) tw:py-(--layout-inline-gap) tw:tabular-nums">{bucketLabel ? bucketLabel + " 등록분 · " : ""}{statusLabel} {rows.total.toLocaleString("ko-KR")}건</span>
      {query.bucketStart && <Button size="small" appearance="subtle" onClick={() => onChange({ ...query, bucketStart: null, rfpPage: 1 })}>등록 구간 해제</Button>}
      {query.rfpStatus !== "all" && <Button size="small" appearance="subtle" aria-label="RFP 상태 필터 해제" onClick={() => onChange({ ...query, rfpStatus: "all", rfpPage: 1 })}>상태 필터 해제</Button>}
      {query.bucketStart && query.rfpStatus !== "all" && <Button size="small" appearance="subtle" onClick={() => onChange({ ...query, bucketStart: null, rfpStatus: "all", rfpPage: 1 })}>RFP 필터 초기화</Button>}
    </div>}>
      <AdminTable label="RFP 목록" rows={rows.items} emptyMessage="조건에 맞는 RFP가 없습니다." columns={[
        { id: "number", label: "번호", render: row => <span className="tw:whitespace-nowrap tw:text-[11px]">{row.number}</span> }, { id: "name", label: "사업명", render: row => <strong className="tw:block tw:min-w-40">{row.name}</strong> },
        { id: "department", label: "부서", render: row => row.departmentName }, { id: "pm", label: "PM", render: row => row.pmName }, { id: "date", label: "등록일", render: row => toKoreanDay(row.registeredAt) },
        { id: "budget", label: "예산 (억 원)", align: "end", render: row => <span title={row.budgetKrw.toLocaleString("ko-KR") + "원"} className="tw:tabular-nums">{(row.budgetKrw / 100000000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}</span> },
        { id: "status", label: "상태", render: row => <span className="tw:inline-flex tw:items-center tw:gap-(--layout-inline-gap) tw:whitespace-nowrap tw:text-[11px] tw:font-semibold"><span aria-hidden="true" className="tw:size-2 tw:rounded-full" style={{ backgroundColor: RFP_STATUS_COLORS[row.status] }} />{RFP_STATUS_LABELS[row.status]}</span> },
      ]} /><WorkspaceCardSection><AdminPager {...rows} onChange={(rfpPage) => onChange({ ...query, rfpPage })} /></WorkspaceCardSection>
    </AdminCard>
  </div>;
}
