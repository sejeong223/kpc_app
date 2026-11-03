"use client";
import AdminCompositionChart from "@/components/admin/ui/AdminCompositionChart";
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
    <AdminCompositionChart label="RFP 상태별 구성" segments={rows} onSelect={id => {
      const status = rows.find(row => row.id === id);
      if (status) onSelect(status.id);
    }} />
  </DashboardCard>;
}
