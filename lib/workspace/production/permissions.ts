import { workspaceAssert as check } from "./errors";
import type {
  ProjectPermission,
  ProjectGrant,
  ProjectWorkspaceState,
  WorkspaceContext,
} from "@/types/workspace-production";
import { canAccessFileProject } from "@/lib/workspace/files/permissions";
import { hasLockedSlides, isSectionLocked, isSlideLocked } from "./section-locks";
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
    state.body.sections.some((s) => s.id === sectionId && !isSectionLocked(s)) &&
    !hasLockedSlides(state.body, sectionId)
  );
}

export function canEditSlide(context: WorkspaceContext, state: ProjectWorkspaceState, slideId: string): boolean {
  const slide = state.body.slides.find(item => item.id === slideId);
  return !!slide && state.phase === "writing" &&
    isSectionAuthor(context, state, slide.sectionId) && !isSlideLocked(slide);
}

export function canInsertSlide(context: WorkspaceContext, state: ProjectWorkspaceState, sectionId: string): boolean {
  return state.phase === "writing" && isSectionAuthor(context, state, sectionId) &&
    state.body.sections.some(section => section.id === sectionId && !isSectionLocked(section));
}

export function applyProjectGrants(context:WorkspaceContext,state:ProjectWorkspaceState,rows:readonly ProjectGrant[]):ProjectGrant[] {
  check(canManageProject(context),"FORBIDDEN","PM과 슈퍼 관리자만 권한을 지정할 수 있습니다.");
  for(const row of rows){
    check(context.members.some(m=>m.id===row.userId),"VALIDATION","프로젝트 참여자만 지정할 수 있습니다.");
    check(row.userId!==context.project.pmId&&!context.members.some(m=>m.id===row.userId&&m.role==="super_admin")&&!(row.userId===context.identity.actor.id&&context.identity.actor.role==="super_admin"),"VALIDATION","고정 전체 권한은 변경할 수 없습니다.");
  }
  return [...state.grants.filter(g=>!rows.some(r=>r.userId===g.userId)),...rows.filter(r=>r.permissions.length>0).map(r=>({userId:r.userId,permissions:[...r.permissions]}))];
}
