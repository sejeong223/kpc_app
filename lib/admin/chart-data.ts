import { AdminDataError } from "@/lib/admin/errors";
import { PeriodSchema } from "@/lib/admin/schemas";
import type { NamedCount } from "@/types/admin";
export interface ChartSegment extends Pick<NamedCount, "id" | "label" | "count"> { color: string; failures?: number }

export function summarizeChartSegments(items: readonly ChartSegment[], otherColor: string, limit = 5): ChartSegment[] {
  if (!Number.isInteger(limit) || limit < 1 || items.some(item => !Number.isFinite(item.count) || item.count < 0)) throw new AdminDataError("VALIDATION", "차트의 분류와 수치를 확인해 주세요.");
  const sorted = [...items].filter(item => item.count > 0).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  if (sorted.length <= limit) return sorted;
  const rest = sorted.slice(limit);
  return [...sorted.slice(0, limit), { id: "chart:other", label: "기타 " + rest.length + "개", color: otherColor,
    count: rest.reduce((sum, item) => sum + item.count, 0), failures: rest.reduce((sum, item) => sum + (item.failures ?? 0), 0) }];
}
export interface ChartPoint { id: string; label: string; value: number; tooltip: string; tableLabel?: string }
export interface ChartCoordinate extends ChartPoint { x: number; y: number }
export interface CalendarChartWeek extends Pick<ChartPoint, "id" | "label"> { days: (ChartPoint | null)[] }
export interface WeeklyChartPoint extends ChartPoint { from: string; to: string; days: number }

const DAY_MS = 86400000;
function sortedDailyPoints(points: readonly ChartPoint[]): ChartPoint[] {
  if (points.some(point => !PeriodSchema.shape.from.safeParse(point.id).success || !Number.isFinite(point.value) || point.value < 0) || new Set(points.map(point => point.id)).size !== points.length) {
    throw new AdminDataError("VALIDATION", "일별 차트의 날짜와 수치를 확인해 주세요.");
  }
  return [...points].sort((a, b) => a.id.localeCompare(b.id));
}

export function buildCalendarWeeks(points: readonly ChartPoint[]): CalendarChartWeek[] {
  const sorted = sortedDailyPoints(points);
  if (!sorted.length) return [];
  const first = new Date(sorted[0].id + "T00:00:00Z"), last = Date.parse(sorted[sorted.length - 1].id + "T00:00:00Z");
  // 한국 날짜로 집계된 ID를 UTC 날짜로 연산해 요일과 DST에 따른 날짜 이동을 방지한다.
  const monday = first.getTime() - (first.getUTCDay() + 6) % 7 * DAY_MS;
  const byDate = new Map(sorted.map(point => [point.id, point])), weeks: CalendarChartWeek[] = [];
  for (let start = monday; start <= last; start += 7 * DAY_MS) {
    const id = new Date(start).toISOString().slice(0, 10);
    weeks.push({ id, label: id.slice(5).replace("-", "."), days: Array.from({ length: 7 }, (_, day) => byDate.get(new Date(start + day * DAY_MS).toISOString().slice(0, 10)) ?? null) });
  }
  return weeks;
}

export function sumWeeklyChartPoints(points: readonly ChartPoint[], unit: string): WeeklyChartPoint[] {
  return buildCalendarWeeks(points).flatMap(week => {
    const days = week.days.filter((point): point is ChartPoint => point !== null);
    if (!days.length) return [];
    const from = days[0].id, to = days[days.length - 1].id, value = days.reduce((sum, point) => sum + point.value, 0);
    const tableLabel = from === to ? from : from + " ~ " + to;
    return [{ id: week.id, label: from.slice(5).replace("-", "."), from, to, days: days.length, value, tableLabel, tooltip: tableLabel + " · " + value.toLocaleString("ko-KR") + " " + unit }];
  });
}

export function buildChartCoordinates(points: readonly ChartPoint[], width: number, height: number): ChartCoordinate[] {
  if (![width, height].every((n) => Number.isFinite(n) && n > 48) || points.some((p) => !Number.isFinite(p.value) || p.value < 0)) throw new AdminDataError("VALIDATION", "차트의 크기와 수치를 확인해 주세요.");
  const maximum = Math.max(1, ...points.map((p) => p.value));
  return points.map((point, i) => ({ ...point, x: points.length === 1 ? width / 2 : 24 + i * (width - 48) / (points.length - 1), y: height - 24 - point.value / maximum * (height - 48) }));
}
