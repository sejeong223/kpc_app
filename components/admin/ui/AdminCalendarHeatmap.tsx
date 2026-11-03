"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import Button from "@/components/common/Button";
import { buildCalendarWeeks, type ChartPoint } from "@/lib/admin/chart-data";
import AdminChartDataTable from "./AdminChartDataTable";

interface AdminCalendarHeatmapProps { label: string; points: readonly ChartPoint[]; unit: string; color: string }
const weekdays = ["월", "화", "수", "목", "금", "토", "일"] as const;
function cellColor(level: number, color: string): string {
  if (!level) return "var(--kpc-line-soft)";
  if (level === 4) return `color-mix(in srgb, ${color} 85%, black)`;
  return `color-mix(in srgb, ${color} ${[0, 16, 32, 55][level]}%, var(--kpc-card))`;
}

export default function AdminCalendarHeatmap({ label, points, unit, color }: AdminCalendarHeatmapProps): React.ReactElement {
  const weeks = buildCalendarWeeks(points), ordered = weeks.flatMap(week => week.days.filter((point): point is ChartPoint => point !== null));
  const byDate = new Map(ordered.map(point => [point.id, point])), maximum = Math.max(0, ...ordered.map(point => point.value));
  const [selectedDate, setSelectedDate] = useState<string | null>(null), [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const currentDate = selectedDate && byDate.has(selectedDate) ? selectedDate : ordered[ordered.length - 1]?.id;
  const displayed = byDate.get(hoveredDate ?? "") ?? byDate.get(currentDate ?? "");
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, point: ChartPoint) => {
    const offsets = new Map([["ArrowUp", -1], ["ArrowDown", 1], ["ArrowLeft", -7], ["ArrowRight", 7]]);
    const offset = offsets.get(event.key);
    if (offset === undefined && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const target = event.key === "Home" ? ordered[0]?.id : event.key === "End" ? ordered[ordered.length - 1]?.id : new Date(Date.parse(point.id + "T00:00:00Z") + (offset ?? 0) * 86400000).toISOString().slice(0, 10);
    if (target) buttons.current.get(target)?.focus();
  };
  return <figure className="tw:m-0 tw:min-w-0" aria-label={label}>
    {!ordered.length ? <p role="status" className="tw:py-6 tw:text-center tw:text-(--kpc-muted)">선택 기간에 데이터가 없습니다.</p> : <>
      <figcaption className="tw:mb-2 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:text-[11px] tw:text-(--kpc-secondary)">
        <span>요일별 패턴 · 날짜를 선택하면 수치를 확인할 수 있습니다.</span>
        <span className="tw:tabular-nums">{ordered[0].id} — {ordered[ordered.length - 1].id}</span>
      </figcaption>
      <p className="tw:sr-only">방향키로 날짜와 주를 이동하고 Home, End 키로 첫 날짜와 마지막 날짜로 이동합니다. 빈칸은 집계값이 없는 날짜입니다.</p>
      <div className="tw:overflow-x-auto tw:pb-1" onMouseLeave={() => setHoveredDate(null)}>
        <div style={{ minWidth: Math.max(160, weeks.length * 28 + 28), maxWidth: Math.max(240, weeks.length * 72 + 28) }}>
          <table className="tw:w-full tw:table-fixed tw:border-separate tw:[border-spacing:4px]">
            <caption className="tw:sr-only">{label} · 열은 월요일에 시작하는 주, 행은 요일</caption>
            <thead><tr><th scope="col" className="tw:w-5 tw:text-[10px] tw:font-normal tw:text-(--kpc-muted)"><span className="tw:sr-only">요일</span></th>{weeks.map((week, index) => <th key={week.id} scope="col" className="tw:h-5 tw:p-0 tw:text-[10px] tw:font-normal tw:text-(--kpc-muted)"><span className={index % 2 === 0 ? "tw:whitespace-nowrap" : "tw:sr-only"}>{index % 2 === 0 ? week.label : week.id + " 주"}</span></th>)}</tr></thead>
            <tbody>{weekdays.map((day, dayIndex) => <tr key={day}>
              <th scope="row" className="tw:p-0 tw:text-left tw:text-[10px] tw:font-normal tw:text-(--kpc-secondary)">{day}</th>
              {weeks.map(week => {
                const point = week.days[dayIndex], level = point && point.value > 0 ? Math.ceil(point.value / maximum * 4) : 0;
                return <td key={week.id} className="tw:p-0">{point ? <Button
                  ref={node => { if (node) buttons.current.set(point.id, node); else buttons.current.delete(point.id); }}
                  className={"tw:flex tw:h-6 tw:w-full tw:overflow-hidden tw:rounded tw:border-0 tw:p-0 tw:text-[10px] tw:font-medium tw:tabular-nums " + (currentDate === point.id ? "tw:outline tw:outline-offset-1" : "")}
                  style={{ backgroundColor: cellColor(level, color), color: level === 4 ? "#fff" : "var(--kpc-ink)", outlineColor: color }}
                  tabIndex={point.id === currentDate ? 0 : -1} aria-pressed={point.id === currentDate}
                  aria-label={point.id + " " + day + "요일 · " + point.value.toLocaleString("ko-KR") + unit}
                  title={point.tooltip} onFocus={() => { setSelectedDate(point.id); setHoveredDate(null); }} onClick={() => { setSelectedDate(point.id); setHoveredDate(null); }} onMouseEnter={() => setHoveredDate(point.id)} onKeyDown={event => navigate(event, point)}>
                  <span className="tw:truncate">{point.value.toLocaleString("ko-KR", { notation: "compact", maximumFractionDigits: 0 })}</span>
                </Button> : <span aria-label="집계값 없음" className="tw:block tw:h-6 tw:rounded tw:border tw:border-dashed tw:border-(--kpc-line)" />}</td>;
              })}
            </tr>)}</tbody>
          </table>
        </div>
      </div>
      <div className="tw:mt-2 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:text-[11px]">
        <span className="tw:tabular-nums tw:text-(--kpc-secondary)">{displayed?.id}<strong className="tw:ml-2 tw:font-semibold tw:text-(--kpc-ink)">{displayed?.value.toLocaleString("ko-KR")}{unit}</strong></span>
        <span className="tw:flex tw:flex-wrap tw:items-center tw:gap-1.5 tw:text-[10px] tw:text-(--kpc-secondary)" aria-label={"색 강도: 0부터 최대 " + maximum + unit + ". 점선 빈칸은 집계값 없음"}>
          <span>0</span>{(maximum ? [0, 1, 2, 3, 4] : [0]).map(level => <span key={level} aria-hidden="true" className="tw:size-3 tw:rounded-sm" style={{ backgroundColor: cellColor(level, color) }} />)}<span>최대 {maximum.toLocaleString("ko-KR")}{unit}</span>
          <span aria-hidden="true" className="tw:ml-2 tw:size-3 tw:rounded-sm tw:border tw:border-dashed tw:border-(--kpc-line)" /><span>집계값 없음</span>
        </span>
      </div>
    </>}
    <AdminChartDataTable label={label} points={ordered} unit={unit} summary="일별 데이터 표 보기" />
  </figure>;
}
