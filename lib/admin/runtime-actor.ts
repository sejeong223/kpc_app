import type { Session } from "next-auth";
import type { ProfileDisplay } from "@/config/profile-preview";
import { APP_ROLES, hasRole } from "@/lib/auth/roles";
import type { AdminActor, AdminRole } from "@/types/admin";

export function resolveAdminActor(input: { authEnabled: boolean; session: Session | null; previewRole: AdminRole; profile: ProfileDisplay }): AdminActor {
  return { userId: "u-self", name: input.profile.name, email: input.profile.email ?? "self@example.invalid",
    role: input.authEnabled ? hasRole(input.session?.user.roles, APP_ROLES.ADMIN) ? "super_admin" : "user" : input.previewRole,
    departmentId: input.authEnabled ? null : "d-ai" };
}
export function adminIdentityKey(authEnabled: boolean, session: Session | null): string {
  return authEnabled ? JSON.stringify([true, session?.user.oid ?? session?.user.email ?? null, [...(session?.user.roles ?? [])].sort()]) : "preview";
}
