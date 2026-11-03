import type {
  WorkspaceBundle,
  WorkspaceContext,
  ProjectWorkspaceState,
  WorkspaceBlobInput,
} from "@/types/workspace-production";
import type { FileProjectState } from "@/types/workspace-files";
import { createEmptyFileProject } from "@/lib/workspace/files/domain";
import { createWorkspaceState } from "@/lib/workspace/production/domain";
import {
  FileProjectRecordSchema,
  WorkspaceRecordSchema,
} from "@/lib/workspace/production/storage-schemas";
import { workspaceAssert as check } from "@/lib/workspace/production/errors";
import type { WatchRequest } from "./WorkspaceDatabase";

export function readWorkspaceBundle(
  tx: IDBTransaction,
  context: WorkspaceContext,
  watch: WatchRequest,
  done: (value: WorkspaceBundle) => void,
  create = true,
): void {
  const namespace = context.identity.namespace,
    projectId = context.project.id;
  let files: FileProjectState | null = null,
    state: ProjectWorkspaceState | null = null,
    loaded = 0;
  const finish = () => {
    if (++loaded !== 2) return;
    check(
      !state || !!files,
      "STORAGE",
      "제작에 연결된 자료 메타데이터가 없습니다.",
    );
    check(
      create || (!!files && !!state),
      "NOT_FOUND",
      "저장된 프로젝트 작업이 없습니다.",
    );
    const fileState = files ?? createEmptyFileProject(context),
      workspace = state ?? createWorkspaceState(context, fileState);
    check(
      fileState.currentRound === workspace.currentRound,
      "STORAGE",
      "파일과 제작 회차가 일치하지 않습니다.",
    );
    if (!files)
      watch(
        tx
          .objectStore("projects")
          .add({ namespace, projectId, state: fileState }),
        () => {},
      );
    if (!state)
      watch(
        tx
          .objectStore("workspaces")
          .add({ namespace, projectId, state: workspace }),
        () => {},
      );
    done({ state: workspace, files: fileState });
  };
  watch(tx.objectStore("projects").get([namespace, projectId]), (value) => {
    if (value !== undefined) {
      const r = FileProjectRecordSchema.safeParse(value);
      check(
        r.success &&
          r.data.namespace === namespace &&
          r.data.projectId === projectId &&
          r.data.state.projectId === projectId,
        "STORAGE",
        "자료 저장 정보가 올바르지 않습니다.",
      );
      files = r.data.state;
    }
    finish();
  });
  watch(tx.objectStore("workspaces").get([namespace, projectId]), (value) => {
    if (value !== undefined) {
      const r = WorkspaceRecordSchema.safeParse(value);
      check(
        r.success &&
          r.data.namespace === namespace &&
          r.data.projectId === projectId &&
          r.data.state.projectId === projectId,
        "STORAGE",
        "작업 저장 정보가 올바르지 않습니다.",
      );
      state = r.data.state;
    }
    finish();
  });
}

export function workspaceFileReferences(
  state: ProjectWorkspaceState,
): { assetId: string; versionId: string; round: number }[] {
  return [
    ...state.snapshots.flatMap((s) =>
      s.fileEntries.map((e) => ({ ...e, round: s.round })),
    ),
    ...[
      state.body,
      ...state.snapshots.map((s) => s.body),
      ...(state.undo ? [state.undo.previousBody] : []),
    ].flatMap((b) =>
      b.slides.flatMap((s) =>
        s.sources.flatMap((r) =>
          r.kind === "file" && r.versionId !== null && r.fileRound !== null
            ? [
                {
                  assetId: r.targetId,
                  versionId: r.versionId,
                  round: r.fileRound,
                },
              ]
            : [],
        ),
      ),
    ),
  ];
}
export function workspaceBlobReferences(
  state: ProjectWorkspaceState,
): Map<string, WorkspaceBlobInput["kind"]> {
  const refs = new Map<string, WorkspaceBlobInput["kind"]>();
  const add = (id: string, kind: WorkspaceBlobInput["kind"]) => {
    check(
      !refs.has(id) || refs.get(id) === kind,
      "STORAGE",
      "원본 종류가 중복되었습니다.",
    );
    refs.set(id, kind);
  };
  state.pins.forEach((p) => {
    if (p.kind === "template") add(p.blobId, "template");
  });
  state.pptVersions.forEach((v) => add(v.blobId, "ppt"));
  for (const body of [
    state.body,
    ...state.snapshots.map((s) => s.body),
    ...(state.undo ? [state.undo.previousBody] : []),
  ])
    for (const s of body.slides)
      for (const b of s.content.blocks)
        if (b.kind === "image") add(b.blobId, "image");
  return refs;
}
