import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSeed } from "@/config/admin-seed";
import { MockAdminDataService } from "@/services/admin/MockAdminDataService";
import type { AdminActor, AdminCommand, AuditQuery, UserQuery } from "@/types/admin";

const admin: AdminActor = { userId: "u-self", name: "정소담", email: "sodam.jeong@example.invalid", role: "super_admin", departmentId: "d-ai" };
const dept: AdminActor = { ...admin, role: "department_admin" }, user: AdminActor = { ...admin, role: "user" };
const users: UserQuery = { page: 1, pageSize: 50, search: "", departmentId: null, role: "all", status: "all" };
const audit: AuditQuery = { page: 1, pageSize: 50, from: "2026-07-23", to: "2026-10-20", userSearch: "", targetSearch: "", action: "all", resource: "all", outcome: "all", sortKey: "occurredAt", direction: "desc" };
let service: MockAdminDataService;
beforeEach(() => { let id = 0; service = new MockAdminDataService({ seed: createAdminSeed(), createId: () => "new-" + ++id }); });
const submit: AdminCommand = { type: "submit-token-request", submissionId: "once", projectId: null, amountTokens: 50000, reason: "추가 분석" };

describe("관리자 mock의 경계와 트랜잭션", () => {
  it("조회·검색·내보내기에서 부서 범위를 먼저 제한한다", async () => {
    expect((await service.getUsers(dept, users)).rows.items).toHaveLength(3);
    expect((await service.getUsers(dept, { ...users, search: "이서연" })).rows.items).toHaveLength(0);
    expect(await service.exportUsers(dept, users)).not.toContain("이서연");
    await expect(service.getUsers(dept, { ...users, departmentId: "d-cx" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.getUsers({ ...dept, departmentId: null }, users)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.getUsers(user, users)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.execute(dept, { type: "process-token-request", target: { id: "request-2", version: 1 }, status: "approved" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await service.getAudit(dept, audit)).rows.items.every((a) => a.departmentId === "d-ai")).toBe(true);
  });
  it("신청 재전송과 동시 승인을 중복 반영하지 않는다", async () => {
    const receipt = await service.execute(user, submit), revision = service.getRevision();
    expect(await service.execute(user, submit)).toEqual(receipt); expect(service.getRevision()).toBe(revision);
    await expect(service.execute(user, { ...submit, amountTokens: 30000 })).rejects.toMatchObject({ code: "CONFLICT" });
    const command: AdminCommand = { type: "process-token-request", target: { id: receipt.createdRequest!.id, version: 1 }, status: "approved" };
    await expect(service.execute(user, command)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const results = await Promise.allSettled([service.execute(dept, command), service.execute(dept, command)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await service.getSelf(user)).limitTokens).toBe(150000);
    expect((await service.getSelf(user)).requests[0].status).toBe("approved");
  });
  it("반려·한도 초과·비활성 계정은 승인 한도를 바꾸지 않는다", async () => {
    const result = await service.execute(user, submit);
    await service.execute(admin, { type: "process-token-request", target: { id: result.createdRequest!.id, version: 1 }, status: "rejected" });
    expect((await service.getSelf(user)).limitTokens).toBe(100000);
    await service.execute(admin, { type: "set-token-limit", target: { id: "account-u-self", version: 1 }, limitTokens: 1_000_000_000 });
    await expect(service.execute(user, { ...submit, submissionId: "overflow" })).rejects.toMatchObject({ code: "VALIDATION" });
    await service.execute(admin, { type: "set-user-status", targets: [{ id: "u-02", version: 1 }], status: "locked" });
    await expect(service.execute(admin, { type: "process-token-request", target: { id: "request-1", version: 1 }, status: "approved" })).rejects.toMatchObject({ code: "INACTIVE_USER" });
  });
  it("배치 중 실패하면 데이터·로그·revision이 모두 그대로다", async () => {
    const before = await service.getAudit(admin, audit), listener = vi.fn(), unsubscribe = service.subscribe(listener);
    await expect(service.execute(admin, { type: "set-user-status", targets: [{ id: "u-02", version: 1 }, { id: "u-03", version: 99 }], status: "locked" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(service.getRevision()).toBe(1); expect(await service.getAudit(admin, audit)).toEqual(before); expect(listener).not.toHaveBeenCalled();
    await service.execute(admin, { type: "set-user-status", targets: [{ id: "u-02", version: 1 }], status: "locked" });
    expect(listener).toHaveBeenCalledTimes(1); unsubscribe();
    await service.execute(admin, { type: "set-user-status", targets: [{ id: "u-02", version: 2 }], status: "active" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it("자기 변경을 거절하고 삭제 복구는 한 번만 허용한다", async () => {
    await expect(service.execute(admin, { type: "delete-users", targets: [{ id: "u-self", version: 1 }] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const before = await service.getAudit(admin, audit), deleted = await service.execute(admin, { type: "delete-users", targets: [{ id: "u-03", version: 1 }] });
    expect((await service.getUsers(admin, users)).rows.total).toBe(17);
    expect((await service.getAudit(admin, audit)).rows.total).toBe(before.rows.total + 1);
    await service.execute(admin, { type: "undo-delete", undoToken: deleted.undoToken! });
    expect((await service.getUsers(admin, users)).rows.total).toBe(18);
    await expect(service.execute(admin, { type: "undo-delete", undoToken: deleted.undoToken! })).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("설정 수정과 조회 DTO 변형이 기존 비용 원장에 영향을 주지 않는다", async () => {
    const before = await service.getSelf(admin), original = structuredClone(before);
    before.usage[0].cost.amountKrwMicros = "0"; before.requests.length = 0;
    await service.execute(admin, { type: "save-fx", version: 1, krwMicrosPerUsd: 1500000000 });
    await service.execute(admin, { type: "save-price", target: { id: "p-reason", version: 1 }, inputUsdMicrosPerMillion: 4000000, outputUsdMicrosPerMillion: 16000000 });
    expect(await service.getSelf(admin)).toEqual(original);
  });
  it("권한 상한과 읽기 의존성을 강제하고 대시보드는 별도로 허용한다", async () => {
    const rows = await service.getRoleGrants(admin); rows[1].grants.users.update = true;
    await expect(service.execute(admin, { type: "save-grants", permissionRevision: 1, rows })).rejects.toMatchObject({ code: "VALIDATION" });
    rows[1].grants.users.update = false; rows[0].grants.audit.read = false;
    await service.execute(admin, { type: "save-grants", permissionRevision: 1, rows });
    await expect(service.getAudit(admin, audit)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await service.getDashboard(admin, { from: "2026-10-01", to: "2026-10-20", rfpStatus: "all", bucketStart: null, userSearch: "", rfpPage: 1 })).activities).toBeGreaterThan(0);
  });
  it("초대와 디렉터리 추가는 중복 회원의 역할을 덮어쓰지 않는다", async () => {
    await service.execute(admin, { type: "add-directory-users", ids: ["u-02", "dir-01"], role: "user", invite: true });
    expect((await service.getUsers(admin, users)).rows.total).toBe(19);
    expect((await service.getUsers(admin, users)).rows.items.find((u) => u.id === "u-02")?.role).toBe("department_admin");
    await expect(service.execute(admin, { type: "add-directory-users", ids: ["dir-01"], role: "user", invite: true })).rejects.toMatchObject({ code: "VALIDATION" });
  });
  it("내보낸 로그에는 내보내기 자체의 새 이벤트가 들어가지 않는다", async () => {
    const before = (await service.getAudit(admin, audit)).rows.total;
    const csv = await service.exportAudit(admin, audit);
    expect(csv).not.toContain("활동 로그 CSV 내보내기");
    expect((await service.getAudit(admin, audit)).rows.total).toBe(before + 1);
  });
});
