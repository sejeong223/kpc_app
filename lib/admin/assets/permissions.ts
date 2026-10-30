import { AdminDataError } from "@/lib/admin/errors";
import { canPerform } from "@/lib/admin/permissions";
import type { AdminActor, AdminStoreState } from "@/types/admin";
import type { AssetKind, AssetRecord, AssetVisibility, AssetAudienceOptions } from "@/types/admin-assets";

export function assetResource(kind: AssetKind): "skills" | "templates" {
  return kind === "skill" ? "skills" : "templates";
}

export function ownsAsset(actor: AdminActor, asset: AssetRecord): boolean {
  return actor.role === "super_admin" || (actor.role === "department_admin" && actor.departmentId !== null && actor.departmentId === asset.ownerDepartmentId);
}
export function canReadAsset(state: AdminStoreState, actor: AdminActor, asset: AssetRecord): boolean {
  if (!canPerform(actor, state.roleGrants, assetResource(asset.kind), "read")) return false;
  return ownsAsset(actor, asset) || asset.visibility.all || asset.visibility.targets.some(target =>
    target.type === "department" ? target.id === actor.departmentId : target.type === "user" ? target.id === actor.userId :
      state.groups.some(group => !group.deletedAt && group.id === target.id && group.memberIds.includes(actor.userId)));
}
export function assertAssetRead(state: AdminStoreState, actor: AdminActor, asset: AssetRecord): void {
  if (!canReadAsset(state, actor, asset)) throw new AdminDataError("FORBIDDEN", "이 자산을 조회하거나 적용할 수 없습니다.");
}
export function assertAssetWrite(state: AdminStoreState, actor: AdminActor, asset: AssetRecord, action: "update" | "delete"): void {
  assertAssetRead(state, actor, asset);
  if (!ownsAsset(actor, asset) || !canPerform(actor, state.roleGrants, assetResource(asset.kind), action)) throw new AdminDataError("FORBIDDEN", "소유 부서의 관리 권한이 필요합니다.");
}
export function assetAudience(state: AdminStoreState, actor: AdminActor): AssetAudienceOptions {
  const all = actor.role === "super_admin";
  const named = ({ id, name }: { id: string; name: string }) => ({ id, name });
  return {
    departments: state.departments.filter(row => all || row.id === actor.departmentId).map(named),
    users: state.users.filter(row => !row.deletedAt && row.status === "active" && (all || row.departmentId === actor.departmentId)).map(named),
    groups: state.groups.filter(row => !row.deletedAt && (all || row.ownerId === actor.userId || row.memberIds.includes(actor.userId))).map(named),
  };
}
export function validateAssetVisibility(state: AdminStoreState, actor: AdminActor, visibility: AssetVisibility, previous?: AssetVisibility): void {
  const candidates = assetAudience(state, actor);
  for (const target of visibility.targets) {
    // 기존 대상은 부서 구성 변화가 있어도 관리자가 제거할 수 있도록 표시·보존한다.
    const alreadyPresent = previous?.targets.some(row => row.type === target.type && row.id === target.id);
    const values = target.type === "department" ? candidates.departments : target.type === "user" ? candidates.users : candidates.groups;
    if (!alreadyPresent && !values.some(row => row.id === target.id)) throw new AdminDataError("VALIDATION", "공개 대상에 추가할 수 없는 항목입니다.");
  }
}
