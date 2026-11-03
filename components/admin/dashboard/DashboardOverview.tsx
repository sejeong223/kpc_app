"use client";
import { DataUsageRegular, DocumentRegular, HistoryRegular, TrophyRegular } from "@fluentui/react-icons";
import { AdminMetric } from "@/components/admin/ui/AdminPrimitives";
import { formatTokenCount } from "@/lib/profile-preview";
import { formatKrw } from "@/lib/admin/cost";
import type { DashboardQuery, DashboardView } from "@/types/admin";
import { formatWinRate } from "./rfp-presentation";
import RfpRegistrationPanel from "./RfpRegistrationPanel";
import RfpStatusPanel from "./RfpStatusPanel";
import DepartmentSnapshot from "./DepartmentSnapshot";
import DashboardActivitySummary from "./DashboardActivitySummary";

interface DashboardOverviewProps {
  view: DashboardView; query: DashboardQuery;
  onShowList(query: DashboardQuery): void; onOpenUsage(): void; onOpenDepartments(): void;
}
export default function DashboardOverview({ view, query, onShowList, onOpenUsage, onOpenDepartments }: DashboardOverviewProps): React.ReactElement {
  const showStatus = (rfpStatus: DashboardQuery["rfpStatus"]) => onShowList({ ...query, rfpStatus, bucketStart: null, rfpPage: 1 });
  const counts = view.rfpCounts;
  const allQuery: DashboardQuery = { ...query, rfpStatus: "all", bucketStart: null, rfpPage: 1 };
  return <>
    <section aria-label="핵심 운영 지표" className="tw:grid tw:grid-cols-1 tw:gap-(--layout-section-gap) tw:min-[480px]:grid-cols-2 tw:xl:grid-cols-4">
      <AdminMetric variant="insight" label="등록된 RFP" value={view.totalRfps.toLocaleString("ko-KR")} unit="건" caption="조회 기간 내 전체 제안 기회" icon={<DocumentRegular />} tone="info" onClick={() => showStatus("all")} />
      <AdminMetric variant="insight" label="진행 중" value={(counts.review + counts.writing).toLocaleString("ko-KR")} unit="건" caption={`검토 중 ${counts.review}건 · 작성 중 ${counts.writing}건`} icon={<HistoryRegular />} tone="info" onClick={() => showStatus("progress")} />
      <AdminMetric variant="insight" label="수주율" value={formatWinRate(counts.won, counts.lost)} caption={`수주 ${counts.won}건 / 결과 확정 ${counts.won + counts.lost}건`} icon={<TrophyRegular />} tone="success" onClick={() => showStatus("won")} />
      <AdminMetric variant="insight" label="AI Token 사용" value={formatTokenCount(view.tokens)} caption={formatKrw(view.cost.krwMicros) + " · " + (view.activityPeriod ? view.activityPeriod.from.slice(5) + "~" + view.activityPeriod.to.slice(5) : "집계 기간 없음")} icon={<DataUsageRegular />} tone="purple" onClick={onOpenUsage} />
    </section>
    <div className="tw:grid tw:items-stretch tw:gap-(--layout-section-gap) tw:lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
      <RfpRegistrationPanel view={view} query={allQuery} onShowList={onShowList} /><RfpStatusPanel view={view} onSelect={showStatus} />
    </div>
    <div className="tw:grid tw:items-stretch tw:gap-(--layout-section-gap) tw:lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <DepartmentSnapshot rows={view.departments} onOpen={onOpenDepartments} /><DashboardActivitySummary view={view} onOpen={onOpenUsage} />
    </div>
  </>;
}
