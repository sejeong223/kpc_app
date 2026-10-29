import { expect, it } from "vitest";
import { createAdminSeed } from "@/config/admin-seed";
import { TOKEN_USAGE_SNAPSHOT } from "@/config/token-preview";
import { toKoreanDay, clampActivityPeriod, periodBounds } from "@/lib/admin/dates";

it("일·프로젝트·기능·감사 로그의 동일 원장 합계를 유지한다", () => {
  const state = createAdminSeed(), usage = state.usages.filter((u) => u.userId === "u-self");
  const sum = (rows: typeof usage) => rows.reduce((total, u) => total + u.inputTokens + u.outputTokens, 0);
  expect(sum(usage)).toBe(72400);
  for (const day of TOKEN_USAGE_SNAPSHOT.daily) expect(sum(usage.filter((u) => Number(toKoreanDay(u.occurredAt).slice(-2)) === day.day))).toBe(day.tokens);
  for (const project of TOKEN_USAGE_SNAPSHOT.byProject) expect(sum(usage.filter((u) => u.projectId === (project.id === "outside" ? null : project.id)))).toBe(project.tokens);
  for (const feature of TOKEN_USAGE_SNAPSHOT.byFeature) expect(sum(usage.filter((u) => u.feature === feature.id))).toBe(72400 * feature.percent / 100);
  expect(state.audits.filter((a) => a.actorId === "u-self").reduce((n, a) => n + a.tokens, 0)).toBe(72400);
  for (const u of state.usages) {
    expect(state.users.some((user) => user.id === u.userId && user.status !== "invited")).toBe(true);
    expect(state.models.some((m) => m.id === u.modelId)).toBe(true);
    expect(u.projectId === null || state.rfps.some((r) => r.id === u.projectId)).toBe(true);
    expect(state.audits.filter((a) => a.usageId === u.id)).toHaveLength(1);
    expect(state.prices.find((p) => p.id === u.cost.priceId)?.createdAt.localeCompare(u.occurredAt)).toBeLessThanOrEqual(0);
  }
  for (const r of state.rfps) expect(state.users.some((u) => u.id === r.pmId && u.departmentId === r.departmentId)).toBe(true);
  state.settings.warningPercents[0] = 1; state.groups[0].memberIds.length = 0;
  const other = createAdminSeed(); expect(other.settings.warningPercents[0]).toBe(70); expect(other.groups[0].memberIds).toHaveLength(3);
});
it("한국 날짜 경계와 활동 기간의 빈 교집합을 처리한다", () => {
  expect(toKoreanDay("2026-10-19T15:00:00.000Z")).toBe("2026-10-20");
  expect(periodBounds({ from: "2026-10-20", to: "2026-10-20" }).endExclusiveMs - periodBounds({ from: "2026-10-20", to: "2026-10-20" }).startMs).toBe(86400000);
  expect(clampActivityPeriod({ from: "2025-01-01", to: "2025-12-31" })).toBeNull();
});
