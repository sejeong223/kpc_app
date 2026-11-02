import { AdminMetric } from "@/components/admin/ui/AdminPrimitives";
import { formatKrw } from "@/lib/admin/cost";
import { formatTokenCount } from "@/lib/profile-preview";
import type { DashboardView } from "@/types/admin";

export default function DashboardActivitySummary({ view }: { view?: DashboardView }): React.ReactElement {
  return <section aria-label="활동 요약" className="tw:flex tw:flex-col tw:gap-(--layout-control-gap)">
    <div className="tw:grid tw:grid-cols-2 tw:gap-(--layout-section-gap) tw:lg:grid-cols-5">
      <AdminMetric label="총 활동" value={view?.activities.toLocaleString("ko-KR") ?? "—"} />
      <AdminMetric label="활성 사용자" value={view ? String(view.activeUsers) : "—"} caption="명" />
      <AdminMetric label="AI 생성" value={view?.generations.toLocaleString("ko-KR") ?? "—"} />
      <AdminMetric label="다운로드" value={view ? String(view.downloads) : "—"} />
      <AdminMetric label="토큰 사용량" value={view ? formatTokenCount(view.tokens) : "—"} caption={view ? formatKrw(view.cost.krwMicros) + " 예상 비용" : "예상 비용 집계 중"} tone="brand" />
    </div>
    {view?.activityCapped && <p role="status" className="tw:m-0 tw:text-[11px] tw:text-(--kpc-secondary)">{view.activityPeriod ? "활동·토큰 집계는 최근 90일 중 " + view.activityPeriod.from + " ~ " + view.activityPeriod.to + "입니다. RFP는 공통 조회 기간을 사용합니다." : "선택 기간에 보관된 활동이 없습니다. 활동은 최근 90일까지만 제공됩니다."}</p>}
  </section>;
}
