import type { Session } from "next-auth";
import { APP_ROLES, hasRole } from "@/lib/auth/roles";
import type { FileIdentity, FileRole } from "@/types/workspace-files";
import { FileIdentitySchema } from "./schemas";

export interface FileIdentityInput {
  authEnabled: boolean;
  session: Session | null;
  previewRole: FileRole;
  displayName: string;
}

export function resolveFileIdentity(input: FileIdentityInput): FileIdentity | null {
  const name = input.displayName.trim() || "사용자";
  let identity: FileIdentity;
  if (!input.authEnabled) {
    identity = { namespace: "files:preview:sodam", actor: { id: "preview:sodam", name, role: input.previewRole, isMock: true } };
  } else {
    const session = input.session;
    if (!session || session.error) return null;
    const administrator = hasRole(session.user.roles, APP_ROLES.ADMIN);
    if (!administrator && !hasRole(session.user.roles, APP_ROLES.USER)) return null;
    const oid = session.user.oid?.trim();
    const upn = session.user.upn?.trim().toLowerCase();
    const email = session.user.email?.trim().toLowerCase();
    const id = oid ? "entra:oid:" + oid : upn ? "entra:upn:" + upn : email ? "entra:email:" + email : null;
    if (!id) return null;
    identity = { namespace: "files:" + id, actor: { id, name, role: administrator ? "super_admin" : "user", isMock: false } };
  }
  const parsed = FileIdentitySchema.safeParse(identity);
  return parsed.success ? parsed.data : null;
}

export function fileIdentityKey(identity: FileIdentity): string {
  return JSON.stringify([identity.namespace, identity.actor.id, identity.actor.name, identity.actor.role, identity.actor.isMock]);
}
