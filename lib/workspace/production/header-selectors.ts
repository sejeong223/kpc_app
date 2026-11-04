import { z } from "zod";
import { PROJECT_HEADER_PROJECTS } from "@/config/project-header";
import type { AdminRfp } from "@/types/admin";
import type { WorkspaceHeaderMetadata, WorkspaceHeaderModel } from "@/types/workspace-header";
import type { ProjectView, WorkspaceSelection } from "@/types/workspace-production";
import { workspaceAssert as check } from "./errors";
import { selectSnapshotView, getCompletionSummary } from "./selectors";
const MetadataSchema = z.strictObject({ organization: z.string().nullable(), dueDate: z.iso.date().nullable(), budgetKrw: z.number().finite().nonnegative().nullable() });
export function getWorkspaceHeaderMetadata(projectId: string, rfps: readonly Pick<AdminRfp, "id" | "budgetKrw">[]): WorkspaceHeaderMetadata {
    // 표시 보조 정보만 같은 ID에서 가져온다. 고정 역할·회차·권한은 사용하지 않는다.
    const display = PROJECT_HEADER_PROJECTS.find(p => p.id === projectId);
    return MetadataSchema.parse({ organization: display?.organization ?? null, dueDate: display?.dueDate ?? null, budgetKrw: rfps.find(p => p.id === projectId)?.budgetKrw ?? null });
}
export function canReviewProject(view: Pick<ProjectView, "actor" | "project">): boolean {
    return view.actor.role === "super_admin" || view.actor.id === view.project.pmId;
}
export function selectWorkspaceHeader(view: ProjectView, selection: WorkspaceSelection, metadata: WorkspaceHeaderMetadata): WorkspaceHeaderModel {
    check(view.project.id === selection.projectId, "FORBIDDEN", "다른 프로젝트의 상단바 정보입니다.");
    const selected = selectSnapshotView(view, selection.snapshotId);
    const snapshot = selection.snapshotId ? view.state.snapshots.find(s => s.id === selection.snapshotId) : null;
    const { project, state } = view;
    return {
        ...MetadataSchema.parse(metadata), projectId: project.id, number: project.number, name: project.name,
        pmId: project.pmId, pmName: project.pmName, members: structuredClone(view.members),
        currentRound: state.currentRound, displayedRound: selected.state.currentRound, phase: state.phase,
        snapshotId: selection.snapshotId, snapshotKind: snapshot?.kind ?? null,
        readOnly: selection.snapshotId !== null || state.phase === "completed",
        completedVersions: state.snapshots.filter(s => s.kind === "complete").length,
        totalSections: selected.state.body.sections.length,
        doneSections: selected.state.body.sections.filter(s => s.state === "done").length,
        openComments: getCompletionSummary(selected.state).openComments,
        canReview: canReviewProject(view), canManagePermissions: selected.capabilities.managePermissions,
        actions: { ...selected.capabilities.actions },
        history: state.snapshots.map(({ id, round, kind, createdAt, pptVersionId }) => ({ id, round, kind, createdAt, pptVersionId })).sort((a, b) => b.round - a.round),
    };
}
