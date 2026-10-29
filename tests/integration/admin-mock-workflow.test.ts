import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { createAdminSeed } from "@/config/admin-seed";
import { calculateCost } from "@/lib/admin/cost";
import { adminQueryKey, retireAdminQueries } from "@/lib/admin/query-keys";
import { toTokenRequestPreview, toTokenUsageSnapshot } from "@/lib/token-preview";
import { MockAdminDataService } from "@/services/admin/MockAdminDataService";
import type { AdminActor, AuditQuery, DashboardQuery, TokenQuery, UserQuery } from "@/types/admin";

const admin: AdminActor = { userId: "u-self", name: "정소담", email: "sodam.jeong@example.invalid", role: "super_admin", departmentId: "d-ai" };
const department: AdminActor = { ...admin, role: "department_admin" };
const user: AdminActor = { ...admin, role: "user" };
const users: UserQuery = { page: 1, pageSize: 50, search: "", departmentId: null, role: "all", status: "all" };
const period = { from: "2026-10-01", to: "2026-10-20" };
const audit: AuditQuery = { ...period, page: 1, pageSize: 50, userSearch: "", targetSearch: "", action: "all", resource: "all", outcome: "all", sortKey: "occurredAt", direction: "desc" };
const dashboard: DashboardQuery = { ...period, rfpStatus: "all", bucketStart: null, userSearch: "", rfpPage: 1 };
const tokens: TokenQuery = { ...period, month: "2026-10", search: "", departmentId: null, status: "all" };
function setup() { let id = 0; return new MockAdminDataService({ seed: createAdminSeed(), createId: () => "integration-" + ++id }); }

describe("관리자 서비스·캐시·프로필 통합", () => {
  it("신청 → 부서 승인 → 일반 사용자 프로필을 하나의 한도와 원장으로 연결한다", async () => {
    const service = setup(), before = await service.getSelf(user);
    expect(before).toMatchObject({ usedTokens: 72400, limitTokens: 100000 });
    const snapshot = toTokenUsageSnapshot(before);
    expect(snapshot.daily.reduce((n, day) => n + day.tokens, 0)).toBe(72400);
    expect(snapshot.byProject.reduce((n, project) => n + project.tokens, 0)).toBe(72400);
    const receipt = await service.execute(user, { type: "submit-token-request", submissionId: "first", projectId: null, amountTokens: 50000, reason: "추가 제안서 검토" });
    const request = receipt.createdRequest!;
    expect((await service.getSelf(user)).limitTokens).toBe(100000);
    expect((await service.getTokenRequests(department)).every((row) => row.departmentId === "d-ai")).toBe(true);
    await expect(service.execute(department, { type: "process-token-request", target: { id: "request-2", version: 1 }, status: "approved" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const approval = { type: "process-token-request", target: { id: request.id, version: 1 }, status: "approved" } as const;
    await service.execute(department, approval);
    await expect(service.execute(department, approval)).rejects.toMatchObject({ code: "CONFLICT" });
    const after = await service.getSelf(user), approved = after.requests.find((row) => row.id === request.id)!;
    expect(after).toMatchObject({ usedTokens: 72400, limitTokens: 150000 });
    expect(toTokenRequestPreview(approved, createAdminSeed().departments)).toMatchObject({ status: "approved", amountK: 50, department: "AI사업본부" });
    const logs = await service.getAudit(admin, { ...audit, action: "approve", targetSearch: request.id });
    expect(logs.rows.total).toBe(1);
    const rejected = await service.execute(user, { type: "submit-token-request", submissionId: "second", projectId: "mois", amountTokens: 30000, reason: "추가 실험" });
    await service.execute(department, { type: "process-token-request", target: { id: rejected.createdRequest!.id, version: 1 }, status: "rejected" });
    expect((await service.getSelf(user)).limitTokens).toBe(150000);
    expect(toTokenUsageSnapshot(await service.getSelf(user))).toEqual(snapshot);
  });

  it("등록·수정·내보내기를 활동 집계에 반영하고 삭제 복구는 과거 사용량을 보존한다", async () => {
    const service = setup(), before = await service.getDashboard(admin, dashboard);
    await service.execute(admin, { type: "create-user", value: { name: "통합 검증", email: "workflow@example.invalid", title: "연구원", departmentId: "d-ai", role: "user", invite: false } });
    const created = (await service.getUsers(admin, { ...users, search: "workflow@" })).rows.items[0];
    await service.execute(admin, { type: "update-user", target: { id: created.id, version: created.version }, value: { name: "수정된 구성원", title: "선임", departmentId: "d-ai", role: "user" } });
    expect((await service.getDashboard(admin, dashboard)).activities).toBe(before.activities + 2);
    const csv = await service.exportUsers(admin, { ...users, search: "workflow@" });
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("수정된 구성원"); expect(csv).not.toContain("이서연");
    expect((await service.getDashboard(admin, dashboard)).downloads).toBe(before.downloads + 1);
    const historical = await service.getTokens(admin, tokens), deleted = await service.execute(admin, { type: "delete-users", targets: [{ id: "u-03", version: 1 }] });
    expect((await service.getUsers(admin, users)).rows.items.some((row) => row.id === "u-03")).toBe(false);
    const afterDelete = await service.getTokens(admin, tokens);
    expect(afterDelete.cost).toEqual(historical.cost); expect(afterDelete.usedTokens).toBe(historical.usedTokens);
    await service.execute(admin, { type: "undo-delete", undoToken: deleted.undoToken! });
    expect((await service.getUsers(admin, users)).rows.items.some((row) => row.id === "u-03")).toBe(true);
    expect((await service.getTokens(admin, tokens)).cost).toEqual(historical.cost);
    expect((await service.getAudit(admin, { ...audit, targetSearch: "u-03", action: "restore" })).rows.total).toBe(1);
  });

  it("단가·환율은 새 계산에만 적용되고 이전 사용량의 비용은 유지된다", async () => {
    const service = setup(), before = await service.getTokens(admin, tokens), pricing = await service.getPricing(admin);
    const price = pricing.prices.find((row) => row.id === "p-reason")!;
    const input = { inputTokens: 1000, outputTokens: 500, capturedAt: "2026-10-20T00:00:00.000Z" };
    expect(calculateCost({ ...input, price, krwMicrosPerUsd: pricing.krwMicrosPerUsd }).amountKrwMicros).toBe("8400000");
    await service.execute(admin, { type: "save-price", target: { id: price.id, version: price.version }, inputUsdMicrosPerMillion: 4000000, outputUsdMicrosPerMillion: 16000000 });
    await service.execute(admin, { type: "save-fx", version: pricing.version, krwMicrosPerUsd: 1500000000 });
    const latest = await service.getPricing(admin);
    expect(calculateCost({ ...input, price: latest.prices.find((row) => row.id === price.id)!, krwMicrosPerUsd: latest.krwMicrosPerUsd }).amountKrwMicros).toBe("18000000");
    expect((await service.getTokens(admin, tokens)).cost).toEqual(before.cost);
  });

  it("전사 캐시를 채운 뒤에도 부서 조회와 권한 회수는 새 범위에서 처리한다", async () => {
    const service = setup(), client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    try {
      const allKey = adminQueryKey({ actor: admin, revision: 1, kind: "tokens", filter: tokens });
      const deptKey = adminQueryKey({ actor: department, revision: 1, kind: "tokens", filter: tokens });
      const all = await client.fetchQuery({ queryKey: allKey, queryFn: () => service.getTokens(admin, tokens) });
      expect(client.getQueryData(deptKey)).toBeUndefined();
      const scoped = await client.fetchQuery({ queryKey: deptKey, queryFn: () => service.getTokens(department, tokens) });
      expect(scoped.rows).toHaveLength(3); expect(scoped.rows.every((row) => row.departmentId === "d-ai")).toBe(true);
      expect(scoped.departments.map((row) => row.id)).toEqual(["d-ai"]);
      expect(JSON.stringify(scoped)).not.toContain("이서연");
      expect(BigInt(scoped.cost.krwMicros)).toBeLessThan(BigInt(all.cost.krwMicros));
      const grants = await service.getRoleGrants(admin);
      grants.find((row) => row.role === "department_admin")!.grants.tokenPolicies.read = false;
      await service.execute(admin, { type: "save-grants", permissionRevision: 1, rows: grants });
      expect((await service.getAccess(department)).permissionRevision).toBe(2);
      const revokedKey = adminQueryKey({ actor: department, revision: service.getRevision(), kind: "tokens", filter: tokens });
      expect(client.getQueryData(revokedKey)).toBeUndefined();
      await expect(client.fetchQuery({ queryKey: revokedKey, queryFn: () => service.getTokens(department, tokens) })).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(client.getQueryData(revokedKey)).toBeUndefined();
      await expect(service.getTokens({ ...department, departmentId: null }, tokens)).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally { client.clear(); }
  });

  it("서로 다른 공급자는 신청·한도·삭제 상태를 공유하지 않는다", async () => {
    const first = setup(), second = setup(), baseline = await second.getSelf(user);
    const receipt = await first.execute(user, { type: "submit-token-request", submissionId: "isolated", amountTokens: 50000, projectId: null, reason: "인스턴스 검증" });
    await first.execute(department, { type: "process-token-request", target: { id: receipt.createdRequest!.id, version: 1 }, status: "approved" });
    await first.execute(admin, { type: "delete-users", targets: [{ id: "u-03", version: 1 }] });
    expect((await first.getSelf(user)).limitTokens).toBe(150000);
    expect(await second.getSelf(user)).toEqual(baseline);
    expect((await second.getUsers(admin, users)).rows.total).toBe(18);
    expect(await setup().getSelf(user)).toEqual(baseline);
  });

  it("직접 등록한 사용자를 그룹에 추가하고 삭제 후 후보에서 제외한다", async () => {
    const service = setup();
    await service.execute(admin, { type: "create-user", value: { name: "직접 등록", email: "direct@example.invalid", title: "선임", departmentId: "d-ai", role: "user", invite: false } });
    const entry = (await service.getDirectory(admin)).find((row) => row.email === "direct@example.invalid")!;
    expect(entry.registeredUserId).not.toBeNull();
    await service.execute(admin, { type: "create-group", value: { name: "직접 등록 그룹", memberIds: [entry.registeredUserId!] } });
    expect((await service.getGroups(admin, { search: "직접 등록 그룹", page: 1, pageSize: 20 })).items[0].members[0].name).toBe("직접 등록");
    await service.execute(admin, { type: "delete-users", targets: [{ id: entry.registeredUserId!, version: 1 }] });
    expect((await service.getDirectory(admin)).some((row) => row.email === entry.email)).toBe(false);
    expect((await service.getGroups(admin, { search: "직접 등록 그룹", page: 1, pageSize: 20 })).items[0].members).toHaveLength(0);
  });

  it("부서 없는 관리자는 생성·역할 변경 경로 모두에서 거절한다", async () => {
    const service = setup(), value = { name: "미지정", email: "no-dept@example.invalid", title: "선임", departmentId: null, invite: false };
    await expect(service.execute(admin, { type: "create-user", value: { ...value, role: "department_admin" } })).rejects.toMatchObject({ code: "VALIDATION" });
    await service.execute(admin, { type: "create-user", value: { ...value, role: "user" } });
    const created = (await service.getUsers(admin, { ...users, search: value.email })).rows.items[0];
    await expect(service.execute(admin, { type: "change-user-role", targets: [{ id: created.id, version: 1 }], role: "department_admin" })).rejects.toMatchObject({ code: "VALIDATION" });
    expect((await service.getUsers(admin, { ...users, search: value.email })).rows.items[0].role).toBe("user");
  });

  it("자기 계정 부서를 편집한 후 역할을 전환하면 현재 부서로 조회한다", async () => {
    const service = setup();
    await service.execute(admin, { type: "update-user", target: { id: "u-self", version: 1 }, value: { name: "이름 수정", title: "수석", departmentId: "d-edu", role: "super_admin" } });
    const actor = service.getCurrentActor(department);
    expect(actor).toMatchObject({ role: "department_admin", name: "이름 수정", departmentId: "d-edu" });
    expect((await service.getUsers(actor, users)).rows.items.every((row) => row.departmentId === "d-edu")).toBe(true);
    await expect(service.getUsers(department, users)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("이전 캐시 정리가 지연되어도 더 새로운 revision이나 다시 관찰하는 조회를 지우지 않는다", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    const oldKey = adminQueryKey({ actor: admin, revision: 1, kind: "users" });
    const nextKey = adminQueryKey({ actor: department, revision: 3, kind: "users" });
    client.setQueryData(oldKey, ["전사"]);
    const retiring = retireAdminQueries(client, department, 2);
    client.setQueryData(nextKey, ["자기 부서"]);
    const observer = new QueryObserver(client, { queryKey: oldKey, queryFn: async () => ["전사"] });
    const unsubscribe = observer.subscribe(() => {});
    try {
      await retiring;
      expect(client.getQueryData(nextKey)).toEqual(["자기 부서"]);
      expect(client.getQueryData(oldKey)).toEqual(["전사"]);
      unsubscribe();
      await retireAdminQueries(client, department, 3);
      expect(client.getQueryData(oldKey)).toBeUndefined();
      expect(client.getQueryData(nextKey)).toEqual(["자기 부서"]);
    } finally { unsubscribe(); client.clear(); }
  });
});
