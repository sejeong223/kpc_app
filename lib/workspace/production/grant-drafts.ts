import { PROJECT_PERMISSIONS } from "@/config/workspace-production";
import type { ProjectGrant, ProjectView } from "@/types/workspace-production";
import type { ProjectPermissionDraft } from "@/types/workspace-header";
import { ProjectGrantSchema } from "./schemas";
import { workspaceAssert as check } from "./errors";
export function createGrantDraft(view: ProjectView): ProjectPermissionDraft {
    return { projectId: view.project.id, baseRevision: view.state.revision, baseRound: view.state.currentRound,
        rows: view.members.filter(m => m.id !== view.project.pmId && m.role !== "super_admin" && !(m.id === view.actor.id && view.actor.role === "super_admin")).map(m => ({ userId: m.id, permissions: [...(view.state.grants.find(g => g.userId === m.id)?.permissions ?? [])] })) };
}
export function changedGrantRows(baseline: readonly ProjectGrant[], next: readonly ProjectGrant[]): ProjectGrant[] {
    const normalize = (rows: readonly ProjectGrant[]) => rows.map(row => {
        const parsed = ProjectGrantSchema.safeParse(row);
        check(parsed.success, "VALIDATION", "권한 값을 확인해 주세요.");
        return { userId: row.userId, permissions: PROJECT_PERMISSIONS.filter(p => row.permissions.includes(p)) };
    });
    const before = normalize(baseline), after = normalize(next);
    check(new Set(before.map(r => r.userId)).size === before.length && new Set(after.map(r => r.userId)).size === after.length, "VALIDATION", "중복 참여자가 있습니다.");
    check(after.length === before.length && after.every(r => before.some(b => b.userId === r.userId)), "VALIDATION", "참여자가 변경되었습니다. 다시 불러와 주세요.");
    return after.filter(row => JSON.stringify(row.permissions) !== JSON.stringify(before.find(b => b.userId === row.userId)!.permissions));
}
