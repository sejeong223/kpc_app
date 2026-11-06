import type { ProjectPermission, ProjectWorkspaceState, RoundSnapshot, WorkspaceMember } from "./workspace-production";
import type { ProjectGrant } from "./workspace-production";
export type HeaderProjectRole = "PM" | "작성자" | "리뷰자" | "참여자" | "슈퍼 관리자";
export interface WorkspaceProjectPickerItem {
    id: string;
    name: string;
    number: string;
    organization: string | null;
    dueDate: string | null;
    roleLabels: HeaderProjectRole[];
}
export interface HeaderDeadline {
    days: number | null;
    label: string;
    tone: "normal" | "urgent" | "overdue";
    description: string;
}
export interface ProjectPermissionDraft {
    projectId: string;
    baseRevision: number;
    baseRound: number;
    rows: ProjectGrant[];
}
export interface WorkspaceHeaderMetadata {
    organization: string | null;
    dueDate: string | null;
    budgetKrw: number | null;
}
export interface WorkspaceHeaderModel extends WorkspaceHeaderMetadata {
    projectId: string;
    number: string;
    name: string;
    pmId: string;
    pmName: string;
    members: WorkspaceMember[];
    currentRound: number;
    displayedRound: number;
    phase: ProjectWorkspaceState["phase"];
    snapshotId: string | null;
    snapshotKind: RoundSnapshot["kind"] | null;
    readOnly: boolean;
    completedVersions: number;
    totalSections: number;
    doneSections: number;
    openComments: number;
    canReview: boolean;
    canManagePermissions: boolean;
    actions: Record<ProjectPermission, boolean>;
    history: Array<Pick<RoundSnapshot, "id" | "round" | "kind" | "createdAt" | "pptVersionId">>;
}
