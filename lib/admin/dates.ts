import { PeriodSchema } from "@/lib/admin/schemas";
import { AdminDataError, validationError } from "@/lib/admin/errors";
import type { Period } from "@/types/admin";

export function toKoreanDay(iso: string): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) throw new AdminDataError("VALIDATION", "유효한 날짜가 아닙니다.");
  return new Date(time + 9 * 3600000).toISOString().slice(0, 10);
}
export function periodBounds(period: Period): { startMs: number; endExclusiveMs: number } {
  const result = PeriodSchema.safeParse(period);
  if (!result.success) throw validationError(result.error);
  return { startMs: Date.parse(period.from + "T00:00:00+09:00"), endExclusiveMs: Date.parse(period.to + "T00:00:00+09:00") + 86400000 };
}
export function clampActivityPeriod(period: Period): Period | null {
  periodBounds(period);
  if (period.to < "2026-07-23") return null;
  return { from: period.from < "2026-07-23" ? "2026-07-23" : period.from, to: period.to };
}
