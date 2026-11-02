import { AdminDataError } from "@/lib/admin/errors";
import { canPerform } from "@/lib/admin/permissions";
import { inScope, matches, paginate } from "@/lib/admin/selectors";
import type { AdminActor, AdminStoreState } from "@/types/admin";
import type { PromptRecord, PromptDetail, PromptList, PromptQuery, PromptRow } from "@/types/admin-prompts";
export function ownsPrompt(actor: AdminActor, record: PromptRecord): boolean {
  return actor.role === "super_admin" || actor.role === "department_admin" && actor.departmentId !== null && actor.departmentId === record.ownerDepartmentId;
}
export function canReadPrompt(state: AdminStoreState, actor: AdminActor, record: PromptRecord): boolean {
  return canPerform(actor, state.roleGrants, "promptSets", "read") && (ownsPrompt(actor, record) || record.visibility.all || record.visibility.targets.some(target =>
    target.type === "department" ? target.id === actor.departmentId : target.type === "user" ? target.id === actor.userId :
      state.groups.some(group => group.id === target.id && !group.deletedAt && group.memberIds.includes(actor.userId))));
}
export function promptRevision(state: AdminStoreState, record: PromptRecord) {
  const revision = state.promptSets.revisions.find(row => row.promptSetId === record.id && row.revision === record.currentRevision);
  if (!revision) throw new AdminDataError("NOT_FOUND", "프롬프트 세트 버전을 찾을 수 없습니다.");
  return revision;
}
export function promptUsages(state: AdminStoreState, actor: AdminActor, record: PromptRecord) {
  return state.promptSets.usages.filter(row => row.promptSetId === record.id).flatMap(row => {
    const project = state.rfps.find(project => project.id === row.projectId && inScope(actor, project.departmentId));
    return project ? [{ ...row, projectName: project.name, departmentName: state.departments.find(d => d.id === project.departmentId)?.name ?? "미지정", status: project.status }] : [];
  });
}
export function promptRow(state: AdminStoreState, actor: AdminActor, record: PromptRecord): PromptRow {
  const revision = promptRevision(state, record), read = canReadPrompt(state, actor, record), own = ownsPrompt(actor, record);
  return { ...record, name: revision.name, description: revision.description,
    ownerDepartmentName: state.departments.find(row => row.id === record.ownerDepartmentId)?.name ?? "전사 공통",
    authorName: state.users.find(row => row.id === record.createdBy)?.name ?? "삭제된 사용자",
    majorCount: revision.items.filter(item => item.level === 1).length, minorCount: revision.items.filter(item => item.level === 2).length,
    usageCount: promptUsages(state, actor, record).length, capabilities: { read, update: read && own && !record.deletedAt && canPerform(actor, state.roleGrants, "promptSets", "update"),
      delete: read && own && !record.deletedAt && canPerform(actor, state.roleGrants, "promptSets", "delete"), duplicate: read && !record.deletedAt && canPerform(actor, state.roleGrants, "promptSets", "create") } };
}
export function selectPromptSets(state: AdminStoreState, actor: AdminActor, query: PromptQuery): PromptList {
  const visible = state.promptSets.records.filter(record => !record.deletedAt && canReadPrompt(state, actor, record)).map(record => promptRow(state, actor, record));
  const filtered = visible.filter(row => matches(row.name + " " + row.description, query.search))
    .filter(row => !query.departmentId || row.ownerDepartmentId === query.departmentId)
    .filter(row => query.visibility === "all" || (query.visibility === "organization" ? row.visibility.all : query.visibility === "private" ? !row.visibility.all && !row.visibility.targets.length : !row.visibility.all && row.visibility.targets.some(target => target.type === query.visibility)));
  const rows = filtered.filter(row => query.status === "all" || row.status === query.status).sort((a, b) => {
    const order = query.sort === "name" ? a.name.localeCompare(b.name, "ko") : a.updatedAt.localeCompare(b.updatedAt);
    return (query.direction === "asc" ? order : -order) || a.id.localeCompare(b.id);
  });
  return { rows: paginate(rows, query), counts: { all: filtered.length, active: filtered.filter(row => row.status === "active").length, draft: filtered.filter(row => row.status === "draft").length },
    departments: state.departments.filter(d => visible.some(row => row.ownerDepartmentId === d.id)) };
}
export function promptDetail(state: AdminStoreState, actor: AdminActor, record: PromptRecord): PromptDetail {
  return { row: promptRow(state, actor, record), revision: promptRevision(state, record), usages: promptUsages(state, actor, record),
    history: [
      ...state.audits.filter(event => event.resource === "promptSets" && event.targetId === record.id).map(({ id, occurredAt, actorName, detail }) => ({ id, occurredAt, actorName, detail })),
      ...(!state.audits.some(event => event.resource === "promptSets" && event.targetId === record.id && event.action === "create") ? [{ id: "initial-" + record.id, occurredAt: record.createdAt, actorName: state.users.find(user => user.id === record.createdBy)?.name ?? "삭제된 사용자", detail: "초기 등록" }] : []),
    ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id)) };
}
