import { DadamButton as Button } from "@/components/ui/DadamControls";
import DashboardCard from "./DashboardCard";
import { AdminStackedBar } from "@/components/admin/ui/AdminCharts";
import type { DashboardQuery, DashboardView } from "@/types/admin";
import { formatWinRate, rfpSegments } from "./rfp-presentation";

interface RfpResultsPanelProps { view: DashboardView; query: DashboardQuery; onChange(query: DashboardQuery): void; onSelectStatus(status: DashboardQuery["rfpStatus"]): void }
export default function RfpResultsPanel({ view, query, onChange, onSelectStatus }: RfpResultsPanelProps): React.ReactElement {
  const bucket = view.registrations.find(row => row.id === query.bucketStart);
  const segments = rfpSegments(view.distribution), total = view.selectedRfpCount;
  const stats = [
    { label: "수주율", value: formatWinRate(view.distribution.won, view.distribution.lost), hint: "수주 / (수주 + 실패)" },
    { label: "수주 금액 합계", value: (view.wonBudgetKrw / 100000000).toLocaleString("ko-KR", { maximumFractionDigits: 2 }) + "억 원", hint: "수주 건의 예산 기준" },
    { label: "Drop 비율", value: (total ? view.distribution.dropped / total * 100 : 0).toFixed(1) + "%", hint: "선택 구간 등록 건 기준" },
  ];
  return <DashboardCard title="결과 분포" actions={<div className="tw:flex tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap)">
    {bucket ? <Button size="small" aria-label="RFP 등록 구간 해제" onClick={() => onChange({ ...query, bucketStart: null, rfpPage: 1 })}>{bucket.label} 등록분 ×</Button> : <span className="tw:text-(--kpc-muted)">전체</span>}
    <span role="status" className="tw:text-(--kpc-secondary) tw:tabular-nums">{total.toLocaleString("ko-KR")}건</span>
  </div>}>
    {total ? <><AdminStackedBar label="RFP 결과 구성" segments={segments} />
      <div aria-label="RFP 결과 분포" className="tw:grid tw:grid-cols-1 tw:gap-(--layout-inline-gap) tw:sm:grid-cols-2">
        {segments.filter(segment => segment.count > 0).map(segment => {
          const selected = query.rfpStatus === segment.id || query.rfpStatus === "progress" && (segment.id === "review" || segment.id === "writing");
          return <button key={segment.id} type="button" aria-pressed={selected} onClick={() => onSelectStatus(segment.id)}
            className={"tw:flex tw:min-w-0 tw:cursor-pointer tw:items-center tw:gap-(--layout-control-gap) tw:rounded-md tw:border-0 tw:p-(--layout-control-gap) tw:text-left tw:text-[12px] tw:hover:bg-(--kpc-bg) tw:focus-visible:outline-2 tw:focus-visible:outline-(--kpc-brand) " + (selected ? "tw:bg-(--kpc-bg) tw:font-bold" : "tw:bg-transparent")}>
            <span aria-hidden="true" className="tw:size-2.5 tw:shrink-0 tw:rounded-sm" style={{ backgroundColor: segment.color }} /><span className="tw:flex-1">{segment.label}</span><strong className="tw:tabular-nums">{segment.count}</strong><span className="tw:w-12 tw:text-right tw:text-[11px] tw:text-(--kpc-muted) tw:tabular-nums">{(segment.count / total * 100).toFixed(1)}%</span>
          </button>;
        })}
      </div></> : <p role="status" className="tw:py-(--layout-section-gap) tw:text-center tw:text-(--kpc-muted)">이 기간에 등록된 RFP가 없습니다.</p>}
    <dl className="tw:m-0 tw:grid tw:grid-cols-1 tw:gap-(--layout-control-gap) tw:border-0 tw:border-t tw:border-solid tw:border-(--kpc-line-soft) tw:pt-(--layout-section-gap) tw:sm:grid-cols-3">
      {stats.map(stat => <div key={stat.label}><dt className="tw:text-[11px] tw:text-(--kpc-muted)">{stat.label}</dt><dd className="tw:m-0 tw:text-[18px] tw:font-bold tw:tabular-nums">{stat.value}</dd><span className="tw:text-[10px] tw:text-(--kpc-muted)">{stat.hint}</span></div>)}
    </dl>
  </DashboardCard>;
}
