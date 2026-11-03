import type { AdminActor, AdminStoreState } from "@/types/admin";
import type { AssetRecord } from "@/types/admin-assets";
import type { PromptRecord } from "@/types/admin-prompts";

// 제작용 사용 권한은 관리자 메뉴의 CRUD 권한과 별도로 판단한다.
function visible(
  state: AdminStoreState,
  actor: AdminActor,
  record: Pick<AssetRecord, "ownerDepartmentId" | "visibility">,
): boolean {
  return (
    actor.role === "super_admin" ||
    (actor.role === "department_admin" &&
      actor.departmentId !== null &&
      actor.departmentId === record.ownerDepartmentId) ||
    record.visibility.all ||
    record.visibility.targets.some((target) =>
      target.type === "department"
        ? target.id === actor.departmentId
        : target.type === "user"
          ? target.id === actor.userId
          : state.groups.some(
              (group) =>
                group.id === target.id &&
                !group.deletedAt &&
                group.memberIds.includes(actor.userId),
            ),
    )
  );
}
export function canConsumeAsset(
  state: AdminStoreState,
  actor: AdminActor,
  record: AssetRecord,
  mode: "new" | "existing",
): boolean {
  return (
    visible(state, actor, record) &&
    (mode === "existing" || (record.status === "active" && !record.deletedAt))
  );
}
export function canConsumePrompt(
  state: AdminStoreState,
  actor: AdminActor,
  record: PromptRecord,
  mode: "new" | "existing",
): boolean {
  return (
    visible(state, actor, record) &&
    (mode === "existing" || (record.status === "active" && !record.deletedAt))
  );
}
