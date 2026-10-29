import { CRUD_CEILING } from "@/config/admin-permissions";
import { AdminDataError } from "@/lib/admin/errors";
import type { AdminActor, AdminResource, CrudAction, RoleGrants } from "@/types/admin";

export function canPerform(actor: AdminActor, rows: readonly RoleGrants[], resource: AdminResource, action: CrudAction): boolean {
  if (actor.role === "department_admin" && actor.departmentId === null) return false;
  const ceiling = CRUD_CEILING.find((row) => row.role === actor.role)?.grants[resource];
  const grants = rows.find((row) => row.role === actor.role)?.grants[resource];
  return Boolean(ceiling?.read && ceiling[action] && grants?.read && grants[action]);
}
export function assertPermission(actor: AdminActor, rows: readonly RoleGrants[], resource: AdminResource, action: CrudAction): void {
  if (!canPerform(actor, rows, resource, action)) throw new AdminDataError("FORBIDDEN", "이 작업에 대한 권한이 없습니다.");
}
export function assertDepartmentScope(actor: AdminActor, departmentId: string | null): void {
  if (actor.role === "super_admin") return;
  if (actor.role === "department_admin" && actor.departmentId !== null && actor.departmentId === departmentId) return;
  throw new AdminDataError("FORBIDDEN", "접근할 수 없는 부서입니다.");
}
