import { AdminMetric } from "@/components/admin/ui/AdminPrimitives";
import { ArrowDownloadRegular, DataUsageRegular, FlashRegular, PeopleRegular, SparkleRegular } from "@fluentui/react-icons";
import { formatKrw } from "@/lib/admin/cost";
import { formatTokenCount } from "@/lib/profile-preview";
import type { DashboardView } from "@/types/admin";

export default function DashboardActivitySummary({ view }: { view?: DashboardView }): React.ReactElement {
  return <section aria-label="활동 요약" className="tw:flex tw:flex-col tw:gap-(--layout-control-gap)">
    <h2 className="tw:m-0 tw:text-[13px] tw:font-bold">활동 현황 <span className="tw:ml-(--layout-control-gap) tw:text-[11px] tw:font-normal tw:text-(--kpc-muted)">{view?.activityPeriod ? `${view.activityPeriod.from} ~ ${view.activityPeriod.to}` : "활동 로그 기준"}</span></h2>
    <div className="tw:grid tw:grid-cols-2 tw:gap-(--layout-control-gap) tw:lg:grid-cols-5">
      <AdminMetric label="총 활동 수" value={view?.activities.toLocaleString("ko-KR") ?? "—"} icon={<FlashRegular />} caption="활동 로그 이벤트 수" />
      <AdminMetric label="활성 사용자" value={view ? String(view.activeUsers) : "—"} unit="명" icon={<PeopleRegular />} caption="기간 내 활동한 사용자" />
      <AdminMetric label="AI 생성 요청" value={view?.generations.toLocaleString("ko-KR") ?? "—"} unit="회" icon={<SparkleRegular />} caption="분석 · 초안 · 다듬기 · 슬라이드" />
      <AdminMetric label="다운로드" value={view ? String(view.downloads) : "—"} unit="회" icon={<ArrowDownloadRegular />} caption="활동 로그의 내보내기 기준" />
      <AdminMetric label="AI Token 사용" value={view ? formatTokenCount(view.tokens) : "—"} icon={<DataUsageRegular />} caption={view ? formatKrw(view.cost.krwMicros) + " 예상 비용" : "예상 비용 집계 중"} />
    </div>
    {view?.activityCapped && <p role="status" className="tw:m-0 tw:text-[11px] tw:text-(--kpc-secondary)">{view.activityPeriod ? "활동·토큰 집계는 최근 90일 중 " + view.activityPeriod.from + " ~ " + view.activityPeriod.to + "입니다. RFP는 공통 조회 기간을 사용합니다." : "선택 기간에 보관된 활동이 없습니다. 활동은 최근 90일까지만 제공됩니다."}</p>}
  </section>;
}
