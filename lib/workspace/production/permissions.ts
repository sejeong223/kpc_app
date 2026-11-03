import type {
  ProjectPermission,
  ProjectWorkspaceState,
  WorkspaceContext,
} from "@/types/workspace-production";
import { canAccessFileProject } from "@/lib/workspace/files/permissions";
export function canManageProject(context: WorkspaceContext): boolean {
  return (
    canAccessFileProject(context.identity, context.project) &&
    (context.identity.actor.role === "super_admin" ||
      context.project.pmId === context.identity.actor.id)
  );
}
export function canProjectAction(
  context: WorkspaceContext,
  state: ProjectWorkspaceState,
  permission: ProjectPermission,
): boolean {
  return (
    canAccessFileProject(context.identity, context.project) &&
    (state.phase === "writing" || permission === "rework") &&
    (canManageProject(context) ||
      state.grants.some(
        (g) =>
          g.userId === context.identity.actor.id &&
          g.permissions.includes(permission),
      ))
  );
}
export function isSectionAuthor(
  context: WorkspaceContext,
  state: ProjectWorkspaceState,
  sectionId: string,
): boolean {
  const section = state.body.sections.find((s) => s.id === sectionId);
  return (
    !!section &&
    canAccessFileProject(context.identity, context.project) &&
    (canManageProject(context) ||
      section.assigneeIds.includes(context.identity.actor.id))
  );
}
export function canEditSection(
  context: WorkspaceContext,
  state: ProjectWorkspaceState,
  sectionId: string,
): boolean {
  return (
    state.phase === "writing" &&
    isSectionAuthor(context, state, sectionId) &&
    state.body.sections.some((s) => s.id === sectionId && !s.locked)
  );
}
