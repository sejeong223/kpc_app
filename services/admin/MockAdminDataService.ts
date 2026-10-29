import { z } from "zod";
import { ADMIN_DIRECTORY } from "@/config/admin-seed";
import { ADMIN_RESOURCES, CRUD_ACTIONS } from "@/config/admin-permissions";
import { AdminDataError, validationError } from "@/lib/admin/errors";
import { assertPermission, canPerform } from "@/lib/admin/permissions";
import { requireVersion, uniqueTargets, validDepartment, validateGrants } from "@/lib/admin/command-validation";
import { makeCsv } from "@/lib/admin/csv";
import { toKoreanDay } from "@/lib/admin/dates";
import { auditRows, buildDashboard, buildSelfUsage, inScope, matches, paginate, selectAudit, selectTokens, selectUsers, userRows, visibleDepartments } from "@/lib/admin/selectors";
import { AdminCommandSchema, AdminStoreStateSchema, AuditQuerySchema, DashboardQuerySchema, GroupQuerySchema, TokenQuerySchema, UserQuerySchema } from "@/lib/admin/schemas";
import type { AdminAccessView, AdminActor, AdminCommand, AdminDataService, AdminResource, AdminStoreState, AdminUser, AuditAction, AuditQuery, AuditResource, CommandReceipt, CrudAction, DashboardQuery, GroupQuery, NewAdminUser, TokenQuery, UserQuery, VersionedRef } from "@/types/admin";

interface MockAdminOptions { seed: AdminStoreState; createId?: () => string }
interface UndoEntry { resource: "users" | "groups"; targets: VersionedRef[]; deletedAt: string }
function parse<T extends z.ZodType>(schema: T, input: z.input<T>): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw validationError(result.error);
  return result.data;
}
export class MockAdminDataService implements AdminDataService {
  private state: AdminStoreState;
  private readonly createId: () => string;
  private readonly listeners = new Set<() => void>();
  private readonly undos = new Map<string, UndoEntry>();
  private readonly submissions = new Map<string, { payload: string; receipt: CommandReceipt }>();
  constructor(options: MockAdminOptions) {
    this.state = structuredClone(AdminStoreStateSchema.parse(options.seed));
    this.createId = options.createId ?? (() => crypto.randomUUID());
  }
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getRevision = (): number => this.state.revision;
  // 미리보기 역할은 유지하되 편집된 자기 계정의 부서·표시 정보를 런타임에 반영한다.
  getCurrentActor(input: AdminActor): AdminActor {
    const user = this.state.users.find((row) => row.id === input.userId && !row.deletedAt);
    return user ? { ...input, name: user.name, email: user.email, departmentId: user.departmentId } : { ...input };
  }
  private actor(input: AdminActor): AdminActor {
    const user = this.state.users.find((u) => u.id === input.userId && !u.deletedAt);
    if (!user || user.status !== "active") throw new AdminDataError("INACTIVE_USER", "사용할 수 없는 계정입니다.");
    if (input.role === "department_admin" && (!input.departmentId || input.departmentId !== user.departmentId)) throw new AdminDataError("FORBIDDEN", "확인된 소속 부서가 필요합니다.");
    return { userId: user.id, name: user.name, email: user.email, role: input.role, departmentId: user.departmentId };
  }
  private access(input: AdminActor, resource: AdminResource, action: CrudAction = "read"): AdminActor {
    const actor = this.actor(input); assertPermission(actor, this.state.roleGrants, resource, action); return actor;
  }
  private checkDepartment(actor: AdminActor, departmentId: string | null) {
    if (departmentId && !inScope(actor, departmentId)) throw new AdminDataError("FORBIDDEN", "조회할 수 없는 부서입니다.");
    validDepartment(this.state, departmentId);
  }
  getAccessSnapshot(input: AdminActor): AdminAccessView {
    const actor = this.actor(input);
    const grants = Object.fromEntries(ADMIN_RESOURCES.map((resource) => [resource, Object.fromEntries(CRUD_ACTIONS.map((action) => [action, canPerform(actor, this.state.roleGrants, resource, action)]))])) as AdminAccessView["grants"];
    return structuredClone({ actor, grants, revision: this.state.revision, permissionRevision: this.state.permissionRevision, departments: visibleDepartments(this.state, actor), logicalNow: this.state.logicalNow });
  }
  async getAccess(input: AdminActor): Promise<AdminAccessView> { return this.getAccessSnapshot(input); }
  async getUsers(input: AdminActor, query: UserQuery) { const actor = this.access(input, "users"), q = parse(UserQuerySchema, query); this.checkDepartment(actor, q.departmentId); return structuredClone(selectUsers(this.state, actor, q)); }
  async getGroups(input: AdminActor, query: GroupQuery) {
    this.access(input, "groups"); const q = parse(GroupQuerySchema, query);
    return structuredClone(paginate(this.state.groups.filter((g) => !g.deletedAt && matches(g.name, q.search)).sort((a, b) => a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id)).map((g) => ({ ...g,
      ownerName: this.state.users.find((u) => u.id === g.ownerId)?.name ?? "삭제된 사용자", members: this.state.users.filter((u) => !u.deletedAt && g.memberIds.includes(u.id)).map((u) => ({ id: u.id, name: u.name, departmentName: this.state.departments.find((d) => d.id === u.departmentId)?.name ?? "미지정" })) })), q));
  }
  async getDirectory(input: AdminActor) {
    this.access(input, "users"); if (input.role !== "super_admin") throw new AdminDataError("FORBIDDEN", "전사 관리자 권한이 필요합니다.");
    // 직접 추가한 사용자도 그룹 후보가 되며, 삭제한 사용자는 다시 선택하지 않는다.
    const registered = this.state.users.filter((u) => !u.deletedAt).map(({ id, name, email, departmentId, title }) => ({ id, name, email, departmentId, title, registeredUserId: id }));
    const candidates = ADMIN_DIRECTORY.filter((d) => !this.state.users.some((u) => u.email.toLowerCase() === d.email.toLowerCase())).map((d) => ({ ...d, registeredUserId: null }));
    return structuredClone([...registered, ...candidates]);
  }
  async getRoleGrants(input: AdminActor) { this.access(input, "permissions"); return structuredClone(this.state.roleGrants); }
  async getModels(input: AdminActor) { this.access(input, "modelSettings"); const { version, updatedAt, modelByJob } = this.state.settings; return structuredClone({ version, updatedAt, modelByJob, models: this.state.models }); }
  async getPricing(input: AdminActor) { this.access(input, "pricing"); const { version, updatedAt, krwMicrosPerUsd } = this.state.settings; return structuredClone({ version, updatedAt, krwMicrosPerUsd, models: this.state.models, prices: this.state.prices }); }
  async getTokenRequests(input: AdminActor) { const actor = this.access(input, "tokenRequests"); return structuredClone(this.state.requests.filter((r) => inScope(actor, r.departmentId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))); }
  async getTokens(input: AdminActor, query: TokenQuery) { const actor = this.access(input, "tokenPolicies"), q = parse(TokenQuerySchema, query); this.checkDepartment(actor, q.departmentId); return structuredClone(selectTokens(this.state, actor, q)); }
  async getSelf(input: AdminActor) { return structuredClone(buildSelfUsage(this.state, this.actor(input))); }
  async getAudit(input: AdminActor, query: AuditQuery) { return structuredClone(selectAudit(this.state, this.access(input, "audit"), parse(AuditQuerySchema, query))); }
  async getDashboard(input: AdminActor, query: DashboardQuery) { return structuredClone(buildDashboard(this.state, this.access(input, "dashboard"), parse(DashboardQuerySchema, query))); }
  private addAudit(state: AdminStoreState, actor: AdminActor, action: AuditAction, resource: AuditResource, targetId: string, targetLabel: string, departmentId: string | null, detail: string) {
    state.audits.push({ id: this.createId(), occurredAt: state.logicalNow, actorId: actor.userId, actorName: actor.name, actorEmail: actor.email, departmentId,
      action, resource, detail, targetId, targetLabel, outcome: "success", failureReason: null, requestId: this.createId(), usageId: null, tokens: 0, ip: "192.0.2.1", userAgent: "예시 브라우저" });
  }
  private draft(): AdminStoreState { const draft = structuredClone(this.state); draft.logicalNow = new Date(Date.parse(draft.logicalNow) + 1).toISOString(); return draft; }
  private commit(draft: AdminStoreState): void {
    draft.revision++; this.state = parse(AdminStoreStateSchema, draft);
    for (const listener of this.listeners) {
      try { listener(); } catch { /* 구독자의 표시 오류가 확정된 저장 결과를 되돌리지 않도록 격리한다. */ }
    }
  }
  async exportUsers(input: AdminActor, query: UserQuery): Promise<string> {
    const actor = this.access(input, "users"), q = parse(UserQuerySchema, query); this.checkDepartment(actor, q.departmentId);
    const csv = makeCsv(["이름", "이메일", "부서", "역할", "상태"], userRows(this.state, actor, q).map((u) => [u.name, u.email, this.state.departments.find((d) => d.id === u.departmentId)?.name ?? "미지정", u.role, u.status]));
    const draft = this.draft(); this.addAudit(draft, actor, "export", "users", "users", "사용자 목록", actor.role === "department_admin" ? actor.departmentId : q.departmentId, "사용자 CSV 내보내기"); this.commit(draft); return csv;
  }
  async exportAudit(input: AdminActor, query: AuditQuery): Promise<string> {
    const actor = this.access(input, "audit"), q = parse(AuditQuerySchema, query);
    const csv = makeCsv(["시간", "사용자", "이메일", "액션", "세부 작업", "리소스", "대상", "대상 ID", "결과", "실패 사유", "Token", "IP", "브라우저", "요청 ID"], auditRows(this.state, actor, q).map((a) => [a.occurredAt, a.actorName, a.actorEmail, a.action, a.detail, a.resource, a.targetLabel, a.targetId, a.outcome, a.failureReason, a.tokens, a.ip, a.userAgent, a.requestId]));
    const draft = this.draft(); this.addAudit(draft, actor, "export", "audit", "audit", "활동 로그", actor.role === "department_admin" ? actor.departmentId : null, "활동 로그 CSV 내보내기 · " + JSON.stringify({ ...q, page: undefined, pageSize: undefined })); this.commit(draft); return csv;
  }
  async execute(input: AdminActor, raw: AdminCommand): Promise<CommandReceipt> {
    const actor = this.actor(input), command = parse(AdminCommandSchema, raw);
    const submissionKey = command.type === "submit-token-request" ? actor.userId + ":" + command.submissionId : null;
    if (submissionKey) {
      const prior = this.submissions.get(submissionKey);
      if (prior) {
        if (prior.payload !== JSON.stringify(command)) throw new AdminDataError("CONFLICT", "이미 다른 내용으로 제출된 신청입니다.");
        return structuredClone(prior.receipt);
      }
    }
    const draft = this.draft(), changedIds: string[] = [];
    let undoToken: string | null = null, undoEntry: UndoEntry | null = null, consumeUndo: string | null = null;
    let createdRequest: CommandReceipt["createdRequest"] = null;
    const allow = (resource: AdminResource, action: CrudAction) => assertPermission(actor, draft.roleGrants, resource, action);
    const record = (id: string) => ({ id, version: 1, createdAt: draft.logicalNow, updatedAt: draft.logicalNow });
    const touch = (row: { id?: string; version: number; updatedAt: string }) => { row.version++; row.updatedAt = draft.logicalNow; if (row.id) changedIds.push(row.id); };
    const log = (action: AuditAction, resource: AuditResource, id: string, label: string, departmentId: string | null) => this.addAudit(draft, actor, action, resource, id, label, departmentId, command.type);
    const activeUser = (id: string) => {
      const user = draft.users.find((u) => u.id === id && !u.deletedAt && u.status === "active");
      if (!user) throw new AdminDataError("INACTIVE_USER", "사용할 수 없는 사용자입니다."); return user;
    };
    const addUser = (value: NewAdminUser) => {
      validDepartment(draft, value.departmentId);
      if (value.role === "department_admin" && value.departmentId === null) throw new AdminDataError("VALIDATION", "관리자는 소속 부서를 지정해야 합니다.");
      if (draft.users.some((u) => u.email.toLowerCase() === value.email.toLowerCase())) throw new AdminDataError("CONFLICT", "이미 등록된 이메일입니다.");
      const { invite, ...fields } = value;
      const user: AdminUser = { ...record(this.createId()), ...fields, status: invite ? "invited" : "active", lastSeenAt: null, deletedAt: null };
      draft.users.push(user); changedIds.push(user.id);
      draft.accounts.push({ ...record(this.createId()), userId: user.id, month: toKoreanDay(draft.logicalNow).slice(0, 7), limitTokens: draft.settings.defaultPersonalLimit, paused: false });
      log("create", "users", user.id, user.name, user.departmentId);
    };
    switch (command.type) {
      case "create-user": allow("users", "create"); addUser(command.value); break;
      case "add-directory-users": {
        allow("users", "create");
        if (new Set(command.ids).size !== command.ids.length || command.ids.some((id) => !ADMIN_DIRECTORY.some((d) => d.id === id))) throw new AdminDataError("VALIDATION", "선택한 디렉터리 인원이 올바르지 않습니다.");
        const entries = ADMIN_DIRECTORY.filter((d) => command.ids.includes(d.id) && !draft.users.some((u) => u.email === d.email));
        if (!entries.length) throw new AdminDataError("VALIDATION", "추가할 미등록 인원을 선택해 주세요.");
        for (const entry of entries) addUser({ name: entry.name, email: entry.email, departmentId: entry.departmentId, title: entry.title, role: command.role, invite: command.invite });
        break;
      }
      case "update-user": case "change-user-role": case "set-user-status": case "delete-users": case "resend-invite": {
        allow("users", command.type === "delete-users" ? "delete" : "update");
        const refs = "targets" in command ? command.targets : [command.target]; uniqueTargets(refs);
        const rows = refs.map((ref) => requireVersion(draft.users.filter((u) => !u.deletedAt), ref));
        for (const user of rows) {
          if (user.id === actor.userId && (command.type === "delete-users" || command.type === "set-user-status" || command.type === "change-user-role" || (command.type === "update-user" && command.value.role !== user.role))) throw new AdminDataError("FORBIDDEN", "자신의 역할·상태·삭제는 변경할 수 없습니다.");
          if (command.type === "update-user") { validDepartment(draft, command.value.departmentId); Object.assign(user, command.value); }
          if (command.type === "change-user-role") user.role = command.role;
          if (user.role === "department_admin" && user.departmentId === null) throw new AdminDataError("VALIDATION", "관리자는 소속 부서를 지정해야 합니다.");
          if (command.type === "set-user-status") user.status = command.status;
          if (command.type === "delete-users") user.deletedAt = draft.logicalNow;
          if (command.type === "resend-invite" && user.status !== "invited") throw new AdminDataError("VALIDATION", "초대 대기 사용자에게만 재전송할 수 있습니다.");
          touch(user); log(command.type === "delete-users" ? "delete" : "update", "users", user.id, user.name, user.departmentId);
        }
        if (!draft.users.some((u) => !u.deletedAt && u.status === "active" && u.role === "super_admin")) throw new AdminDataError("FORBIDDEN", "최소 한 명의 활성 슈퍼 관리자가 필요합니다.");
        if (command.type === "delete-users") { undoToken = this.createId(); undoEntry = { resource: "users", targets: rows.map(({ id, version }) => ({ id, version })), deletedAt: draft.logicalNow }; }
        break;
      }
      case "create-group": case "update-group": case "delete-group": {
        allow("groups", command.type === "create-group" ? "create" : command.type === "delete-group" ? "delete" : "update");
        if (command.type !== "delete-group") {
          allow("users", "read"); const value = command.value;
          if (draft.groups.some((g) => !g.deletedAt && g.name.toLowerCase() === value.name.toLowerCase() && (command.type === "create-group" || g.id !== command.target.id))) throw new AdminDataError("CONFLICT", "이미 사용 중인 그룹 이름입니다.");
          if (value.memberIds.some((id) => !draft.users.some((u) => u.id === id && !u.deletedAt))) throw new AdminDataError("VALIDATION", "그룹에 등록할 수 없는 사용자입니다.");
        }
        const group = command.type === "create-group" ? { ...record(this.createId()), ...command.value, ownerId: actor.userId, deletedAt: null } : requireVersion(draft.groups.filter((g) => !g.deletedAt), command.target);
        if (command.type === "create-group") { draft.groups.push(group); changedIds.push(group.id); }
        else { if (command.type === "update-group") Object.assign(group, command.value); else group.deletedAt = draft.logicalNow; touch(group); }
        const departments = new Set(group.memberIds.map((id) => draft.users.find((u) => u.id === id)?.departmentId ?? null));
        log(command.type === "create-group" ? "create" : command.type === "delete-group" ? "delete" : "update", "groups", group.id, group.name, departments.size === 1 ? [...departments][0] : null);
        if (command.type === "delete-group") { undoToken = this.createId(); undoEntry = { resource: "groups", targets: [{ id: group.id, version: group.version }], deletedAt: draft.logicalNow }; }
        break;
      }
      case "undo-delete": {
        const entry = this.undos.get(command.undoToken);
        if (!entry) throw new AdminDataError("CONFLICT", "이미 사용되었거나 만료된 복구 요청입니다.");
        allow(entry.resource, "delete");
        const rows = entry.resource === "users" ? draft.users : draft.groups;
        for (const ref of entry.targets) {
          const row = requireVersion<AdminStoreState["users"][number] | AdminStoreState["groups"][number]>(rows, ref);
          if (row.deletedAt !== entry.deletedAt) throw new AdminDataError("CONFLICT", "삭제 이후 변경된 항목은 복구할 수 없습니다.");
          row.deletedAt = null; touch(row); log("restore", entry.resource, row.id, row.name, "departmentId" in row ? row.departmentId : null);
        }
        consumeUndo = command.undoToken; break;
      }
      case "save-grants": {
        allow("permissions", "update"); if (draft.permissionRevision !== command.permissionRevision) throw new AdminDataError("CONFLICT", "권한 설정이 변경되었습니다.");
        validateGrants(command.rows); draft.roleGrants = command.rows; draft.permissionRevision++; log("update", "permissions", "roles", "역할별 권한", null); break;
      }
      case "save-model-defaults": case "save-fx": case "save-token-policy": {
        const resource = command.type === "save-model-defaults" ? "modelSettings" : command.type === "save-fx" ? "pricing" : "tokenPolicies";
        allow(resource, "update"); if (draft.settings.version !== command.version) throw new AdminDataError("CONFLICT", "설정이 변경되었습니다. 다시 확인해 주세요.");
        if (command.type === "save-model-defaults") { if (Object.values(command.value).some((id) => !draft.models.some((m) => m.id === id))) throw new AdminDataError("VALIDATION", "허용되지 않은 모델입니다."); draft.settings.modelByJob = command.value; }
        if (command.type === "save-fx") draft.settings.krwMicrosPerUsd = command.krwMicrosPerUsd;
        if (command.type === "save-token-policy") { draft.settings.monthlyTokenLimit = command.monthlyTokenLimit; draft.settings.defaultPersonalLimit = command.defaultPersonalLimit; draft.settings.warningPercents = command.warningPercents; }
        touch(draft.settings); log("update", resource, "settings", "전사 설정", null); break;
      }
      case "save-price": {
        allow("pricing", "update"); const price = requireVersion(draft.prices, command.target);
        price.inputUsdMicrosPerMillion = command.inputUsdMicrosPerMillion; price.outputUsdMicrosPerMillion = command.outputUsdMicrosPerMillion; touch(price);
        log("update", "pricing", price.id, draft.models.find((m) => m.id === price.modelId)?.name ?? "모델 단가", null); break;
      }
      case "set-token-limit": case "set-token-paused": {
        allow("tokenPolicies", "update"); const account = requireVersion(draft.accounts, command.target), user = activeUser(account.userId);
        if (command.type === "set-token-limit") account.limitTokens = command.limitTokens; else account.paused = command.paused;
        touch(account); log("update", "tokenPolicies", account.id, user.name, user.departmentId); break;
      }
      case "submit-token-request": {
        if (command.projectId !== null && !["mois", "edu", "sample"].includes(command.projectId)) throw new AdminDataError("VALIDATION", "신청 프로젝트를 확인해 주세요.");
        const month = toKoreanDay(draft.logicalNow).slice(0, 7), account = draft.accounts.find((a) => a.userId === actor.userId && a.month === month);
        if (!account || account.limitTokens + command.amountTokens > 1_000_000_000) throw new AdminDataError("VALIDATION", "신청 후 한도는 10억 토큰 이하여야 합니다.");
        createdRequest = { ...record(this.createId()), requesterId: actor.userId, requesterName: actor.name, departmentId: actor.departmentId, month, projectId: command.projectId, amountTokens: command.amountTokens, reason: command.reason, status: "pending", processedBy: null, processedAt: null };
        draft.requests.push(createdRequest); changedIds.push(createdRequest.id); log("create", "tokenRequests", createdRequest.id, actor.name, actor.departmentId); break;
      }
      case "process-token-request": {
        allow("tokenRequests", "update"); const request = requireVersion(draft.requests.filter((r) => inScope(actor, r.departmentId)), command.target);
        if (request.status !== "pending") throw new AdminDataError("CONFLICT", "이미 처리된 신청입니다.");
        activeUser(request.requesterId);
        if (command.status === "approved") {
          const account = draft.accounts.find((a) => a.userId === request.requesterId && a.month === request.month);
          if (!account || account.limitTokens + request.amountTokens > 1_000_000_000) throw new AdminDataError("VALIDATION", "승인 후 한도가 허용 범위를 초과합니다.");
          account.limitTokens += request.amountTokens; touch(account);
        }
        request.status = command.status; request.processedAt = draft.logicalNow; request.processedBy = actor.userId; touch(request);
        log(command.status === "approved" ? "approve" : "reject", "tokenRequests", request.id, request.requesterName, request.departmentId); break;
      }
    }
    this.commit(draft);
    const receipt: CommandReceipt = { revision: this.state.revision, changedIds, createdRequest, undoToken };
    if (undoToken && undoEntry) this.undos.set(undoToken, undoEntry);
    if (consumeUndo) this.undos.delete(consumeUndo);
    if (submissionKey) this.submissions.set(submissionKey, { payload: JSON.stringify(command), receipt: structuredClone(receipt) });
    return structuredClone(receipt);
  }
}
