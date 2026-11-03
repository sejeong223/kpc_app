"use client";
import Button from "@/components/common/Button";
import type { DashboardQuery, DashboardView } from "@/types/admin";
import DashboardCard from "./DashboardCard";
import { RFP_STATUS_COLORS } from "./rfp-presentation";

interface RfpStatusPanelProps { view: DashboardView; onSelect(status: DashboardQuery["rfpStatus"]): void }
export default function RfpStatusPanel({ view, onSelect }: RfpStatusPanelProps): React.ReactElement {
  const counts = view.rfpCounts;
  const rows = [
    { id: "progress", label: "진행 중", count: counts.review + counts.writing, color: RFP_STATUS_COLORS.writing },
    { id: "submitted", label: "제출·결과 대기", count: counts.submitted, color: RFP_STATUS_COLORS.submitted },
    { id: "won", label: "수주", count: counts.won, color: RFP_STATUS_COLORS.won },
    { id: "lost", label: "수주 실패", count: counts.lost, color: RFP_STATUS_COLORS.lost },
    { id: "dropped", label: "진행 안 함", count: counts.dropped, color: RFP_STATUS_COLORS.dropped },
  ] as const;
  return <DashboardCard title="RFP 상태 구성" actions={<span className="tw:text-[11px] tw:text-(--kpc-muted)">전체 {view.totalRfps}건 기준</span>}>
    <div className="tw:flex tw:flex-col tw:gap-1">
      {rows.map(row => <Button key={row.id} className="ghost tw:h-auto tw:w-full tw:flex-col tw:items-stretch tw:gap-2 tw:rounded-lg tw:px-2 tw:py-2 tw:text-xs" onClick={() => onSelect(row.id)} aria-label={row.label + " " + row.count + "건 목록 보기"}>
        <span className="tw:flex tw:items-center tw:justify-between tw:gap-3"><span className="tw:font-normal">{row.label}</span><span className="tw:tabular-nums"><strong>{row.count}<span className="tw:ml-0.5 tw:font-normal">건</span></strong><span className="tw:ml-3 tw:inline-block tw:w-10 tw:text-right tw:text-[11px] tw:font-normal tw:text-(--kpc-muted)">{view.totalRfps ? (row.count / view.totalRfps * 100).toFixed(0) : 0}%</span></span></span>
        <span aria-hidden="true" className="tw:h-1.5 tw:overflow-hidden tw:rounded-full tw:bg-(--kpc-line-soft)"><span className="tw:block tw:h-full tw:rounded-full" style={{ width: (view.totalRfps ? row.count / view.totalRfps * 100 : 0) + "%", backgroundColor: row.color }} /></span>
      </Button>)}
    </div>
  </DashboardCard>;
}
