import type { WorkspaceBundle, WorkspaceContext } from "@/types/workspace-production";
import type { FileWorkspaceView } from "@/types/workspace-files";
import { requireFileProjectAccess } from "@/lib/workspace/files/permissions";
import { workspaceAssert as check } from "./errors";
export function selectFileSnapshot(bundle: WorkspaceBundle, context: WorkspaceContext, snapshotId: string): FileWorkspaceView {
    const { state, files } = bundle, { project, identity } = context;
    requireFileProjectAccess(identity, project);
    check(state.projectId === project.id && files.projectId === project.id, "FORBIDDEN", "다른 프로젝트의 자료입니다.");
    const snapshot = state.snapshots.find(s => s.id === snapshotId);
    check(!!snapshot, "NOT_FOUND", "보관본이 없습니다.");
    const round = files.rounds.find(r => r.number === snapshot.round);
    check(!!round, "STORAGE", "보관된 자료 회차가 없습니다.");
    const resources = snapshot.fileEntries.map(entry => {
        const asset = files.assets.find(a => a.id === entry.assetId), version = files.versions.find(v => v.id === entry.versionId);
        check(!!asset && !!version && version.assetId === entry.assetId, "STORAGE", "보관된 자료 버전을 찾을 수 없습니다.");
        return { asset: structuredClone(asset), version: structuredClone(version), canManage: false, currentVersionId: null, isInherited: version.createdInRound < snapshot.round };
    });
    return { project: structuredClone(project), revision: files.revision, workspaceRevision: state.revision, phase: "completed", currentRound: snapshot.round, currentCount: resources.length, canAdd: false, canStartRound: false, canReorder: false, rounds: [{ number: round.number, createdAt: round.createdAt, createdBy: round.createdBy, sealedAt: round.sealedAt, categoryOrder: [...round.categoryOrder], resources, readOnly: true }] };
}
