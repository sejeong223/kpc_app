import { AdminDataError } from "@/lib/admin/errors";
import type { UsageFeature } from "@/types/admin";

export function allocateSelfUsage(input: {
  dailyTokens: readonly number[];
  projects: readonly { id: string | null; tokens: number }[];
  features: readonly { id: UsageFeature; tokens: number }[];
}): { day: number; projectId: string | null; feature: UsageFeature; tokens: number }[] {
  function intervals<T>(items: readonly { id: T; tokens: number }[]) {
    let cursor = 0;
    return items.map((item) => {
      if (!Number.isSafeInteger(item.tokens) || item.tokens < 0) throw new AdminDataError("VALIDATION", "사용량 배분 값이 올바르지 않습니다.");
      const from = cursor; cursor += item.tokens;
      return { ...item, from, to: cursor };
    });
  }
  const days = intervals(input.dailyTokens.map((tokens, i) => ({ id: i + 1, tokens })));
  const projects = intervals(input.projects), features = intervals(input.features);
  const totals = [days, projects, features].map((rows) => rows.at(-1)?.to ?? 0);
  if (!totals.every((total) => total === totals[0])) throw new AdminDataError("VALIDATION", "사용량 합계가 일치하지 않습니다.");
  const result: { day: number; projectId: string | null; feature: UsageFeature; tokens: number }[] = [];
  for (const day of days) for (const project of projects) for (const feature of features) {
    const tokens = Math.min(day.to, project.to, feature.to) - Math.max(day.from, project.from, feature.from);
    if (tokens > 0) result.push({ day: day.id, projectId: project.id, feature: feature.id, tokens });
  }
  return result;
}
