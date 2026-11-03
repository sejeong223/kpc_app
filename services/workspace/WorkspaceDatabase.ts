import { WorkspaceError } from "@/lib/workspace/production/errors";
import { WorkspaceFileError } from "@/lib/workspace/files/errors";

export type WatchRequest = <T>(
  request: IDBRequest<T>,
  receive: (value: T) => void,
) => void;
export function workspaceStorageError(error: Error | null): WorkspaceError {
  if (error instanceof WorkspaceError) return error;
  if (error instanceof WorkspaceFileError)
    return new WorkspaceError(
      error.code === "UNIDENTIFIED" ? "FORBIDDEN" : error.code,
      error.message,
      { cause: error },
    );
  return new WorkspaceError(
    error?.name === "QuotaExceededError" ? "QUOTA" : "STORAGE",
    error?.name === "QuotaExceededError"
      ? "브라우저 저장 공간이 부족합니다."
      : "프로젝트를 저장하거나 불러오지 못했습니다.",
    { cause: error },
  );
}
const cancelled = () =>
  new WorkspaceError(
    "CANCELLED",
    "저장소 연결이 변경되었습니다. 다시 불러와 주세요.",
  );
export class WorkspaceDatabase {
  private connection: IDBDatabase | null = null;
  private opening: Promise<IDBDatabase> | null = null;
  private cancelOpen: (() => void) | null = null;
  private readonly transactions = new Set<IDBTransaction>();
  private disposed = false;
  constructor(
    private readonly options: { factory?: IDBFactory; dbName?: string } = {},
  ) {}
  private open(): Promise<IDBDatabase> {
    if (this.disposed) return Promise.reject(cancelled());
    if (this.connection) return Promise.resolve(this.connection);
    if (this.opening) return this.opening;
    const promise = new Promise<IDBDatabase>((resolve, reject) => {
      let settled = false;
      const fail = (error: WorkspaceError) => {
        if (!settled) {
          settled = true;
          this.cancelOpen = null;
          reject(error);
        }
      };
      this.cancelOpen = () => fail(cancelled());
      let request: IDBOpenDBRequest;
      try {
        const factory = this.options.factory ?? globalThis.indexedDB;
        if (!factory)
          throw new WorkspaceError(
            "DB_UNAVAILABLE",
            "이 브라우저에서 저장소를 사용할 수 없습니다.",
          );
        request = factory.open(this.options.dbName ?? "kpc-workspace-files", 2);
      } catch (error) {
        fail(
          error instanceof WorkspaceError
            ? error
            : new WorkspaceError("DB_UNAVAILABLE", "저장소를 열 수 없습니다."),
        );
        return;
      }
      request.onerror = () => fail(workspaceStorageError(request.error));
      request.onblocked = () =>
        fail(
          new WorkspaceError(
            "DB_BLOCKED",
            "다른 탭의 작업 화면을 닫고 다시 연결해 주세요.",
          ),
        );
      request.onupgradeneeded = () => {
        if (settled || this.disposed) {
          request.transaction?.abort();
          return;
        }
        try {
          const db = request.result;
          if (!db.objectStoreNames.contains("projects"))
            db.createObjectStore("projects", {
              keyPath: ["namespace", "projectId"],
            }).createIndex("byNamespace", "namespace");
          if (!db.objectStoreNames.contains("blobs"))
            db.createObjectStore("blobs", {
              keyPath: ["namespace", "projectId", "id"],
            }).createIndex("byProject", ["namespace", "projectId"]);
          if (!db.objectStoreNames.contains("preferences"))
            db.createObjectStore("preferences", {
              keyPath: ["namespace", "key"],
            });
          if (!db.objectStoreNames.contains("workspaces"))
            db.createObjectStore("workspaces", {
              keyPath: ["namespace", "projectId"],
            }).createIndex("byNamespace", "namespace");
          if (!db.objectStoreNames.contains("workspaceBlobs"))
            db.createObjectStore("workspaceBlobs", {
              keyPath: ["namespace", "projectId", "id"],
            }).createIndex("byProject", ["namespace", "projectId"]);
        } catch (error) {
          fail(workspaceStorageError(error instanceof Error ? error : null));
          request.transaction?.abort();
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        if (settled || this.disposed) {
          db.close();
          return;
        }
        settled = true;
        this.cancelOpen = null;
        this.connection = db;
        db.onversionchange = () => this.close();
        db.onclose = () => {
          if (this.connection === db) this.close();
        };
        resolve(db);
      };
    });
    const pending = promise.catch((error) => {
      if (this.opening === pending) this.opening = null;
      throw workspaceStorageError(error instanceof Error ? error : null);
    });
    this.opening = pending;
    return pending;
  }
  async transact<T>(
    stores: readonly string[],
    mode: IDBTransactionMode,
    run: (
      tx: IDBTransaction,
      done: (result: T) => void,
      watch: WatchRequest,
    ) => void,
    signal?: AbortSignal,
  ): Promise<T> {
    if (signal?.aborted || this.disposed) throw cancelled();
    const db = await this.open();
    if (signal?.aborted || this.disposed) throw cancelled();
    return new Promise<T>((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = db.transaction([...stores], mode);
      } catch (error) {
        reject(workspaceStorageError(error instanceof Error ? error : null));
        return;
      }
      this.transactions.add(tx);
      let result: { value: T } | null = null,
        failure: WorkspaceError | null = null,
        aborting = false;
      const abort = (error: Error | null) => {
        if (aborting) return;
        aborting = true;
        failure ??= workspaceStorageError(error);
        try {
          tx.abort();
        } catch {
          cleanup();
          reject(failure);
        }
      };
      const cancel = () => abort(cancelled());
      const cleanup = () => {
        this.transactions.delete(tx);
        signal?.removeEventListener("abort", cancel);
      };
      signal?.addEventListener("abort", cancel, { once: true });
      const watch: WatchRequest = (request, receive) => {
        request.onerror = (event) => {
          event.preventDefault();
          abort(request.error);
        };
        request.onsuccess = () => {
          if (aborting) return;
          try {
            if (signal?.aborted || this.disposed) throw cancelled();
            receive(request.result);
          } catch (error) {
            abort(error instanceof Error ? error : null);
          }
        };
      };
      tx.oncomplete = () => {
        cleanup();
        if (signal?.aborted || this.disposed) reject(cancelled());
        else if (result) resolve(result.value);
        else reject(workspaceStorageError(null));
      };
      tx.onabort = () => {
        cleanup();
        reject(
          signal?.aborted || this.disposed
            ? cancelled()
            : (failure ?? workspaceStorageError(tx.error)),
        );
      };
      tx.onerror = () => {
        failure ??= workspaceStorageError(tx.error);
      };
      try {
        run(
          tx,
          (value) => {
            result = { value };
          },
          watch,
        );
      } catch (error) {
        abort(error instanceof Error ? error : null);
      }
    });
  }
  close(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelOpen?.();
    this.cancelOpen = null;
    for (const tx of this.transactions) {
      try {
        tx.abort();
      } catch {
        /* 완료된 트랜잭션 */
      }
    }
    this.transactions.clear();
    this.connection?.close();
    this.connection = null;
    this.opening = null;
  }
}
