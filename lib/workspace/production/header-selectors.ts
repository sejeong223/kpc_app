import { z } from "zod";
import { PROJECT_HEADER_PROJECTS } from "@/config/project-header";
import type { AdminRfp } from "@/types/admin";
import type { HeaderDeadline, HeaderProjectRole, WorkspaceHeaderMetadata, WorkspaceHeaderModel } from "@/types/workspace-header";
import type { ProjectView, WorkspaceSelection } from "@/types/workspace-production";
import { workspaceAssert as check } from "./errors";
import { selectSnapshotView, getCompletionSummary } from "./selectors";
const MetadataSchema = z.strictObject({ organization: z.string().nullable(), dueDate: z.iso.date().nullable(), budgetKrw: z.number().finite().nonnegative().nullable() });
export function selectProjectRoleLabels(view: ProjectView): HeaderProjectRole[] {
    const roles: HeaderProjectRole[] = [];
    if (view.actor.id === view.project.pmId) roles.push("PM");
    if (view.state.body.sections.some(s => s.assigneeIds.includes(view.actor.id))) roles.push("작성자");
    if (view.state.body.sections.some(s => s.reviewerIds.includes(view.actor.id))) roles.push("리뷰자");
    return roles.length ? roles : [view.actor.role === "super_admin" ? "슈퍼 관리자" : "참여자"];
}
export function getHeaderDeadline(dueDate: string | null, nowMs: number): HeaderDeadline {
    const unknown: HeaderDeadline = { days: null, label: "—", tone: "normal", description: "마감일 확인 필요" };
    if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(nowMs)) return unknown;
    const deadline = Date.parse(dueDate + "T00:00:00Z");
    if (!Number.isFinite(deadline) || new Date(deadline).toISOString().slice(0, 10) !== dueDate) return unknown;
    const days = Math.floor(deadline / 86400000) - Math.floor((nowMs + 32400000) / 86400000);
    const label = days < 0 ? `마감 경과 ${-days}일` : `D-${days}`;
    return { days, label, tone: days < 0 ? "overdue" : days <= 7 ? "urgent" : "normal",
        description: days < 0 ? label : days === 0 ? "마감 당일" : `마감까지 ${days}일` };
}
export function getHeaderRoundLabel(model: WorkspaceHeaderModel): string {
    if (model.snapshotId) return `${model.displayedRound}차 ${model.snapshotKind === "unfinished" ? "미완성 이력" : "보관본"}`;
    if (model.phase === "completed") return `${model.currentRound}차 완성`;
    return model.currentRound === 1 ? "1차 작성 중" : `${model.currentRound}차 재작업 중`;
}
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
