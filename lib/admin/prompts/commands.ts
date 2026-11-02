import { AdminDataError } from "@/lib/admin/errors";
import { assertPermission, canPerform } from "@/lib/admin/permissions";
import { validDepartment, requireVersion } from "@/lib/admin/command-validation";
import { validateAssetVisibility } from "@/lib/admin/assets/permissions";
import { canReadPrompt, ownsPrompt, promptRevision } from "./selectors";
import type { AdminActor, AdminStoreState } from "@/types/admin";
import type { PromptCommand, PromptRecord, PromptValue } from "@/types/admin-prompts";
export const PROMPT_COMMAND_LABELS: Record<PromptCommand["type"], string> = {
  "create-prompt-set": "프롬프트 세트 등록", "update-prompt-set": "프롬프트 세트 수정", "duplicate-prompt-set": "프롬프트 세트 복제",
  "set-prompt-status": "프롬프트 세트 상태 변경", "set-prompt-visibility": "프롬프트 세트 공개 범위 변경", "delete-prompt-set": "프롬프트 세트 삭제",
};
export function applyPromptCommand(state: AdminStoreState, actor: AdminActor, command: PromptCommand, createId: () => string) {
  const now = state.logicalNow;
  const append = (record: PromptRecord, value: PromptValue) => state.promptSets.revisions.push({ ...structuredClone(value), id: createId(), promptSetId: record.id, revision: record.currentRevision, createdAt: now, createdBy: actor.userId });
  if (command.type === "create-prompt-set") {
    assertPermission(actor, state.roleGrants, "promptSets", "create");
    validDepartment(state, command.ownerDepartmentId);
    if (actor.role !== "super_admin" && (!actor.departmentId || actor.departmentId !== command.ownerDepartmentId)) throw new AdminDataError("FORBIDDEN", "소속 부서에만 등록할 수 있습니다.");
    validateAssetVisibility(state, actor, command.visibility);
    const record: PromptRecord = { id: createId(), version: 1, currentRevision: 1, createdBy: actor.userId, ownerDepartmentId: command.ownerDepartmentId, createdAt: now, updatedAt: now, deletedAt: null, status: command.status, visibility: command.visibility };
    state.promptSets.records.push(record); append(record, command.value);
    return { record, action: "create" as const, changed: true };
  }
  const record = state.promptSets.records.find(row => row.id === command.target.id && !row.deletedAt);
  if (!record) throw new AdminDataError("NOT_FOUND", "프롬프트 세트를 찾을 수 없습니다.");
  if (!canReadPrompt(state, actor, record)) throw new AdminDataError("FORBIDDEN", "이 프롬프트 세트에 접근할 수 없습니다.");
  requireVersion([record], command.target);
  const previous = promptRevision(state, record);
  if (command.type === "duplicate-prompt-set") {
    assertPermission(actor, state.roleGrants, "promptSets", "create");
    const copy: PromptRecord = { ...record, id: createId(), version: 1, currentRevision: 1, createdBy: actor.userId, ownerDepartmentId: actor.departmentId, status: "draft", visibility: { all: false, targets: [] }, createdAt: now, updatedAt: now };
    state.promptSets.records.push(copy); append(copy, { name: previous.name.slice(0, 76) + " 사본", description: previous.description, items: previous.items.map(item => ({ ...item, id: createId() })) });
    return { record: copy, action: "create" as const, changed: true };
  }
  if (!ownsPrompt(actor, record) || !canPerform(actor, state.roleGrants, "promptSets", command.type === "delete-prompt-set" ? "delete" : "update")) throw new AdminDataError("FORBIDDEN", "소유 부서의 관리 권한이 필요합니다.");
  let changed = false;
  if (command.type === "delete-prompt-set") { record.deletedAt = now; changed = true; }
  if (command.type === "set-prompt-status") { changed = record.status !== command.status; record.status = command.status; }
  if (command.type === "set-prompt-visibility" || command.type === "update-prompt-set") {
    validateAssetVisibility(state, actor, command.visibility, record.visibility);
    changed = JSON.stringify(record.visibility) !== JSON.stringify(command.visibility); record.visibility = command.visibility;
  }
  if (command.type === "update-prompt-set") {
    const value: PromptValue = { name: previous.name, description: previous.description, items: previous.items };
    if (JSON.stringify(value) !== JSON.stringify(command.value)) { record.currentRevision++; append(record, command.value); changed = true; }
    changed ||= record.status !== command.status; record.status = command.status;
  }
  if (changed) { record.version++; record.updatedAt = now; }
  return { record, action: command.type === "delete-prompt-set" ? "delete" as const : "update" as const, changed };
}
