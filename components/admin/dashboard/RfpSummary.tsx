import { CheckmarkCircleRegular, DismissCircleRegular, DocumentRegular, HistoryRegular, SendRegular, WarningRegular } from "@fluentui/react-icons";
import { AdminMetric } from "@/components/admin/ui/AdminPrimitives";
import type { DashboardQuery, DashboardView } from "@/types/admin";
import { formatWinRate } from "./rfp-presentation";

interface RfpSummaryProps { view?: DashboardView; status: DashboardQuery["rfpStatus"]; onSelect(status: DashboardQuery["rfpStatus"]): void }
export default function RfpSummary({ view, status, onSelect }: RfpSummaryProps): React.ReactElement {
  const counts = view?.rfpCounts;
  const cards = [
    { id: "all", label: "등록된 RFP", count: view?.totalRfps, caption: "완료 · Drop 포함 전체", icon: <DocumentRegular />, tone: "neutral" },
    { id: "progress", label: "진행 중", count: counts ? counts.review + counts.writing : undefined, caption: counts ? `검토 중 ${counts.review} · 작성 중 ${counts.writing}` : "검토 · 작성 중", icon: <HistoryRegular />, tone: "info" },
    { id: "submitted", label: "제출·결과 대기", count: counts?.submitted, caption: "제출 완료 후 발표 · 평가 중", icon: <SendRegular />, tone: "purple" },
    { id: "won", label: "수주", count: counts?.won, caption: counts ? `수주율 ${formatWinRate(counts.won, counts.lost)} · 결과 확정 ${counts.won + counts.lost}건` : "결과 확정 건 기준", icon: <CheckmarkCircleRegular />, tone: "success" },
    { id: "lost", label: "수주 실패", count: counts?.lost, caption: "미선정", icon: <WarningRegular />, tone: "danger" },
    { id: "dropped", label: "진행 안 함", count: counts?.dropped, caption: "사업 검토 후 Drop", icon: <DismissCircleRegular />, tone: "neutral" },
  ] as const;
  return <section aria-label="조회 기간 전체 RFP 요약" className="tw:flex tw:flex-col tw:gap-(--layout-control-gap)">
    <h2 className="tw:m-0 tw:text-[13px] tw:font-bold">RFP 현황 <span className="tw:ml-(--layout-control-gap) tw:text-[11px] tw:font-normal tw:text-(--kpc-muted)">조회 기간 전체</span></h2>
    <div className="tw:grid tw:grid-cols-2 tw:gap-(--layout-control-gap) tw:md:grid-cols-3 tw:xl:grid-cols-6">
      {cards.map(card => <AdminMetric key={card.id} label={card.label} value={card.count?.toLocaleString("ko-KR") ?? "—"} unit="건" icon={card.icon} caption={card.caption} tone={card.tone} selected={status === card.id} onClick={() => onSelect(status === card.id ? "all" : card.id)} />)}
    </div>
  </section>;
}
