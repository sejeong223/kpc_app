import { createAdminSeed } from "@/config/admin-seed";
import { WorkspaceFileError } from "@/lib/workspace/files/errors";
import { canAccessFileProject } from "@/lib/workspace/files/permissions";
import {
  FileIdentitySchema,
  WorkspaceProjectSchema,
} from "@/lib/workspace/files/schemas";
import type { FileIdentity, WorkspaceProject } from "@/types/workspace-files";
import type { WorkspaceProjectDirectory } from "@/types/workspace-production";

export function createWorkspaceProjectCatalog(
  identity: FileIdentity,
): WorkspaceProjectDirectory {
  const checked = FileIdentitySchema.safeParse(identity);
  if (!checked.success)
    throw new WorkspaceFileError(
      "UNIDENTIFIED",
      "사용자 정보를 확인해 주세요.",
    );
  const scope = checked.data;
  const seed = createAdminSeed();
  const userId = (id: string) =>
    id === "u-self" ? scope.actor.id : "mock:" + id;
  const projects: WorkspaceProject[] = seed.rfps
    .map((project) => {
      const pm = seed.users.find((user) => user.id === project.pmId);
      if (!pm || pm.status !== "active" || pm.deletedAt) {
        throw new WorkspaceFileError(
          "STORAGE",
          "프로젝트 담당자 정보를 확인할 수 없습니다.",
        );
      }
      const members = seed.users
        .filter(
          (user) =>
            user.departmentId === project.departmentId &&
            user.status === "active" &&
            !user.deletedAt,
        )
        .map((user) => userId(user.id));
      // 로컬 시연용 참여 정보이며 실제 계정의 프로젝트 접근 권한을 뜻하지 않는다.
      if (["mois", "edu", "sample"].includes(project.id))
        members.push(scope.actor.id);
      members.push(userId(pm.id));
      const parsed = WorkspaceProjectSchema.safeParse({
        id: project.id,
        number: project.number,
        name: project.name,
        departmentId: project.departmentId,
        pmId: userId(pm.id),
        pmName: pm.id === "u-self" ? scope.actor.name : pm.name,
        memberIds: [...new Set(members)],
      });
      if (!parsed.success)
        throw new WorkspaceFileError(
          "STORAGE",
          "프로젝트 정보를 확인할 수 없습니다.",
        );
      return parsed.data;
    })
    .filter((project) => canAccessFileProject(scope, project));

  return {
    members: (projectId) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return [];
      return seed.users
        .filter(
          (u) =>
            u.status === "active" &&
            !u.deletedAt &&
            project.memberIds.includes(userId(u.id)),
        )
        .map((u) => ({
          role: u.role,
          id: userId(u.id),
          adminUserId: u.id,
          name: u.id === "u-self" ? scope.actor.name : u.name,
          departmentId: u.departmentId,
          departmentName:
            seed.departments.find((d) => d.id === u.departmentId)?.name ?? "",
          email: u.email,
        }));
    },
    list: () => structuredClone(projects),
    get: (projectId) => {
      const project = projects.find((item) => item.id === projectId);
      return project ? structuredClone(project) : null;
    },
  };
}
