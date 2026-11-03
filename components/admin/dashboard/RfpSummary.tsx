import Button from "@/components/common/Button";
import type { DashboardQuery, DashboardView } from "@/types/admin";
import { RFP_STATUS_COLORS } from "./rfp-presentation";

interface RfpSummaryProps { view?: DashboardView; status: DashboardQuery["rfpStatus"]; onSelect(status: DashboardQuery["rfpStatus"]): void }
export default function RfpSummary({ view, status, onSelect }: RfpSummaryProps): React.ReactElement {
  const counts = view?.rfpCounts;
  const cards = [
    { id: "all", label: "전체", count: view?.totalRfps, color: "var(--kpc-ink)" },
    { id: "progress", label: "진행 중", count: counts ? counts.review + counts.writing : undefined, color: RFP_STATUS_COLORS.writing },
    { id: "submitted", label: "결과 대기", count: counts?.submitted, color: RFP_STATUS_COLORS.submitted },
    { id: "won", label: "수주", count: counts?.won, color: RFP_STATUS_COLORS.won },
    { id: "lost", label: "수주 실패", count: counts?.lost, color: RFP_STATUS_COLORS.lost },
    { id: "dropped", label: "진행 안 함", count: counts?.dropped, color: RFP_STATUS_COLORS.dropped },
  ] as const;
  return <section aria-label="조회 기간 전체 RFP 상태 필터" className="tw:flex tw:min-w-0 tw:flex-wrap tw:gap-1.5">
    {cards.map(card => <Button key={card.id} className={"tw:h-8 tw:gap-1.5 tw:rounded-lg tw:px-2 tw:text-[11px] " + (status === card.id ? "soft active" : "ghost")} aria-pressed={status === card.id} onClick={() => onSelect(card.id)}>
      <span aria-hidden="true" className="tw:size-1.5 tw:rounded-full" style={{ backgroundColor: card.color }} />{card.label}<strong className="tw:ml-0.5 tw:tabular-nums">{card.count?.toLocaleString("ko-KR") ?? "—"}</strong>
    </Button>)}
  </section>;
}
