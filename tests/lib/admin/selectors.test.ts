import { expect, it } from "vitest";
import { createAdminSeed } from "@/config/admin-seed";
import { auditRows,buildDashboard, costTotal, inPeriod, selectTokens, tokenTotal } from "@/lib/admin/selectors";
import { auditQuery } from "../../services/admin/work-fixture";
import type { AdminActor, DashboardQuery } from "@/types/admin";

const actor: AdminActor = { userId: "u-self", name: "정소담", email: "sodam@example.invalid", role: "department_admin", departmentId: "d-ai" };
const query: DashboardQuery = { from: "2026-10-01", to: "2026-10-20", rfpStatus: "all", bucketStart: null, userSearch: "", rfpPage: 1 };
it("대시보드·추이·사용자별 합계가 같은 부서 원장을 따른다", () => {
  const state = createAdminSeed(), result = buildDashboard(state, actor, query);
  const usage = state.usages.filter((u) => u.departmentId === "d-ai" && inPeriod(u.occurredAt, query));
  expect(result.tokens).toBe(tokenTotal(usage)); expect(result.cost).toEqual(costTotal(usage));
  expect(result.trends.reduce((n, p) => n + p.tokens, 0)).toBe(result.tokens);
  expect(result.users.reduce((n, p) => n + p.activities, 0)).toBe(result.activities);
  expect(result.trends).toHaveLength(20);
  const selected = buildDashboard(state, actor, { ...query, bucketStart: result.registrations[0].id, rfpStatus: "won" });
  expect(selected.totalRfps).toBe(result.totalRfps); expect(selected.departments).toEqual(result.departments);
});
it("부서·기간을 먼저 제한한 뒤 작업명으로 검색·집계한다",()=>{
  const state=createAdminSeed(),base={...state.audits[0],occurredAt:state.logicalNow,resource:"templates" as const,action:"apply" as const};
  state.audits=[{...base,id:"a",departmentId:"d-ai",detail:'{"version":1}',outcome:"success"},{...base,id:"b",departmentId:"d-ai",detail:'{"version":2}',outcome:"failure"},{...base,id:"c",departmentId:"d-product",detail:'{"version":3}',outcome:"success"}];
  const snapshot=structuredClone(state.audits),view=buildDashboard(state,actor,query);
  expect(view.details).toEqual([{id:"templates:apply:apply-template",label:"PPT 서식 적용",count:2,failures:1}]);
  expect(auditRows(state,actor,{...auditQuery,targetSearch:"PPT 서식 적용"}).map(item=>item.id).sort()).toEqual(["a","b"]);
  expect(auditRows(state,actor,{...auditQuery,targetSearch:'"version":2'})).toHaveLength(1);
  expect(state.audits).toEqual(snapshot);
});
it("과거 기간·삭제 사용자 이력·개인 목록 필터를 분리한다", () => {
  const state = createAdminSeed(); state.users[1].deletedAt = state.logicalNow;
  const result = buildDashboard(state, actor, query);
  expect(result.users.some((u) => u.id === "u-02")).toBe(true);
  const empty = buildDashboard(state, actor, { ...query, from: "2025-01-01", to: "2025-02-01" });
  expect(empty.activityPeriod).toBeNull(); expect(empty.activities).toBe(0); expect(empty.tokens).toBe(0);
  const tokenQuery = { from: query.from, to: query.to, month: "2026-10", departmentId: null, search: "", status: "all" as const };
  const all = selectTokens(state, actor, tokenQuery), filtered = selectTokens(state, actor, { ...tokenQuery, search: "없는 사람" });
  expect(filtered.rows).toHaveLength(0); expect(filtered.usedTokens).toBe(all.usedTokens); expect(filtered.cost).toEqual(all.cost);
});
