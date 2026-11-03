"use client";
import Button from "@/components/common/Button";
import type { ChartSegment } from "@/lib/admin/chart-data";
import { AdminStackedBar } from "./AdminCharts";

interface AdminRingProps { label: string; segments: readonly ChartSegment[]; compact?: boolean }
interface AdminCompositionChartProps extends Pick<AdminRingProps, "label" | "segments"> {
  kind?: "donut" | "strip"; onSelect?: (id: string) => void;
}

export function AdminRing({ label, segments, compact = false }: AdminRingProps): React.ReactElement {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const description = label + ": " + (total ? segments.map(segment => segment.label + " " + segment.count.toLocaleString("ko-KR") + "건").join(", ") : "데이터 없음");
  return <svg viewBox="0 0 160 160" role="img" aria-label={description} className={compact ? "tw:size-8 tw:shrink-0" : "tw:size-28 tw:shrink-0"}>
    <circle cx="80" cy="80" r="62" fill="none" stroke="var(--kpc-line-soft)" strokeWidth="18" />
    {total > 0 && segments.map((segment, index) => {
      if (segment.count <= 0) return null;
      const percent = segment.count / total * 100, offset = segments.slice(0, index).reduce((sum, item) => sum + item.count, 0) / total * 100;
      return <circle key={segment.id} cx="80" cy="80" r="62" pathLength="100" fill="none" stroke={segment.color} strokeWidth="18" strokeDasharray={percent + " " + (100 - percent)} strokeDashoffset={-offset} transform="rotate(-90 80 80)"><title>{segment.label} {segment.count.toLocaleString("ko-KR")}건 · {percent.toFixed(1)}%</title></circle>;
    })}
    {!compact && <><text x="80" y="80" textAnchor="middle" dominantBaseline="middle" fill="var(--kpc-ink)" fontSize="27" fontWeight="600">{total.toLocaleString("ko-KR", { notation: "compact", maximumFractionDigits: 1 })}</text><text x="80" y="102" textAnchor="middle" fill="var(--kpc-secondary)" fontSize="13">전체 건수</text></>}
  </svg>;
}

export default function AdminCompositionChart({ label, segments, kind = "donut", onSelect }: AdminCompositionChartProps): React.ReactElement {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  return <figure aria-label={label} className="tw:m-0 tw:min-w-0">
    {!total && <p role="status" className="tw:mt-0 tw:text-[11px] tw:text-(--kpc-muted)">선택 기간에 데이터가 없습니다.</p>}
    <div className={kind === "donut" ? "tw:grid tw:grid-cols-[112px_minmax(0,1fr)] tw:items-center tw:gap-3" : "tw:flex tw:flex-col tw:gap-4"}>
      {kind === "donut" ? <AdminRing label={label} segments={segments} /> : <AdminStackedBar label={label} segments={segments} />}
      <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1">
        {segments.map(segment => {
          const content = <><span aria-hidden="true" className="tw:mt-1.5 tw:size-2 tw:shrink-0 tw:rounded-full" style={{ backgroundColor: segment.color }} /><span className="tw:min-w-0 tw:flex-1 tw:break-words tw:font-normal">{segment.label}{Boolean(segment.failures) && <span className="tw:block tw:text-[10px] tw:text-(--kpc-danger)">실패 {segment.failures}건</span>}</span><span className="tw:shrink-0 tw:text-right tw:tabular-nums"><strong className="tw:block">{segment.count.toLocaleString("ko-KR")}건</strong><span className="tw:block tw:text-[10px] tw:font-normal tw:text-(--kpc-muted)">{total ? (segment.count / total * 100).toFixed(1) : "0.0"}%</span></span></>;
          const classes = "tw:flex tw:h-auto tw:min-w-0 tw:items-start tw:justify-start tw:gap-2 tw:rounded-lg tw:px-1.5 tw:py-1 tw:text-left tw:text-xs tw:whitespace-normal";
          return onSelect ? <Button key={segment.id} className={"ghost " + classes} onClick={() => onSelect(segment.id)} aria-label={segment.label + " " + segment.count + "건 목록 보기"}>{content}</Button> : <div key={segment.id} className={classes}>{content}</div>;
        })}
      </div>
    </div>
  </figure>;
}
