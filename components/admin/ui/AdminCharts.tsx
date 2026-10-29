"use client";
import { buildChartCoordinates, type ChartPoint } from "@/lib/admin/chart-data";
import type { NamedCount } from "@/types/admin";
interface AdminSeriesChartProps { label: string; points: readonly ChartPoint[]; kind: "bar" | "line"; unit: string; selectedId?: string | null; onSelect?: (id: string | null) => void }
interface AdminBreakdownProps { label: string; items: readonly NamedCount[]; selectedId?: string | null; onSelect?: (id: string | null) => void }
export function AdminSeriesChart({ label, points, kind, unit, selectedId, onSelect }: AdminSeriesChartProps): React.ReactElement {
  const coordinates = buildChartCoordinates(points, 720, 200), maximum = Math.max(1, ...points.map((p) => p.value));
  return <figure className="tw:m-0 tw:min-w-0"><figcaption className="tw:mb-3 tw:text-[11px] tw:text-(--kpc-muted)">{label} · 단위: {unit}{onSelect ? " · 막대를 선택하면 해당 구간을 볼 수 있습니다." : ""}</figcaption>
    {!points.length ? <p role="status" className="tw:py-10 tw:text-center tw:text-(--kpc-muted)">선택 기간에 데이터가 없습니다.</p> : kind === "line" ? <svg className="tw:block tw:h-auto tw:w-full" viewBox="0 0 720 200" role="img" aria-label={label + " 추이. 자세한 값은 아래 데이터 표에서 확인할 수 있습니다."}>
      <line x1="24" y1="176" x2="696" y2="176" stroke="var(--kpc-line)" /><polyline fill="none" stroke="var(--kpc-brand)" strokeWidth="2" points={coordinates.map((p) => p.x + "," + p.y).join(" ")} />
      {coordinates.map((p, i) => <g key={p.id}><circle cx={p.x} cy={p.y} r={points.length > 30 ? 2 : 3} fill="var(--kpc-brand)"><title>{p.tooltip}</title></circle>{(i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 6) === 0) && <text x={p.x} y="195" textAnchor="middle" fontSize="10" fill="var(--kpc-muted)">{p.label}</text>}</g>)}
    </svg> : <div className="tw:flex tw:h-52 tw:items-end tw:gap-1 tw:border-0 tw:border-b tw:border-solid tw:border-(--kpc-line)">
      {points.map((point, i) => {
        const content = <><span className="tw:block tw:w-full tw:rounded-t-sm" style={{ height: Math.max(1, point.value / maximum * 160), backgroundColor: selectedId === point.id ? "var(--kpc-brand)" : "var(--kpc-chart-soft)" }} /><span className="tw:mt-2 tw:block tw:h-7 tw:whitespace-nowrap tw:text-center tw:text-[10px] tw:text-(--kpc-muted)">{i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 6) === 0 ? point.label : ""}</span></>;
        const classes = "tw:m-0 tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:justify-end tw:border-0 tw:bg-transparent tw:p-0";
        return onSelect ? <button key={point.id} type="button" className={classes} aria-label={point.tooltip} title={point.tooltip} aria-pressed={selectedId === point.id} onClick={() => onSelect(selectedId === point.id ? null : point.id)}>{content}</button> : <div key={point.id} className={classes} title={point.tooltip}>{content}</div>;
      })}
    </div>}
    <details className="tw:mt-3 tw:text-[11px]"><summary className="tw:cursor-pointer tw:text-(--kpc-secondary)">데이터 표 보기</summary><div className="tw:mt-2 tw:max-h-60 tw:overflow-auto"><table className="tw:w-full tw:border-collapse"><caption className="tw:sr-only">{label}의 정확한 수치</caption><thead><tr><th scope="col" className="tw:p-2 tw:text-left">기간</th><th scope="col" className="tw:p-2 tw:text-right">{unit}</th></tr></thead><tbody>{points.map((p) => <tr key={p.id}><th scope="row" className="tw:p-2 tw:text-left tw:font-normal">{p.label}</th><td className="tw:p-2 tw:text-right tw:tabular-nums">{p.value.toLocaleString("ko-KR")}</td></tr>)}</tbody></table></div></details>
  </figure>;
}
const statusColors: Record<string, string> = { review: "var(--kpc-muted)", writing: "var(--kpc-info)", submitted: "var(--kpc-purple)", won: "var(--kpc-success)", lost: "var(--kpc-danger)", dropped: "var(--kpc-secondary)" };
export function AdminBreakdown({ label, items, selectedId, onSelect }: AdminBreakdownProps): React.ReactElement {
  const maximum = Math.max(1, ...items.map((i) => i.count));
  return <div aria-label={label} className="tw:flex tw:flex-col tw:gap-3">{!items.length && <p className="tw:text-(--kpc-muted)">선택 기간에 데이터가 없습니다.</p>}{items.map((item) => {
    const content = <><span className="tw:mb-1 tw:flex tw:justify-between tw:gap-3"><span className="tw:break-words">{item.label}</span><span className="tw:shrink-0 tw:tabular-nums">{item.count.toLocaleString("ko-KR")}건{item.failures > 0 && <span className="tw:ml-2 tw:text-(--kpc-danger)">실패 {item.failures}</span>}</span></span><span className="tw:block tw:h-1.5 tw:rounded-full tw:bg-(--kpc-line-soft)"><span className="tw:block tw:h-full tw:rounded-full" style={{ width: item.count / maximum * 100 + "%", backgroundColor: statusColors[item.id] ?? "var(--kpc-brand)" }} /></span></>;
    return onSelect ? <button key={item.id} type="button" className="tw:m-0 tw:border-0 tw:bg-transparent tw:p-1 tw:text-left" aria-pressed={item.id === selectedId} onClick={() => onSelect(item.id === selectedId ? null : item.id)}>{content}</button> : <div key={item.id}>{content}</div>;
  })}</div>;
}
