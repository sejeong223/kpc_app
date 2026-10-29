import type { AdminResource, AdminRole, CrudAction, RoleGrants } from "@/types/admin";

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "슈퍼 관리자", department_admin: "관리자", user: "일반 사용자",
};
export const ADMIN_RESOURCE_LABELS: Record<AdminResource, string> = {
  users: "사용자", groups: "그룹", modelSettings: "모델 설정", pricing: "단가·환율",
  tokenPolicies: "토큰 정책", tokenRequests: "토큰 신청", dashboard: "대시보드", audit: "활동 로그", permissions: "역할별 권한",
};
export const CRUD_ACTIONS: readonly CrudAction[] = ["create", "read", "update", "delete"];
export const ADMIN_RESOURCES = Object.keys(ADMIN_RESOURCE_LABELS) as AdminResource[];
export const ADMIN_ROLES: readonly AdminRole[] = ["super_admin", "department_admin", "user"];
function ceiling(role: AdminRole): RoleGrants {
  const grants = Object.fromEntries(ADMIN_RESOURCES.map((resource) => {
    const read = role === "super_admin" || (role === "department_admin" && ["users", "tokenPolicies", "tokenRequests", "dashboard", "audit"].includes(resource));
    return [resource, {
      create: role === "super_admin" && ["users", "groups"].includes(resource), read,
      update: role === "super_admin" ? !["dashboard", "audit"].includes(resource) : role === "department_admin" && resource === "tokenRequests",
      delete: role === "super_admin" && ["users", "groups"].includes(resource),
    }];
  })) as RoleGrants["grants"];
  return { role, grants };
}
export const CRUD_CEILING: readonly RoleGrants[] = ADMIN_ROLES.map(ceiling);
export const DEFAULT_ROLE_GRANTS: readonly RoleGrants[] = structuredClone(CRUD_CEILING);
