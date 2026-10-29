import { AdminDataError } from "@/lib/admin/errors";
export interface ChartPoint { id: string; label: string; value: number; tooltip: string }
export interface ChartCoordinate extends ChartPoint { x: number; y: number }
export function buildChartCoordinates(points: readonly ChartPoint[], width: number, height: number): ChartCoordinate[] {
  if (![width, height].every((n) => Number.isFinite(n) && n > 48) || points.some((p) => !Number.isFinite(p.value) || p.value < 0)) throw new AdminDataError("VALIDATION", "차트의 크기와 수치를 확인해 주세요.");
  const maximum = Math.max(1, ...points.map((p) => p.value));
  return points.map((point, i) => ({ ...point, x: points.length === 1 ? width / 2 : 24 + i * (width - 48) / (points.length - 1), y: height - 24 - point.value / maximum * (height - 48) }));
}
