import { z } from "zod";
import type {
  FileViewContext,
  WorkspaceContext,
  WorkspaceProjectDirectory,
} from "@/types/workspace-production";
import { WorkspaceError } from "@/lib/workspace/production/errors";
import { applyWorkspaceMutation } from "@/lib/workspace/production/domain";
import { canProjectAction } from "@/lib/workspace/production/permissions";
import { WorkspaceRecordSchema } from "@/lib/workspace/production/storage-schemas";
import { WorkspaceDatabase, type WatchRequest } from "./WorkspaceDatabase";
import {
  readWorkspaceBundle,
  workspaceFileReferences,
} from "./workspace-records";
import type {
  FileIdentity,
  FileMutation,
  FileOriginalRequest,
  FileProjectState,
  FileReceipt,
  FileRepository,
  PreparedFileOperation,
  StoredFileBlob,
  WorkspaceProject,
} from "@/types/workspace-files";
import {
  applyFileMutation,
  collectRetainedBlobIds,
} from "@/lib/workspace/files/domain";
import { WorkspaceFileError } from "@/lib/workspace/files/errors";
import { requireFileProjectAccess } from "@/lib/workspace/files/permissions";
import {
  FileIdentitySchema,
  FileIdSchema,
  FileIsoSchema,
  FileMutationSchema,
  FileOriginalRequestSchema,
  FileProjectStateSchema,
} from "@/lib/workspace/files/schemas";
import { validateUploadFile } from "@/lib/workspace/files/validation";

export interface IndexedDbFileRepositoryOptions {
  identity: FileIdentity;
  catalog: WorkspaceProjectDirectory;
  database?: WorkspaceDatabase;
  factory?: IDBFactory;
  dbName?: string;
  now?: () => string;
  newId?: () => string;
}
const ProjectRecord = z.strictObject({
  namespace: z.string(),
  projectId: FileIdSchema,
  state: FileProjectStateSchema,
});
const PreferenceRecord = z.strictObject({
  namespace: z.string(),
  key: z.literal("selected-project"),
  projectId: FileIdSchema,
});
const BlobRecord = z.strictObject({
  namespace: z.string(),
  projectId: FileIdSchema,
  id: FileIdSchema,
  blob: z.custom<Blob>(
    (value) => typeof Blob !== "undefined" && value instanceof Blob,
  ),
  filename: z.string(),
  mediaType: z.string(),
  byteLength: z.number().int().positive(),
  createdAt: FileIsoSchema,
});
const BlobKeys = z.array(z.tuple([z.string(), z.string(), z.string()]));
function storageError(error: Error | null): WorkspaceFileError {
  if (error instanceof WorkspaceFileError) return error;
  if (error instanceof WorkspaceError) {
    const code =
      error.code === "LOCKED"
        ? "READ_ONLY"
        : error.code === "ASSET_UNAVAILABLE" ||
            error.code === "MAPPING" ||
            error.code === "LAYOUT"
          ? "STORAGE"
          : error.code;
    return new WorkspaceFileError(code, error.message, { cause: error });
  }
  return error?.name === "QuotaExceededError"
    ? new WorkspaceFileError(
        "QUOTA",
        "브라우저 저장 공간이 부족합니다. 불필요한 자료를 정리해 주세요.",
        { cause: error },
      )
    : new WorkspaceFileError(
        "STORAGE",
        "자료를 저장하거나 불러오지 못했습니다. 다시 시도해 주세요.",
        { cause: error },
      );
}
function cancelled(): WorkspaceFileError {
  return new WorkspaceFileError(
    "CANCELLED",
    "자료 저장소 연결이 변경되었습니다. 다시 불러와 주세요.",
  );
}

export class IndexedDbFileRepository implements FileRepository {
  private readonly identity: FileIdentity;
  private readonly database: WorkspaceDatabase;
  private readonly signal = new AbortController();
  private disposed = false;

  constructor(private readonly options: IndexedDbFileRepositoryOptions) {
    const identity = FileIdentitySchema.safeParse(options.identity);
    if (!identity.success)
      throw new WorkspaceFileError(
        "UNIDENTIFIED",
        "사용자 정보를 확인해 주세요.",
      );
    this.identity = identity.data;
    this.database = options.database ?? new WorkspaceDatabase(options);
  }
  private check(): void {
    if (this.disposed) throw cancelled();
  }
  private project(id: string): WorkspaceProject {
    this.check();
    if (!FileIdSchema.safeParse(id).success)
      throw new WorkspaceFileError("VALIDATION", "프로젝트를 확인해 주세요.");
    const project = this.options.catalog.get(id);
    if (!project)
      throw new WorkspaceFileError(
        "NOT_FOUND",
        "접근 가능한 프로젝트를 찾을 수 없습니다.",
      );
    return requireFileProjectAccess(this.identity, project).project;
  }
  private context(project: WorkspaceProject): WorkspaceContext {
    return {
      identity: this.identity,
      project,
      members: this.options.catalog.members(project.id),
      now: (this.options.now ?? (() => new Date().toISOString()))(),
      newId: this.options.newId ?? (() => crypto.randomUUID()),
    };
  }
  private transact<T>(
    stores: string[],
    mode: IDBTransactionMode,
    run: (
      tx: IDBTransaction,
      done: (result: T) => void,
      watch: WatchRequest,
    ) => void,
  ): Promise<T> {
    this.check();
    return this.database
      .transact(stores, mode, run, this.signal.signal)
      .catch((error) => {
        throw storageError(error instanceof Error ? error : null);
      });
  }
  async load(projectId: string): Promise<FileProjectState> {
    return (await this.loadViewContext(projectId)).files;
  }
  loadViewContext(projectId: string): Promise<FileViewContext> {
    const context = this.context(this.project(projectId));
    return this.transact(
      ["projects", "workspaces"],
      "readwrite",
      (tx, done, watch) => {
        readWorkspaceBundle(tx, context, watch, (bundle) => {
          const live = this.context(this.project(projectId));
          done({
            files: bundle.files,
            control: {
              workspaceRevision: bundle.state.revision,
              phase: bundle.state.phase,
              canStartRound: canProjectAction(live, bundle.state, "rework"),
            },
          });
        });
      },
    );
  }
  execute(input: FileMutation): Promise<FileReceipt> {
    this.check();
    const parsed = FileMutationSchema.safeParse(input);
    if (!parsed.success) {
      const limit = parsed.error.issues.some(
        (issue) =>
          (issue.code === "too_big" &&
            issue.path.length === 2 &&
            issue.path[1] === "files") ||
          (issue.code === "custom" && issue.params?.fileErrorCode === "LIMIT"),
      );
      throw new WorkspaceFileError(
        limit ? "LIMIT" : "VALIDATION",
        limit
          ? "파일 크기 또는 현재 자료 개수 제한을 확인해 주세요."
          : "자료 입력값을 확인해 주세요.",
      );
    }
    const project = this.project(parsed.data.projectId);
    const context = this.context(project);
    const blobs: StoredFileBlob[] = [];
    const raw = parsed.data.operation;
    const operation: PreparedFileOperation =
      raw.type !== "add-files"
        ? raw
        : {
            type: raw.type,
            category: raw.category,
            files: raw.files.map((draft) => {
              const extension = validateUploadFile(draft.file);
              const mediaType =
                extension === ".pdf"
                  ? "application/pdf"
                  : extension === ".txt"
                    ? "text/plain"
                    : draft.file.type || "application/octet-stream";
              const id = context.newId();
              blobs.push({
                namespace: this.identity.namespace,
                projectId: project.id,
                id,
                blob: draft.file.slice(0, draft.file.size, mediaType),
                filename: draft.file.name,
                mediaType,
                byteLength: draft.file.size,
                createdAt: context.now,
              });
              return {
                kind: draft.kind,
                priority: draft.priority,
                instruction: draft.instruction,
                original: {
                  type: "file",
                  blobId: id,
                  filename: draft.file.name,
                  extension,
                  mediaType,
                  byteLength: draft.file.size,
                  lastModified: draft.file.lastModified,
                },
              };
            }),
          };
    return this.transact(
      ["projects", "blobs", "workspaces"],
      "readwrite",
      (tx, done, watch) => {
        const projects = tx.objectStore("projects"),
          originals = tx.objectStore("blobs");
        readWorkspaceBundle(
          tx,
          context,
          watch,
          (bundle) => {
            const live = this.context(this.project(project.id)),
              workspace = bundle.state;
            if (
              parsed.data.expectedWorkspaceRevision !== undefined &&
              parsed.data.expectedWorkspaceRevision !== workspace.revision
            )
              throw new WorkspaceFileError(
                "CONFLICT",
                "제작 내용이 변경되었습니다.",
              );
            let receipt: FileReceipt;
            let nextWorkspace = workspace;
            const protectedVersions = workspaceFileReferences(workspace).map(
              (ref) => ref.versionId,
            );
            if (operation.type === "start-round") {
              const result = applyWorkspaceMutation(
                workspace,
                {
                  projectId: project.id,
                  expectedRevision: parsed.data.expectedWorkspaceRevision ?? 0,
                  expectedRound: parsed.data.expectedRound,
                  operation: {
                    type: "start-round",
                    expectedFileRevision: parsed.data.expectedRevision,
                    acknowledged: true,
                  },
                },
                live,
                bundle.files,
              );
              nextWorkspace = result.receipt.state;
              receipt = {
                state: result.files,
                createdAssetIds: [],
                removalId: null,
              };
            } else {
              if (workspace.phase !== "writing")
                throw new WorkspaceFileError(
                  "READ_ONLY",
                  "완성된 회차입니다. 재작업을 시작해 주세요.",
                );
              receipt = applyFileMutation(
                bundle.files,
                { ...parsed.data, operation },
                live,
                protectedVersions,
              );
              if (workspace.revision === Number.MAX_SAFE_INTEGER)
                throw new WorkspaceFileError("LIMIT", "저장 버전 한도입니다.");
              nextWorkspace = {
                ...workspace,
                revision: workspace.revision + 1,
                inputRevision: workspace.inputRevision + 1,
                undo: null,
              };
            }
            watch(
              originals
                .index("byProject")
                .getAllKeys([this.identity.namespace, project.id]),
              (value) => {
                this.project(project.id);
                const keys = BlobKeys.safeParse(value);
                if (
                  !keys.success ||
                  keys.data.some(
                    (key) =>
                      key[0] !== this.identity.namespace ||
                      key[1] !== project.id,
                  )
                )
                  throw storageError(null);
                const retained = collectRetainedBlobIds(
                  receipt.state,
                  protectedVersions,
                );
                for (const blob of blobs) watch(originals.add(blob), () => {});
                for (const key of keys.data)
                  if (!retained.has(key[2]))
                    watch(originals.delete(key), () => {});
                watch(
                  projects.put({
                    namespace: this.identity.namespace,
                    projectId: project.id,
                    state: receipt.state,
                  }),
                  () => {},
                );
                watch(
                  tx
                    .objectStore("workspaces")
                    .put({
                      namespace: this.identity.namespace,
                      projectId: project.id,
                      state: nextWorkspace,
                    }),
                  () => {},
                );
                done(receipt);
              },
            );
          },
          false,
        );
      },
    );
  }
  readOriginal(input: FileOriginalRequest): Promise<File> {
    const parsed = FileOriginalRequestSchema.safeParse(input);
    if (!parsed.success)
      throw new WorkspaceFileError("VALIDATION", "자료 정보를 확인해 주세요.");
    const { projectId, round, versionId } = parsed.data;
    this.project(projectId);
    return this.transact(
      ["projects", "blobs", "workspaces"],
      "readonly",
      (tx, done, watch) => {
        watch(
          tx.objectStore("projects").get([this.identity.namespace, projectId]),
          (value) => {
            this.project(projectId);
            const row = ProjectRecord.safeParse(value);
            if (
              !row.success ||
              row.data.namespace !== this.identity.namespace ||
              row.data.projectId !== projectId ||
              row.data.state.projectId !== projectId
            )
              throw storageError(null);
            watch(
              tx
                .objectStore("workspaces")
                .get([this.identity.namespace, projectId]),
              (saved) => {
                const workspace =
                  saved === undefined
                    ? null
                    : WorkspaceRecordSchema.parse(saved);
                if (
                  workspace &&
                  (workspace.namespace !== this.identity.namespace ||
                    workspace.projectId !== projectId ||
                    workspace.state.projectId !== projectId)
                )
                  throw storageError(null);
                const retained = workspace
                  ? workspaceFileReferences(workspace.state)
                  : [];
                const entry =
                  row.data.state.rounds
                    .find((item) => item.number === round)
                    ?.entries.find((item) => item.versionId === versionId) ??
                  retained.find(
                    (ref) => ref.round === round && ref.versionId === versionId,
                  );
                const version = row.data.state.versions.find(
                  (item) =>
                    item.id === versionId && item.assetId === entry?.assetId,
                );
                if (!entry || !version)
                  throw new WorkspaceFileError(
                    "NOT_FOUND",
                    "해당 회차에 있는 자료만 열 수 있습니다.",
                  );
                const original = version.source;
                if (original.type !== "file")
                  throw new WorkspaceFileError(
                    "VALIDATION",
                    "웹 자료에는 다운로드할 원본이 없습니다.",
                  );
                watch(
                  tx
                    .objectStore("blobs")
                    .get([this.identity.namespace, projectId, original.blobId]),
                  (value) => {
                    this.project(projectId);
                    if (value === undefined)
                      throw new WorkspaceFileError(
                        "ORIGINAL_MISSING",
                        "원본 파일을 찾을 수 없습니다. 파일을 다시 등록해 주세요.",
                      );
                    const blob = BlobRecord.safeParse(value);
                    if (
                      !blob.success ||
                      blob.data.namespace !== this.identity.namespace ||
                      blob.data.projectId !== projectId ||
                      blob.data.id !== original.blobId ||
                      blob.data.filename !== original.filename ||
                      blob.data.byteLength !== original.byteLength ||
                      blob.data.blob.size !== original.byteLength ||
                      blob.data.mediaType !== original.mediaType ||
                      blob.data.blob.type !== original.mediaType
                    )
                      throw storageError(null);
                    done(
                      new File([blob.data.blob], original.filename, {
                        type: original.mediaType,
                        lastModified: original.lastModified,
                      }),
                    );
                  },
                );
              },
            );
          },
        );
      },
    );
  }
  readSelection(): Promise<string | null> {
    this.check();
    return this.transact(["preferences"], "readonly", (tx, done, watch) => {
      watch(
        tx
          .objectStore("preferences")
          .get([this.identity.namespace, "selected-project"]),
        (value) => {
          if (value === undefined) {
            done(null);
            return;
          }
          const row = PreferenceRecord.safeParse(value);
          if (!row.success || row.data.namespace !== this.identity.namespace)
            throw storageError(null);
          const project = this.options.catalog.get(row.data.projectId);
          if (!project) {
            done(null);
            return;
          }
          try {
            requireFileProjectAccess(this.identity, project);
            done(project.id);
          } catch {
            done(null);
          }
        },
      );
    });
  }
  saveSelection(projectId: string): Promise<void> {
    this.project(projectId);
    return this.transact(["preferences"], "readwrite", (tx, done, watch) => {
      this.project(projectId);
      watch(
        tx
          .objectStore("preferences")
          .put({
            namespace: this.identity.namespace,
            key: "selected-project",
            projectId,
          }),
        () => done(),
      );
    });
  }
  close(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.signal.abort();
    if (!this.options.database) this.database.close();
  }
}
