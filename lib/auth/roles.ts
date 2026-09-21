export const APP_ROLES = {
  USER: "User",
  ADMIN: "Admin",
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

const validRoles = new Set<AppRole>(Object.values(APP_ROLES));

export function normalizeRoles(value: unknown): AppRole[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter(
        (role): role is AppRole =>
          typeof role === "string" && validRoles.has(role as AppRole),
      ),
    ),
  ];
}

export function hasRole(
  roles: readonly string[] | null | undefined,
  requiredRole: AppRole,
): boolean {
  return normalizeRoles(roles).includes(requiredRole);
}
