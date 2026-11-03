import type { FileIdentity, FileProjectState, FileWorkspaceView, WorkspaceProject } from "@/types/workspace-files";
import { WorkspaceFileError } from "./errors";
import { canManageFileAsset, canManageFileProject, requireFileProjectAccess } from "./permissions";
import { FileProjectStateSchema } from "./schemas";

export function selectFileWorkspace(state: FileProjectState, project: WorkspaceProject, identity: FileIdentity): FileWorkspaceView {
  const scope = requireFileProjectAccess(identity, project);
  const checked = FileProjectStateSchema.safeParse(state);
  if (!checked.success) throw new WorkspaceFileError("STORAGE", "저장된 자료 정보를 확인할 수 없습니다.");
  const snapshot = checked.data;
  if (snapshot.projectId !== scope.project.id) throw new WorkspaceFileError("NOT_FOUND", "선택한 프로젝트의 자료가 아닙니다.");
  const current = snapshot.rounds.find(round => round.number === snapshot.currentRound);
  if (!current) throw new WorkspaceFileError("STORAGE", "현재 회차를 찾을 수 없습니다.");
  const currentVersions = new Map(current.entries.map(entry => [entry.assetId, entry.versionId]));
  const assets = new Map(snapshot.assets.map(asset => [asset.id, asset]));
  const versions = new Map(snapshot.versions.map(version => [version.id, version]));
  const manager = canManageFileProject(scope.identity, scope.project);
  return {
    project: scope.project, revision: snapshot.revision, currentRound: snapshot.currentRound,
    currentCount: current.entries.length, canAdd: true, canStartRound: manager, canReorder: manager,
    rounds: snapshot.rounds.map(({ entries, ...round }) => ({
      ...round, categoryOrder: [...round.categoryOrder], readOnly: round.number !== snapshot.currentRound,
      resources: entries.map(entry => {
        const asset = assets.get(entry.assetId), version = versions.get(entry.versionId);
        if (!asset || !version) throw new WorkspaceFileError("STORAGE", "자료 버전을 찾을 수 없습니다.");
        return { asset: { ...asset }, version: structuredClone(version), canManage: canManageFileAsset(scope.identity, scope.project, asset),
          currentVersionId: currentVersions.get(asset.id) ?? null, isInherited: version.createdInRound < round.number };
      }),
    })),
  };
}
