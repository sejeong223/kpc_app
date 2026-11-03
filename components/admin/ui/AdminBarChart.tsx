"use client";
import { useEffect, useId, useRef, useState } from "react";
import Button from "@/components/common/Button";
import type { ChartPoint } from "@/lib/admin/chart-data";

export interface AdminBarChartProps {
  label: string; points: readonly ChartPoint[]; unit: string; color?: string;
  selectedId?: string | null; onSelect?: (id: string | null) => void; compact?: boolean;
}
interface BarNavigation { endId: string | null; selectedId?: string | null }
const BAR_LAYOUT = { minSlotWidth: 64, maxVisible: 14, maxBarWidth: 44, headroom: 24, labelHeight: 28 } as const;

export default function AdminBarChart({ label, points, unit, color = "var(--kpc-info)", selectedId, onSelect, compact = false }: AdminBarChartProps): React.ReactElement {
  const plot = useRef<HTMLDivElement>(null), plotId = useId();
  const [capacity, setCapacity] = useState(7);
  const [navigation, setNavigation] = useState<BarNavigation>({ endId: null, selectedId });
  useEffect(() => {
    const element = plot.current;
    if (!element) return;
    const measure = () => {
      const width = element.getBoundingClientRect().width;
      if (width > 0) setCapacity(Math.max(1, Math.min(BAR_LAYOUT.maxVisible, Math.floor(width / BAR_LAYOUT.minSlotWidth))));
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    const frame = requestAnimationFrame(measure);
    if (!observer) window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); cancelAnimationFrame(frame); if (!observer) window.removeEventListener("resize", measure); };
  }, [points.length]);

  const selectedIndex = points.findIndex(point => point.id === selectedId);
  const anchorIndex = navigation.selectedId === selectedId ? points.findIndex(point => point.id === navigation.endId) : -1;
  const end = points.length <= capacity ? points.length : anchorIndex >= 0 ? anchorIndex + 1 : selectedIndex >= 0 ? Math.min(points.length, Math.max(capacity, selectedIndex + Math.ceil(capacity / 2))) : points.length;
  const start = Math.max(0, end - capacity), visible = points.slice(start, end);
  // 탐색 중에도 전체 조회 기간의 최댓값을 사용해 막대 높이의 비교 기준을 유지한다.
  const maximum = Math.max(1, ...points.map(point => point.value)), step = 10 ** Math.floor(Math.log10(maximum));
  const axisMaximum = Math.ceil(maximum / step) * step, ticks = [...new Set(compact ? [axisMaximum, 0] : [axisMaximum, Math.ceil(axisMaximum / 2), 0])];
  const plotHeight = compact ? 128 : 160, height = BAR_LAYOUT.headroom + plotHeight + BAR_LAYOUT.labelHeight;
  const navigate = (nextEnd: number) => {
    const bounded = Math.min(points.length, Math.max(1, nextEnd));
    setNavigation({ endId: points[bounded - 1]?.id ?? null, selectedId });
  };
  if (!visible.length) return <p role="status" className="tw:py-6 tw:text-center tw:text-(--kpc-muted)">선택 기간에 데이터가 없습니다.</p>;
  return <div className="tw:min-w-0">
    {points.length > capacity && <nav aria-label={label + " 구간 이동"} className="tw:mb-2 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:text-[11px]">
      <span role="status" aria-live="polite" className="tw:text-(--kpc-secondary) tw:tabular-nums">{visible[0].label} — {visible[visible.length - 1].label}<span className="tw:ml-2 tw:text-(--kpc-muted)">({start + 1}–{end} / {points.length}개)</span></span>
      <span className="tw:flex tw:gap-1">
        <Button className="ghost tw:h-7 tw:px-2 tw:text-[11px]" aria-label={label + " 이전 구간"} aria-controls={plotId} disabled={start === 0} onClick={() => navigate(start)}><span aria-hidden="true">←</span> 이전</Button>
        <Button className="ghost tw:h-7 tw:px-2 tw:text-[11px]" aria-label={label + " 다음 구간"} aria-controls={plotId} disabled={end === points.length} onClick={() => navigate(end + capacity)}>다음 <span aria-hidden="true">→</span></Button>
      </span>
    </nav>}
    <div className="tw:grid tw:grid-cols-[40px_minmax(0,1fr)]">
      <div aria-hidden="true" className="tw:relative" style={{ height }}>
        {ticks.map(value => <span key={value} className="tw:absolute tw:right-3 tw:-translate-y-1/2 tw:text-[10px] tw:whitespace-nowrap tw:text-(--kpc-muted) tw:tabular-nums" style={{ top: BAR_LAYOUT.headroom + (1 - value / axisMaximum) * plotHeight }}>{value.toLocaleString("ko-KR", { notation: "compact", maximumFractionDigits: 1 })}</span>)}
      </div>
      <div ref={plot} id={plotId} className="tw:relative tw:min-w-0" style={{ height }}>
        <div aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:inset-0">
          {ticks.map(value => <span key={value} className="tw:absolute tw:inset-x-0 tw:border-0 tw:border-t tw:border-solid" style={{ top: BAR_LAYOUT.headroom + (1 - value / axisMaximum) * plotHeight, borderColor: value ? "var(--kpc-line-soft)" : "var(--kpc-line)" }} />)}
        </div>
        <div className="tw:relative tw:grid tw:h-full tw:gap-1" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}>
          {visible.map(point => {
            const selected = selectedId === point.id;
            const content = <>
              <span className="tw:flex tw:min-h-0 tw:w-full tw:flex-1 tw:items-end tw:justify-center">
                <span className={"tw:relative tw:block tw:rounded-t-[4px] tw:group-hover:opacity-85 " + (selected ? "tw:outline-2 tw:outline-offset-2" : "")} style={{ width: `min(${BAR_LAYOUT.maxBarWidth}px, 68%)`, height: point.value === 0 ? 0 : Math.max(2, point.value / axisMaximum * plotHeight), backgroundColor: color, outlineColor: color }}>
                  <span className="tw:absolute tw:bottom-full tw:left-1/2 tw:mb-1 tw:-translate-x-1/2 tw:text-[11px] tw:leading-4 tw:font-semibold tw:whitespace-nowrap tw:tabular-nums" style={{ color: selected ? color : "var(--kpc-secondary)" }}>{point.value.toLocaleString("ko-KR", { notation: "compact", maximumFractionDigits: 1 })}</span>
                </span>
              </span>
              <span className="tw:block tw:w-full tw:truncate tw:text-center tw:text-[10px] tw:leading-7 tw:font-normal tw:text-(--kpc-muted)" style={{ height: BAR_LAYOUT.labelHeight }}>{point.label}</span>
            </>;
            const classes = "tw:group tw:flex tw:h-full tw:w-full tw:min-w-0 tw:flex-col tw:items-center tw:gap-0 tw:rounded tw:border-0 tw:bg-transparent tw:p-0";
            return onSelect ? <Button key={point.id} className={classes} title={point.tooltip} aria-label={point.tooltip} aria-pressed={selected} onClick={() => onSelect(selected ? null : point.id)}>{content}</Button> : <div key={point.id} className={classes} role="img" aria-label={(point.tableLabel ?? point.label) + " " + point.value.toLocaleString("ko-KR") + unit} title={point.tooltip}>{content}</div>;
          })}
        </div>
      </div>
    </div>
  </div>;
}
