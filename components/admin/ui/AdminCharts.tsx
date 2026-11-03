"use client";
import { useId } from "react";
import Button from "@/components/common/Button";
import { buildChartCoordinates, type ChartPoint } from "@/lib/admin/chart-data";
import type { NamedCount } from "@/types/admin";
import AdminDotTrack from "./AdminDotTrack";
interface AdminSeriesChartProps { label: string; points: readonly ChartPoint[]; kind: "bar" | "line"; unit: string; selectedId?: string | null; onSelect?: (id: string | null) => void; color?: string; area?: boolean }
interface AdminBreakdownProps { label: string; items: readonly NamedCount[]; selectedId?: string | null; onSelect?: (id: string | null) => void; columns?: 1 | 2; maxCount?: number; variant?: "bar" | "dot"; colorForId?: (id: string) => string }
export function AdminSeriesChart({ label, points, kind, unit, selectedId, onSelect, color = "var(--kpc-info)", area = true }: AdminSeriesChartProps): React.ReactElement {
  const coordinates = buildChartCoordinates(points, 720, 200), maximum = Math.max(1, ...points.map((p) => p.value));
  const fillId = useId();
  return <figure className="tw:m-0 tw:min-w-0"><figcaption className="tw:mb-(--layout-section-gap) tw:text-[11px] tw:text-(--kpc-muted)">{label} · 단위: {unit}{onSelect ? " · 막대를 선택하면 해당 구간을 볼 수 있습니다." : ""}</figcaption>
    {!points.length ? <p role="status" className="tw:py-10 tw:text-center tw:text-(--kpc-muted)">선택 기간에 데이터가 없습니다.</p> : kind === "line" ? <svg className="tw:block tw:h-52 tw:w-full" viewBox="0 0 720 200" role="img" aria-label={label + " 추이. 자세한 값은 아래 데이터 표에서 확인할 수 있습니다."}>
      <defs><linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0.01" /></linearGradient></defs>
      {[1, 0.5, 0].map(fraction => <g key={fraction}><line x1="32" y1={176 - fraction * 152} x2="696" y2={176 - fraction * 152} stroke="var(--kpc-line-soft)" strokeDasharray="3 5" /><text x="2" y={180 - fraction * 152} fontSize="9" fill="var(--kpc-muted)">{(maximum * fraction).toLocaleString("ko-KR", { notation: "compact", maximumFractionDigits: 1 })}</text></g>)}
      {area && coordinates.length > 1 && <path d={"M " + coordinates[0].x + " 176 L " + coordinates.map(p => p.x + " " + p.y).join(" L ") + " L " + coordinates[coordinates.length - 1].x + " 176 Z"} fill={"url(#" + fillId + ")"} />}
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={coordinates.map(p => p.x + "," + p.y).join(" ")} />
      {coordinates.map((p, i) => <g key={p.id}><circle cx={p.x} cy={p.y} r={points.length > 30 ? 2 : 3} fill={color}><title>{p.tooltip}</title></circle>{(i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 6) === 0) && <text x={p.x} y="195" textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="10" fill="var(--kpc-muted)">{p.label}</text>}</g>)}
    </svg> : <div className="tw:relative tw:pl-10"><div aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:inset-x-0 tw:top-[12px] tw:h-40 tw:pl-10">
      {[1, 0.5, 0].map(fraction => <div key={fraction} className="tw:absolute tw:right-0 tw:left-10 tw:border-0 tw:border-t tw:border-dashed tw:border-(--kpc-line)" style={{ top: (1 - fraction) * 160 }}><span className="tw:absolute tw:-top-2 tw:right-full tw:mr-(--layout-control-gap) tw:text-[10px] tw:text-(--kpc-muted)">{(maximum * fraction).toLocaleString("ko-KR", { maximumFractionDigits: 1, notation: "compact" })}</span></div>)}
    </div><div className="tw:relative tw:flex tw:h-52 tw:items-end" style={{ gap: `min(var(--layout-inline-gap), ${40 / Math.max(1, points.length)}%)` }}>
      {points.map((point, i) => {
        const content = <><span className="tw:mx-auto tw:block tw:w-full tw:max-w-7 tw:rounded-t-md" style={{ height: point.value === 0 ? 0 : Math.max(2, point.value / maximum * 160), background: selectedId === point.id ? color : `linear-gradient(to top, color-mix(in srgb, ${color} 65%, var(--kpc-card)), ${color})` }} /><span className="tw:relative tw:mt-(--layout-control-gap) tw:block tw:h-7 tw:whitespace-nowrap tw:text-[10px] tw:font-normal tw:text-(--kpc-muted)"><span className={"tw:absolute " + (i === 0 ? "tw:left-0" : i === points.length - 1 ? "tw:right-0" : "tw:left-1/2 tw:-translate-x-1/2")}>{i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 6) === 0 ? point.label : ""}</span></span></>;
        const classes = "tw:m-0 tw:flex tw:h-full tw:min-w-0 tw:flex-1 tw:flex-col tw:justify-end tw:border-0 tw:bg-transparent tw:p-0 tw:focus-visible:outline-2 tw:focus-visible:outline-(--kpc-info)";
        return onSelect ? <Button key={point.id} className={classes + " tw:items-stretch tw:rounded-md"} aria-label={point.tooltip} title={point.tooltip} aria-pressed={selectedId === point.id} onClick={() => onSelect(selectedId === point.id ? null : point.id)}>{content}</Button> : <div key={point.id} className={classes} title={point.tooltip}>{content}</div>;
      })}
    </div></div>}
    <details className="tw:mt-(--layout-section-gap) tw:text-[11px]"><summary className="tw:cursor-pointer tw:text-(--kpc-secondary)">데이터 표 보기</summary><div className="tw:mt-(--layout-control-gap) tw:max-h-60 tw:overflow-auto"><table className="tw:w-full tw:border-collapse"><caption className="tw:sr-only">{label}의 정확한 수치</caption><thead><tr><th scope="col" className="tw:p-(--layout-control-gap) tw:text-left">기간</th><th scope="col" className="tw:p-(--layout-control-gap) tw:text-right">{unit}</th></tr></thead><tbody>{points.map((p) => <tr key={p.id}><th scope="row" className="tw:p-(--layout-control-gap) tw:text-left tw:font-normal">{p.label}</th><td className="tw:p-(--layout-control-gap) tw:text-right tw:tabular-nums">{p.value.toLocaleString("ko-KR")}</td></tr>)}</tbody></table></div></details>
  </figure>;
}
interface AdminStackedBarProps { label: string; segments: readonly { id: string; label: string; count: number; color: string }[]; compact?: boolean }
export function AdminStackedBar({ label, segments, compact = false }: AdminStackedBarProps): React.ReactElement {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  return <div role="img" aria-label={label + (total ? ": " + segments.map(segment => `${segment.label} ${segment.count}건`).join(", ") : ": 0건")}
    className={"tw:flex tw:w-full tw:overflow-hidden tw:rounded-md tw:bg-(--kpc-line-soft) " + (compact ? "tw:h-2.5 tw:min-w-28" : "tw:h-6")}>
    {segments.filter(segment => segment.count > 0).map(segment => <span key={segment.id} title={`${segment.label} ${segment.count}건 · ${(segment.count / total * 100).toFixed(1)}%`} aria-hidden="true" style={{ width: segment.count / total * 100 + "%", backgroundColor: segment.color }} />)}
  </div>;
}
const statusColors: Record<string, string> = { review: "var(--kpc-muted)", writing: "var(--kpc-info)", submitted: "var(--kpc-purple)", won: "var(--kpc-success)", lost: "var(--kpc-danger)", dropped: "var(--kpc-secondary)" };
export function AdminBreakdown({ label, items, selectedId, onSelect, columns = 1, maxCount = 0, variant = "bar", colorForId }: AdminBreakdownProps): React.ReactElement {
  const maximum = Math.max(1, maxCount, ...items.map((i) => i.count));
  return <div aria-label={label} className={"tw:gap-(--layout-section-gap) " + (columns === 2 ? "tw:grid tw:md:grid-cols-2" : "tw:flex tw:flex-col")}>{!items.length && <p className="tw:text-(--kpc-muted)">선택 기간에 데이터가 없습니다.</p>}{items.map((item) => {
    const color = colorForId?.(item.id) ?? statusColors[item.id] ?? "var(--kpc-brand)";
    const content = <><span className="tw:mb-(--layout-inline-gap) tw:flex tw:justify-between tw:gap-(--layout-section-gap)"><span className="tw:break-words">{item.label}</span><span className="tw:shrink-0 tw:tabular-nums">{item.count.toLocaleString("ko-KR")}건{item.failures > 0 && <span className="tw:ml-(--layout-control-gap) tw:text-(--kpc-danger)">실패 {item.failures}</span>}</span></span>{variant === "dot" ? <AdminDotTrack value={item.count} maximum={maximum} color={color} /> : <span className="tw:block tw:h-1.5 tw:rounded-full tw:bg-(--kpc-line-soft)"><span className="tw:block tw:h-full tw:rounded-full" style={{ width: item.count / maximum * 100 + "%", backgroundColor: color }} /></span>}</>;
    return onSelect ? <button key={item.id} type="button" className="tw:m-0 tw:border-0 tw:bg-transparent tw:p-(--layout-inline-gap) tw:text-left" aria-pressed={item.id === selectedId} onClick={() => onSelect(item.id === selectedId ? null : item.id)}>{content}</button> : <div key={item.id}>{content}</div>;
  })}</div>;
}
