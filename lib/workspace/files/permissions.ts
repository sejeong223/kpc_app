import type { FileAsset, FileCommandContext, FileIdentity, WorkspaceProject } from "@/types/workspace-files";
import { WorkspaceFileError } from "./errors";
import { FileIdentitySchema, WorkspaceProjectSchema } from "./schemas";

export function canAccessFileProject(identity: FileIdentity, project: WorkspaceProject): boolean {
  return identity.actor.role === "super_admin" || project.pmId === identity.actor.id || project.memberIds.includes(identity.actor.id);
}

export function canManageFileProject(identity: FileIdentity, project: WorkspaceProject): boolean {
  return identity.actor.role === "super_admin" || project.pmId === identity.actor.id;
}

export function canManageFileAsset(identity: FileIdentity, project: WorkspaceProject, asset: FileAsset): boolean {
  return canAccessFileProject(identity, project) && (asset.ownerId === identity.actor.id || canManageFileProject(identity, project));
}

export function requireFileProjectAccess(identity: FileIdentity, project: WorkspaceProject): Pick<FileCommandContext, "identity" | "project"> {
  const actor = FileIdentitySchema.safeParse(identity);
  if (!actor.success) throw new WorkspaceFileError("UNIDENTIFIED", "사용자 정보를 확인해 주세요.");
  const target = WorkspaceProjectSchema.safeParse(project);
  if (!target.success) throw new WorkspaceFileError("VALIDATION", "프로젝트 정보를 확인해 주세요.");
  if (!canAccessFileProject(actor.data, target.data)) throw new WorkspaceFileError("FORBIDDEN", "이 프로젝트에 접근할 권한이 없습니다.");
  return { identity: actor.data, project: target.data };
}
