import { z } from "zod";
import type { FileIdentity, FileMutation, FileOriginalRequest, FileProjectCatalog, FileProjectState, FileReceipt, FileRepository, PreparedFileOperation, StoredFileBlob, WorkspaceProject } from "@/types/workspace-files";
import { applyFileMutation, collectRetainedBlobIds, createEmptyFileProject } from "@/lib/workspace/files/domain";
import { WorkspaceFileError } from "@/lib/workspace/files/errors";
import { requireFileProjectAccess } from "@/lib/workspace/files/permissions";
import { FileIdentitySchema, FileIdSchema, FileIsoSchema, FileMutationSchema, FileOriginalRequestSchema, FileProjectStateSchema } from "@/lib/workspace/files/schemas";
import { validateUploadFile } from "@/lib/workspace/files/validation";

export interface IndexedDbFileRepositoryOptions {
  identity: FileIdentity; catalog: FileProjectCatalog;
  factory?: IDBFactory; dbName?: string; now?: () => string; newId?: () => string;
}
const ProjectRecord = z.strictObject({ namespace: z.string(), projectId: FileIdSchema, state: FileProjectStateSchema });
const PreferenceRecord = z.strictObject({ namespace: z.string(), key: z.literal("selected-project"), projectId: FileIdSchema });
const BlobRecord = z.strictObject({
  namespace: z.string(), projectId: FileIdSchema, id: FileIdSchema,
  blob: z.custom<Blob>(value => typeof Blob !== "undefined" && value instanceof Blob),
  filename: z.string(), mediaType: z.string(), byteLength: z.number().int().positive(), createdAt: FileIsoSchema,
});
const BlobKeys = z.array(z.tuple([z.string(), z.string(), z.string()]));
type WatchRequest = <T>(request: IDBRequest<T>, receive: (value: T) => void) => void;
function storageError(error: Error | null): WorkspaceFileError {
  if (error instanceof WorkspaceFileError) return error;
  return error?.name === "QuotaExceededError"
    ? new WorkspaceFileError("QUOTA", "브라우저 저장 공간이 부족합니다. 불필요한 자료를 정리해 주세요.", { cause: error })
    : new WorkspaceFileError("STORAGE", "자료를 저장하거나 불러오지 못했습니다. 다시 시도해 주세요.", { cause: error });
}
function cancelled(): WorkspaceFileError { return new WorkspaceFileError("CANCELLED", "자료 저장소 연결이 변경되었습니다. 다시 불러와 주세요."); }

export class IndexedDbFileRepository implements FileRepository {
  private readonly identity: FileIdentity;
  private connection: IDBDatabase | null = null;
  private opening: Promise<IDBDatabase> | null = null;
  private cancelOpen: (() => void) | null = null;
  private readonly transactions = new Set<IDBTransaction>();
  private generation = 0;
  private disposed = false;

  constructor(private readonly options: IndexedDbFileRepositoryOptions) {
    const identity = FileIdentitySchema.safeParse(options.identity);
    if (!identity.success) throw new WorkspaceFileError("UNIDENTIFIED", "사용자 정보를 확인해 주세요.");
    this.identity = identity.data;
  }
  private check(): void { if (this.disposed) throw cancelled(); }
  private project(id: string): WorkspaceProject {
    this.check();
    if (!FileIdSchema.safeParse(id).success) throw new WorkspaceFileError("VALIDATION", "프로젝트를 확인해 주세요.");
    const project = this.options.catalog.get(id);
    if (!project) throw new WorkspaceFileError("NOT_FOUND", "접근 가능한 프로젝트를 찾을 수 없습니다.");
    return requireFileProjectAccess(this.identity, project).project;
  }
  private context(project: WorkspaceProject) {
    return { identity: this.identity, project, now: (this.options.now ?? (() => new Date().toISOString()))(), newId: this.options.newId ?? (() => crypto.randomUUID()) };
  }
  private open(): Promise<IDBDatabase> {
    this.check();
    if (this.connection) return Promise.resolve(this.connection);
    if (this.opening) return this.opening;
    const generation = this.generation;
    const promise = new Promise<IDBDatabase>((resolve, reject) => {
      let settled = false;
      const fail = (error: WorkspaceFileError) => {
        if (settled) return;
        settled = true; this.cancelOpen = null; reject(error);
      };
      this.cancelOpen = () => fail(cancelled());
      let request: IDBOpenDBRequest;
      try {
        const factory = this.options.factory ?? globalThis.indexedDB;
        if (!factory) throw new WorkspaceFileError("DB_UNAVAILABLE", "이 브라우저에서 로컬 자료 저장소를 사용할 수 없습니다.");
        request = factory.open(this.options.dbName ?? "kpc-workspace-files", 1);
      } catch (error) { fail(error instanceof WorkspaceFileError ? error : new WorkspaceFileError("DB_UNAVAILABLE", "로컬 자료 저장소를 열 수 없습니다.")); return; }
      request.onblocked = () => fail(new WorkspaceFileError("DB_BLOCKED", "다른 탭의 자료 화면을 닫은 뒤 다시 불러와 주세요."));
      request.onerror = () => fail(storageError(request.error));
      request.onupgradeneeded = () => {
        if (settled || generation !== this.generation) { request.transaction?.abort(); return; }
        try {
          const db = request.result;
          db.createObjectStore("projects", { keyPath: ["namespace", "projectId"] }).createIndex("byNamespace", "namespace");
          db.createObjectStore("blobs", { keyPath: ["namespace", "projectId", "id"] }).createIndex("byProject", ["namespace", "projectId"]);
          db.createObjectStore("preferences", { keyPath: ["namespace", "key"] });
        } catch (error) { fail(storageError(error instanceof Error ? error : null)); request.transaction?.abort(); }
      };
      request.onsuccess = () => {
        const db = request.result;
        if (settled || generation !== this.generation) { db.close(); return; }
        settled = true; this.cancelOpen = null; this.connection = db;
        db.onversionchange = () => this.close();
        db.onclose = () => { if (this.connection === db) this.close(); };
        resolve(db);
      };
    });
    const pending = promise.catch(error => {
      if (this.opening === pending) this.opening = null;
      throw storageError(error instanceof Error ? error : null);
    });
    this.opening = pending;
    return pending;
  }
  private async transact<T>(stores: string[], mode: IDBTransactionMode, run: (tx: IDBTransaction, done: (result: T) => void, watch: WatchRequest) => void): Promise<T> {
    this.check();
    const generation = this.generation;
    const db = await this.open();
    if (generation !== this.generation) throw cancelled();
    return new Promise<T>((resolve, reject) => {
      let tx: IDBTransaction;
      try { tx = db.transaction(stores, mode); } catch (error) { reject(storageError(error instanceof Error ? error : null)); return; }
      this.transactions.add(tx);
      let result: { value: T } | null = null;
      let failure: WorkspaceFileError | null = null;
      const abort = (error: Error | null) => {
        failure ??= storageError(error);
        try { tx.abort(); } catch { this.transactions.delete(tx); reject(failure); }
      };
      const watch: WatchRequest = (request, receive) => {
        request.onerror = () => abort(request.error);
        request.onsuccess = () => {
          try {
            if (generation !== this.generation) throw cancelled();
            receive(request.result);
          } catch (error) { abort(error instanceof Error ? error : null); }
        };
      };
      tx.oncomplete = () => {
        this.transactions.delete(tx);
        if (generation !== this.generation) reject(cancelled());
        else if (result) resolve(result.value);
        else reject(storageError(null));
      };
      tx.onabort = () => { this.transactions.delete(tx); reject(generation !== this.generation ? cancelled() : failure ?? storageError(tx.error)); };
      tx.onerror = () => { failure ??= storageError(tx.error); };
      try { run(tx, value => { result = { value }; }, watch); } catch (error) { abort(error instanceof Error ? error : null); }
    });
  }
  load(projectId: string): Promise<FileProjectState> {
    const project = this.project(projectId);
    return this.transact(["projects"], "readwrite", (tx, done, watch) => {
      const store = tx.objectStore("projects");
      watch(store.get([this.identity.namespace, projectId]), value => {
        this.project(projectId);
        if (value === undefined) {
          const state = createEmptyFileProject(this.context(project));
          watch(store.add({ namespace: this.identity.namespace, projectId, state }), () => done(state));
        } else {
          const parsed = ProjectRecord.safeParse(value);
          if (!parsed.success || parsed.data.namespace !== this.identity.namespace || parsed.data.projectId !== projectId || parsed.data.state.projectId !== projectId) throw storageError(null);
          done(parsed.data.state);
        }
      });
    });
  }
  execute(input: FileMutation): Promise<FileReceipt> {
    this.check();
    const parsed = FileMutationSchema.safeParse(input);
    if (!parsed.success) {
      const limit = parsed.error.issues.some(issue => (issue.code === "too_big" && issue.path.length === 2 && issue.path[1] === "files")
        || (issue.code === "custom" && issue.params?.fileErrorCode === "LIMIT"));
      throw new WorkspaceFileError(limit ? "LIMIT" : "VALIDATION", limit ? "파일 크기 또는 현재 자료 개수 제한을 확인해 주세요." : "자료 입력값을 확인해 주세요.");
    }
    const project = this.project(parsed.data.projectId);
    const context = this.context(project);
    const blobs: StoredFileBlob[] = [];
    const raw = parsed.data.operation;
    const operation: PreparedFileOperation = raw.type !== "add-files" ? raw : {
      type: raw.type, category: raw.category, files: raw.files.map(draft => {
        const extension = validateUploadFile(draft.file);
        const mediaType = extension === ".pdf" ? "application/pdf" : extension === ".txt" ? "text/plain" : draft.file.type || "application/octet-stream";
        const id = context.newId();
        blobs.push({ namespace: this.identity.namespace, projectId: project.id, id, blob: draft.file.slice(0, draft.file.size, mediaType), filename: draft.file.name, mediaType, byteLength: draft.file.size, createdAt: context.now });
        return { kind: draft.kind, priority: draft.priority, instruction: draft.instruction,
          original: { type: "file", blobId: id, filename: draft.file.name, extension, mediaType, byteLength: draft.file.size, lastModified: draft.file.lastModified } };
      }),
    };
    return this.transact(["projects", "blobs"], "readwrite", (tx, done, watch) => {
      const projects = tx.objectStore("projects"), originals = tx.objectStore("blobs");
      let state: FileProjectState | null = null;
      let keys: [string, string, string][] | null = null;
      const process = () => {
        if (!state || !keys) return;
        const receipt = applyFileMutation(state, { ...parsed.data, operation }, this.context(this.project(project.id)));
        const retained = collectRetainedBlobIds(receipt.state);
        for (const blob of blobs) watch(originals.add(blob), () => {});
        for (const key of keys) if (!retained.has(key[2])) watch(originals.delete(key), () => {});
        watch(projects.put({ namespace: this.identity.namespace, projectId: project.id, state: receipt.state }), () => {});
        done(receipt);
      };
      watch(projects.get([this.identity.namespace, project.id]), value => {
        if (value === undefined) throw new WorkspaceFileError("NOT_FOUND", "자료함을 먼저 불러와 주세요.");
        const row = ProjectRecord.safeParse(value);
        if (!row.success || row.data.namespace !== this.identity.namespace || row.data.projectId !== project.id || row.data.state.projectId !== project.id) throw storageError(null);
        state = row.data.state; process();
      });
      watch(originals.index("byProject").getAllKeys([this.identity.namespace, project.id]), value => {
        const parsedKeys = BlobKeys.safeParse(value);
        if (!parsedKeys.success || parsedKeys.data.some(key => key[0] !== this.identity.namespace || key[1] !== project.id)) throw storageError(null);
        keys = parsedKeys.data; process();
      });
    });
  }
  readOriginal(input: FileOriginalRequest): Promise<File> {
    const parsed = FileOriginalRequestSchema.safeParse(input);
    if (!parsed.success) throw new WorkspaceFileError("VALIDATION", "자료 정보를 확인해 주세요.");
    const { projectId, round, versionId } = parsed.data;
    this.project(projectId);
    return this.transact(["projects", "blobs"], "readonly", (tx, done, watch) => {
      watch(tx.objectStore("projects").get([this.identity.namespace, projectId]), value => {
        this.project(projectId);
        const row = ProjectRecord.safeParse(value);
        if (!row.success || row.data.namespace !== this.identity.namespace || row.data.projectId !== projectId || row.data.state.projectId !== projectId) throw storageError(null);
        const entry = row.data.state.rounds.find(item => item.number === round)?.entries.find(item => item.versionId === versionId);
        const version = row.data.state.versions.find(item => item.id === versionId && item.assetId === entry?.assetId);
        if (!entry || !version) throw new WorkspaceFileError("NOT_FOUND", "해당 회차에 있는 자료만 열 수 있습니다.");
        const original = version.source;
        if (original.type !== "file") throw new WorkspaceFileError("VALIDATION", "웹 자료에는 다운로드할 원본이 없습니다.");
        watch(tx.objectStore("blobs").get([this.identity.namespace, projectId, original.blobId]), value => {
          if (value === undefined) throw new WorkspaceFileError("ORIGINAL_MISSING", "원본 파일을 찾을 수 없습니다. 파일을 다시 등록해 주세요.");
          const blob = BlobRecord.safeParse(value);
          if (!blob.success || blob.data.namespace !== this.identity.namespace || blob.data.projectId !== projectId || blob.data.id !== original.blobId
            || blob.data.filename !== original.filename || blob.data.byteLength !== original.byteLength || blob.data.blob.size !== original.byteLength
            || blob.data.mediaType !== original.mediaType || blob.data.blob.type !== original.mediaType) throw storageError(null);
          done(new File([blob.data.blob], original.filename, { type: original.mediaType, lastModified: original.lastModified }));
        });
      });
    });
  }
  readSelection(): Promise<string | null> {
    this.check();
    return this.transact(["preferences"], "readonly", (tx, done, watch) => {
      watch(tx.objectStore("preferences").get([this.identity.namespace, "selected-project"]), value => {
        if (value === undefined) { done(null); return; }
        const row = PreferenceRecord.safeParse(value);
        if (!row.success || row.data.namespace !== this.identity.namespace) throw storageError(null);
        const project = this.options.catalog.get(row.data.projectId);
        if (!project) { done(null); return; }
        try { requireFileProjectAccess(this.identity, project); done(project.id); } catch { done(null); }
      });
    });
  }
  saveSelection(projectId: string): Promise<void> {
    this.project(projectId);
    return this.transact(["preferences"], "readwrite", (tx, done, watch) => {
      this.project(projectId);
      watch(tx.objectStore("preferences").put({ namespace: this.identity.namespace, key: "selected-project", projectId }), () => done());
    });
  }
  close(): void {
    if (this.disposed) return;
    this.disposed = true; this.generation++;
    this.cancelOpen?.(); this.cancelOpen = null;
    for (const transaction of this.transactions) { try { transaction.abort(); } catch { /* 이미 종료된 트랜잭션 */ } }
    this.transactions.clear();
    this.connection?.close(); this.connection = null; this.opening = null;
  }
}
