import { FILE_CATEGORIES, FILE_LIMITS } from "@/config/workspace-files";
import type {
  FileAsset, FileCategory, FileCommandContext, FileOriginal, FileProjectState, FileReceipt,
  FileRound, FileRoundEntry, FileSettings, FileVersion, PreparedFileMutation, WebOriginal,
} from "@/types/workspace-files";
import { WorkspaceFileError } from "./errors";
import { canManageFileAsset, canManageFileProject, requireFileProjectAccess } from "./permissions";
import { FileIdSchema, FileIsoSchema, FileProjectStateSchema, PreparedFileMutationSchema } from "./schemas";
import { normalizeWebUrl } from "./validation";

function currentRoundOf(state: FileProjectState): FileRound {
  const round = state.rounds.find(item => item.number === state.currentRound);
  if (!round || round.sealedAt !== null) throw new WorkspaceFileError("STORAGE", "현재 회차 정보를 확인할 수 없습니다.");
  return round;
}

function checkedContext(context: FileCommandContext): FileCommandContext {
  const scope = requireFileProjectAccess(context.identity, context.project);
  const time = FileIsoSchema.safeParse(context.now);
  if (!time.success || typeof context.newId !== "function") throw new WorkspaceFileError("VALIDATION", "자료 저장 정보를 확인해 주세요.");
  return { ...scope, now: time.data, newId: context.newId };
}

export function createEmptyFileProject(context: FileCommandContext): FileProjectState {
  const checked = checkedContext(context);
  return {
    schemaVersion: 1, projectId: checked.project.id, revision: 1, currentRound: 1,
    rounds: [{ number: 1, createdAt: checked.now, createdBy: checked.identity.actor.id, sealedAt: null,
      categoryOrder: FILE_CATEGORIES.map(category => category.value), entries: [] }],
    assets: [], versions: [], removals: [],
  };
}

function referencedVersionIds(state: FileProjectState): Set<string> {
  return new Set([
    ...state.rounds.flatMap(round => round.entries.map(entry => entry.versionId)),
    ...state.removals.map(removal => removal.entry.versionId),
  ]);
}

function retainReferencedVersions(state: FileProjectState): void {
  const retained = referencedVersionIds(state);
  state.versions = state.versions.filter(version => retained.has(version.id));
  const assets = new Set(state.versions.map(version => version.assetId));
  state.assets = state.assets.filter(asset => assets.has(asset.id));
}

export function collectRetainedBlobIds(state: FileProjectState): ReadonlySet<string> {
  // 만료된 삭제 기록은 전이에서 정리한다. 여기서는 전달된 보존 참조를 빠짐없이 보호한다.
  const retained = referencedVersionIds(state);
  return new Set(state.versions.flatMap(version => retained.has(version.id) && version.source.type === "file" ? [version.source.blobId] : []));
}

function assertRoom(round: FileRound, additional: number): void {
  if (round.entries.length + additional > FILE_LIMITS.currentMaterials) {
    throw new WorkspaceFileError("LIMIT", "현재 회차 자료는 최대 30개까지 보관할 수 있습니다.");
  }
}

function manageableAsset(state: FileProjectState, assetId: string, context: FileCommandContext): FileAsset {
  const asset = state.assets.find(item => item.id === assetId);
  if (!asset) throw new WorkspaceFileError("NOT_FOUND", "자료를 찾을 수 없습니다. 다시 불러와 주세요.");
  if (!canManageFileAsset(context.identity, context.project, asset)) {
    throw new WorkspaceFileError("FORBIDDEN", "본인이 등록한 자료만 변경할 수 있습니다.");
  }
  return asset;
}

function assertProjectManager(context: FileCommandContext): void {
  if (!canManageFileProject(context.identity, context.project)) {
    throw new WorkspaceFileError("FORBIDDEN", "PM과 슈퍼 관리자만 프로젝트 공통 설정을 변경할 수 있습니다.");
  }
}

export function applyFileMutation(source: FileProjectState, input: PreparedFileMutation, context: FileCommandContext): FileReceipt {
  const checked = checkedContext(context);
  const stored = FileProjectStateSchema.safeParse(source);
  if (!stored.success) throw new WorkspaceFileError("STORAGE", "저장된 자료 정보가 올바르지 않습니다.");
  const parsed = PreparedFileMutationSchema.safeParse(input);
  if (!parsed.success) {
    const limit = parsed.error.issues.some(issue => issue.code === "too_big"
      && issue.path[0] === "operation" && issue.path[1] === "files"
      && (issue.path.length === 2 || (issue.path.length === 5 && issue.path[3] === "original" && issue.path[4] === "byteLength")));
    throw new WorkspaceFileError(limit ? "LIMIT" : "VALIDATION", limit ? "파일 크기 또는 자료 개수 제한을 확인해 주세요." : "자료 입력값을 확인해 주세요.");
  }
  const mutation = parsed.data;
  if (stored.data.projectId !== checked.project.id || mutation.projectId !== checked.project.id) {
    throw new WorkspaceFileError("NOT_FOUND", "선택한 프로젝트의 자료가 아닙니다.");
  }
  if (mutation.expectedRevision !== stored.data.revision || mutation.expectedRound !== stored.data.currentRound) {
    throw new WorkspaceFileError("CONFLICT", "자료 또는 회차가 변경되었습니다. 최신 자료를 다시 불러와 주세요.");
  }
  if (stored.data.revision === Number.MAX_SAFE_INTEGER) throw new WorkspaceFileError("LIMIT", "저장 버전 한도에 도달했습니다.");

  const state = structuredClone(stored.data);
  const operation = mutation.operation;
  const now = Date.parse(checked.now);
  // 삭제 기록을 정리하기 전에 유효기간과 소유권을 확인해 만료를 구분한다.
  if (operation.type === "undo-remove") {
    const removal = state.removals.find(item => item.id === operation.removalId);
    if (!removal) throw new WorkspaceFileError("UNDO_EXPIRED", "되돌릴 수 있는 삭제 기록이 없습니다.");
    manageableAsset(state, removal.entry.assetId, checked);
    if (removal.round !== state.currentRound || Date.parse(removal.expiresAt) <= now) {
      throw new WorkspaceFileError("UNDO_EXPIRED", "삭제를 되돌릴 수 있는 기간 또는 회차가 지났습니다.");
    }
  }
  state.removals = state.removals.filter(removal => removal.round === state.currentRound && Date.parse(removal.expiresAt) > now);
  retainReferencedVersions(state);
  const round = currentRoundOf(state);
  const createdAssetIds: string[] = [];
  let removalId: string | null = null;
  const originalBlobIds = new Set(stored.data.versions.flatMap(version => version.source.type === "file" ? [version.source.blobId] : []));
  const usedIds = new Set([...stored.data.assets.map(asset => asset.id), ...stored.data.versions.map(version => version.id),
    ...stored.data.removals.map(removal => removal.id), ...originalBlobIds]);
  const newId = (): string => {
    const id = FileIdSchema.safeParse(checked.newId());
    if (!id.success || usedIds.has(id.data)) throw new WorkspaceFileError("STORAGE", "새 자료 식별자를 생성하지 못했습니다.");
    usedIds.add(id.data);
    return id.data;
  };
  const appendAsset = (original: FileOriginal | WebOriginal, category: FileCategory, settings: FileSettings): void => {
    const asset: FileAsset = { id: newId(), ownerId: checked.identity.actor.id, ownerName: checked.identity.actor.name,
      createdAt: checked.now, sourceKind: original.type };
    const version: FileVersion = { ...settings, id: newId(), assetId: asset.id, category, createdInRound: state.currentRound,
      createdAt: checked.now, createdBy: checked.identity.actor.id,
      label: original.type === "file" ? original.filename : original.url, source: structuredClone(original) };
    state.assets.push(asset);
    state.versions.push(version);
    round.entries.push({ assetId: asset.id, versionId: version.id });
    createdAssetIds.push(asset.id);
  };

  switch (operation.type) {
    case "add-files": {
      assertRoom(round, operation.files.length);
      for (const file of operation.files) {
        if (usedIds.has(file.original.blobId)) throw new WorkspaceFileError("VALIDATION", "원본 파일 식별자가 중복되었습니다.");
        usedIds.add(file.original.blobId);
      }
      for (const file of operation.files) {
        appendAsset(file.original, operation.category, { kind: file.kind, priority: file.priority, instruction: file.instruction });
      }
      break;
    }
    case "add-web": {
      assertRoom(round, 1);
      appendAsset({ type: "web", url: normalizeWebUrl(operation.url), period: operation.period }, "web",
        { kind: "web", priority: "normal", instruction: operation.instruction });
      break;
    }
    case "edit": {
      const asset = manageableAsset(state, operation.assetId, checked);
      const original = state.versions.find(version => version.id === operation.sourceVersionId && version.assetId === asset.id);
      if (!original) throw new WorkspaceFileError("NOT_FOUND", "편집할 자료 버전을 찾을 수 없습니다.");
      const entry = round.entries.find(item => item.assetId === asset.id);
      if (entry && entry.versionId !== original.id) throw new WorkspaceFileError("CONFLICT", "현재 자료 버전이 변경되었습니다.");
      if (!entry) {
        let latest: FileRoundEntry | undefined;
        for (const previous of state.rounds) {
          if (previous.number < state.currentRound) latest = previous.entries.find(item => item.assetId === asset.id) ?? latest;
        }
        if (!latest) throw new WorkspaceFileError("NOT_FOUND", "현재 회차로 가져올 보관 자료가 없습니다.");
        if (latest.versionId !== original.id) throw new WorkspaceFileError("CONFLICT", "보관된 자료의 최신 버전을 선택해 주세요.");
        assertRoom(round, 1);
      }
      let updatedSource: FileOriginal | WebOriginal = original.source;
      if (original.source.type === "web") {
        if (!operation.web || operation.settings.kind !== "web" || operation.settings.priority !== "normal") {
          throw new WorkspaceFileError("VALIDATION", "웹 자료 설정을 확인해 주세요.");
        }
        updatedSource = { ...operation.web, url: normalizeWebUrl(operation.web.url) };
      } else if (operation.web !== null) {
        throw new WorkspaceFileError("VALIDATION", "파일 자료를 웹 자료로 변경할 수 없습니다.");
      }
      const version: FileVersion = { ...original, ...operation.settings, id: newId(), createdInRound: state.currentRound,
        createdAt: checked.now, createdBy: checked.identity.actor.id, source: structuredClone(updatedSource),
        label: updatedSource.type === "file" ? updatedSource.filename : updatedSource.url };
      state.versions.push(version);
      if (entry) entry.versionId = version.id;
      else round.entries.push({ assetId: asset.id, versionId: version.id });
      break;
    }
    case "remove": {
      manageableAsset(state, operation.assetId, checked);
      const index = round.entries.findIndex(entry => entry.assetId === operation.assetId);
      if (index < 0) throw new WorkspaceFileError("NOT_FOUND", "현재 회차의 자료가 아닙니다.");
      const entry = round.entries[index];
      if (entry.versionId !== operation.sourceVersionId) throw new WorkspaceFileError("CONFLICT", "삭제할 자료 버전이 변경되었습니다.");
      removalId = newId();
      state.removals.push({ id: removalId, round: state.currentRound, entry: { ...entry }, index,
        removedBy: checked.identity.actor.id, expiresAt: new Date(now + FILE_LIMITS.undoTtlMs).toISOString() });
      round.entries.splice(index, 1);
      break;
    }
    case "undo-remove": {
      const removal = state.removals.find(item => item.id === operation.removalId);
      if (!removal) throw new WorkspaceFileError("UNDO_EXPIRED", "삭제 기록이 만료되었습니다.");
      manageableAsset(state, removal.entry.assetId, checked);
      if (round.entries.some(entry => entry.assetId === removal.entry.assetId)) {
        throw new WorkspaceFileError("CONFLICT", "이미 현재 회차에 있는 자료입니다.");
      }
      assertRoom(round, 1);
      round.entries.splice(Math.min(removal.index, round.entries.length), 0, { ...removal.entry });
      state.removals = state.removals.filter(item => item.id !== removal.id);
      break;
    }
    case "start-round": {
      assertProjectManager(checked);
      if (state.currentRound === Number.MAX_SAFE_INTEGER) throw new WorkspaceFileError("LIMIT", "회차 한도에 도달했습니다.");
      round.sealedAt = checked.now;
      state.currentRound++;
      state.rounds.push({ number: state.currentRound, createdAt: checked.now, createdBy: checked.identity.actor.id,
        sealedAt: null, categoryOrder: [...round.categoryOrder], entries: round.entries.map(entry => ({ ...entry })) });
      state.removals = [];
      break;
    }
    case "reorder":
      assertProjectManager(checked);
      round.categoryOrder = [...operation.categoryOrder];
      break;
  }
  retainReferencedVersions(state);
  state.revision++;
  const result = FileProjectStateSchema.safeParse(state);
  if (!result.success) throw new WorkspaceFileError("STORAGE", "자료 변경 결과를 검증하지 못했습니다.");
  return { state: result.data, createdAssetIds, removalId };
}
