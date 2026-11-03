import type { ChartPoint } from "@/lib/admin/chart-data";

interface AdminChartDataTableProps { label: string; points: readonly ChartPoint[]; unit: string; summary?: string }
export default function AdminChartDataTable({ label, points, unit, summary = "데이터 표 보기" }: AdminChartDataTableProps): React.ReactElement {
  return <details className="tw:mt-(--layout-section-gap) tw:text-[11px]">
    <summary className="tw:cursor-pointer tw:text-(--kpc-secondary)">{summary}</summary>
    <div className="tw:mt-(--layout-control-gap) tw:max-h-60 tw:overflow-auto">
      <table className="tw:w-full tw:border-collapse">
        <caption className="tw:sr-only">{label}의 정확한 수치</caption>
        <thead><tr><th scope="col" className="tw:p-(--layout-control-gap) tw:text-left">기간</th><th scope="col" className="tw:p-(--layout-control-gap) tw:text-right">{unit}</th></tr></thead>
        <tbody>{points.map(point => <tr key={point.id}><th scope="row" className="tw:p-(--layout-control-gap) tw:text-left tw:font-normal">{point.tableLabel ?? point.label}</th><td className="tw:p-(--layout-control-gap) tw:text-right tw:tabular-nums">{point.value.toLocaleString("ko-KR")}</td></tr>)}</tbody>
      </table>
      {!points.length && <p className="tw:text-(--kpc-muted)">선택 기간에 데이터가 없습니다.</p>}
    </div>
  </details>;
}
