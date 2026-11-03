import { AdminDataError } from "@/lib/admin/errors";
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
export interface ChartPoint { id: string; label: string; value: number; tooltip: string }
export interface ChartCoordinate extends ChartPoint { x: number; y: number }
export function buildChartCoordinates(points: readonly ChartPoint[], width: number, height: number): ChartCoordinate[] {
  if (![width, height].every((n) => Number.isFinite(n) && n > 48) || points.some((p) => !Number.isFinite(p.value) || p.value < 0)) throw new AdminDataError("VALIDATION", "차트의 크기와 수치를 확인해 주세요.");
  const maximum = Math.max(1, ...points.map((p) => p.value));
  return points.map((point, i) => ({ ...point, x: points.length === 1 ? width / 2 : 24 + i * (width - 48) / (points.length - 1), y: height - 24 - point.value / maximum * (height - 48) }));
}
