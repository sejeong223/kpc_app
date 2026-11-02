import { RFP_DB_NAME, RFP_DB_VERSION } from "@/config/rfp-register";

import { RfpError } from "./errors";
import type { RfpIdentity } from "./identity";
import { RfpRecordSchema, type RfpRecord } from "./schemas";

export interface RfpRepository {
  list(identity: RfpIdentity): Promise<RfpRecord[]>;
  create(identity: RfpIdentity, record: RfpRecord): Promise<RfpRecord>;
  close(): void;
}
export interface IndexedDbRfpRepositoryOptions { dbName?: string; factory?: IDBFactory }

const STORE = "rfps";
function storageError(error: unknown): RfpError {
  return error instanceof RfpError ? error : new RfpError("storage", "RFP를 저장하거나 불러오지 못했습니다. 다시 시도해 주세요.", { cause: error });
}
function checkIdentity(identity: RfpIdentity): void {
  if (!identity?.namespace?.trim() || !identity.actor?.id?.trim()) {
    throw new RfpError("unidentified", "사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
  }
}

export class IndexedDbRfpRepository implements RfpRepository {
  private connection: IDBDatabase | null = null;
  private opening: Promise<IDBDatabase> | null = null;
  private cancelOpen: (() => void) | null = null;
  private generation = 0;
  constructor(private readonly options: IndexedDbRfpRepositoryOptions = {}) {}

  private open(): Promise<IDBDatabase> {
    if (this.connection) return Promise.resolve(this.connection);
    if (this.opening) return this.opening;
    const generation = this.generation;
    const promise = new Promise<IDBDatabase>((resolve, reject) => {
      let settled = false;
      const fail = (error: RfpError) => {
        if (settled) return;
        settled = true;
        this.cancelOpen = null;
        reject(error);
      };
      this.cancelOpen = () => fail(new RfpError("storage", "RFP 저장소 연결을 닫았습니다."));
      let request: IDBOpenDBRequest;
      try {
        const factory = this.options.factory ?? globalThis.indexedDB;
        if (!factory) throw new Error("IndexedDB unavailable");
        request = factory.open(this.options.dbName ?? RFP_DB_NAME, RFP_DB_VERSION);
      } catch (error) {
        fail(new RfpError("db_unavailable", "이 브라우저에서 RFP 저장소를 사용할 수 없습니다.", { cause: error }));
        return;
      }
      request.onblocked = () => fail(new RfpError("db_blocked", "다른 탭의 RFP 등록 화면을 닫고 다시 시도해 주세요."));
      request.onerror = () => fail(storageError(request.error));
      request.onupgradeneeded = () => {
        if (settled || generation !== this.generation) { request.transaction?.abort(); return; }
        try {
          const store = request.result.createObjectStore(STORE, { keyPath: ["namespace", "id"] });
          store.createIndex("byNamespace", "namespace");
        } catch (error) {
          fail(storageError(error)); request.transaction?.abort();
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        if (settled || generation !== this.generation) { db.close(); return; }
        settled = true;
        this.cancelOpen = null;
        this.connection = db;
        db.onversionchange = () => { if (this.connection === db) this.close(); else db.close(); };
        db.onclose = () => { if (this.connection === db) { this.connection = null; this.opening = null; } };
        resolve(db);
      };
    });
    const pending = promise.catch((error: unknown) => {
      if (this.opening === pending) this.opening = null;
      throw error;
    });
    this.opening = pending;
    return pending;
  }

  close(): void {
    this.generation++;
    this.cancelOpen?.();
    this.cancelOpen = null;
    this.connection?.close();
    this.connection = null;
    this.opening = null;
  }

  private async transaction(mode: IDBTransactionMode): Promise<IDBTransaction> {
    const generation = this.generation;
    const db = await this.open();
    if (generation !== this.generation) throw new RfpError("storage", "RFP 저장소 연결이 변경되었습니다. 다시 시도해 주세요.");
    try { return db.transaction(STORE, mode); } catch (error) { throw storageError(error); }
  }

  async list(identity: RfpIdentity): Promise<RfpRecord[]> {
    checkIdentity(identity);
    const transaction = await this.transaction("readonly");
    return new Promise<RfpRecord[]>((resolve, reject) => {
      let rows: unknown[] = [];
      transaction.oncomplete = () => {
        // 손상된 행 하나 때문에 목록 전체가 막히지 않도록 형식이 맞는 행만 돌려준다.
        const records = rows.flatMap((row) => { const parsed = RfpRecordSchema.safeParse(row); return parsed.success ? [parsed.data] : []; });
        resolve(records.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0)));
      };
      transaction.onabort = () => reject(storageError(transaction.error));
      try {
        const request = transaction.objectStore(STORE).index("byNamespace").getAll(identity.namespace);
        request.onsuccess = () => { rows = request.result; };
      } catch (error) {
        reject(storageError(error));
        try { transaction.abort(); } catch { /* 이미 끝난 트랜잭션 */ }
      }
    });
  }

  async create(identity: RfpIdentity, record: RfpRecord): Promise<RfpRecord> {
    checkIdentity(identity);
    if (record.namespace !== identity.namespace) throw new RfpError("forbidden", "다른 사용자의 저장 공간에는 등록할 수 없습니다.");
    const parsed = RfpRecordSchema.safeParse(record);
    if (!parsed.success) throw new RfpError("invalid", "필수 항목을 확인해 주세요.", { cause: parsed.error });
    const transaction = await this.transaction("readwrite");
    return new Promise<RfpRecord>((resolve, reject) => {
      let failure: RfpError | null = null;
      transaction.oncomplete = () => resolve(parsed.data);
      transaction.onabort = () => reject(failure ?? storageError(transaction.error));
      try {
        const request = transaction.objectStore(STORE).add(parsed.data);
        request.onerror = () => {
          failure = request.error?.name === "ConstraintError"
            ? new RfpError("conflict", "이미 등록된 RFP입니다.", { cause: request.error })
            : storageError(request.error);
        };
      } catch (error) {
        reject(storageError(error));
        try { transaction.abort(); } catch { /* 이미 끝난 트랜잭션 */ }
      }
    });
  }
}
