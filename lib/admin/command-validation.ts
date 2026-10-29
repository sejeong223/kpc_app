import { ADMIN_RESOURCES, ADMIN_ROLES, CRUD_ACTIONS, CRUD_CEILING } from "@/config/admin-permissions";
import { AdminDataError } from "@/lib/admin/errors";
import type { AdminRecord, AdminStoreState, RoleGrants, VersionedRef } from "@/types/admin";

export function requireVersion<T extends Pick<AdminRecord, "id" | "version">>(rows: readonly T[], ref: VersionedRef): T {
  const row = rows.find((r) => r.id === ref.id);
  if (!row) throw new AdminDataError("NOT_FOUND", "항목을 찾을 수 없습니다.");
  if (row.version !== ref.version) throw new AdminDataError("CONFLICT", "다른 작업으로 변경되었습니다. 최신 내용을 확인해 주세요.");
  return row;
}
export function uniqueTargets(targets: readonly VersionedRef[]): void {
  if (!targets.length || targets.length > 500 || new Set(targets.map((t) => t.id)).size !== targets.length) throw new AdminDataError("VALIDATION", "대상을 중복 없이 선택해 주세요.");
}
export function validDepartment(state: AdminStoreState, departmentId: string | null): void {
  if (departmentId !== null && !state.departments.some((d) => d.id === departmentId)) throw new AdminDataError("VALIDATION", "존재하지 않는 부서입니다.");
}
export function validateGrants(rows: readonly RoleGrants[]): void {
  if (rows.length !== 3 || new Set(rows.map((r) => r.role)).size !== 3 || !ADMIN_ROLES.every((role) => rows.some((r) => r.role === role))) throw new AdminDataError("VALIDATION", "세 역할의 권한을 모두 지정해 주세요.");
  for (const row of rows) for (const resource of ADMIN_RESOURCES) {
    const value = row.grants[resource], ceiling = CRUD_CEILING.find((r) => r.role === row.role)!.grants[resource];
    if (CRUD_ACTIONS.some((action) => value[action] && (!ceiling[action] || !value.read))) throw new AdminDataError("VALIDATION", "역할의 허용 범위를 초과한 권한입니다.");
  }
  const locked = rows.find((r) => r.role === "super_admin")!.grants.permissions;
  if (!locked.read || !locked.update) throw new AdminDataError("VALIDATION", "슈퍼 관리자의 권한 관리 기능은 해제할 수 없습니다.");
}
