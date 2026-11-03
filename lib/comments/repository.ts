import {
  COMMENT_DB_NAME, COMMENT_DB_VERSION, COMMENT_SURFACE_ID,
  type CommentCommand, type CommentIdentity, type CommentSnapshot, type CommentUser,
} from "@/config/comments";

import { applyCommentCommand, CommentError, validateCommentSnapshot } from "./domain";
import { createCommentSeed } from "./seed";

export interface CommentRepository {
  readExisting?(identity: CommentIdentity): Promise<CommentSnapshot|null>;
  load(identity: CommentIdentity): Promise<CommentSnapshot>;
  execute(identity: CommentIdentity, command: CommentCommand): Promise<CommentSnapshot>;
  close(): void;
}
export interface IndexedDbCommentRepositoryOptions {
  dbName?: string; factory?: IDBFactory; now?: () => string;
}
export interface StoredCommentUser extends CommentUser { namespace: string }

const stores = ["surfaces", "users", "threads", "messages"];
function storageError(error: unknown): CommentError {
  return error instanceof CommentError ? error : new CommentError("storage", "코멘트를 저장하거나 불러오지 못했습니다. 다시 시도해 주세요.", { cause: error });
}
function checkIdentity(identity: CommentIdentity): void {
  if (!identity?.scope?.namespace?.trim() || identity.scope.surfaceId !== COMMENT_SURFACE_ID
    || !identity.actor?.id?.trim() || !identity.actor.name?.trim() || typeof identity.actor.isMock !== "boolean") {
    throw new CommentError("unidentified", "사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
  }
}

export class IndexedDbCommentRepository implements CommentRepository {
  private readonly archiveClosers=new Set<()=>void>();
  private connection: IDBDatabase | null = null;
  private opening: Promise<IDBDatabase> | null = null;
  private cancelOpen: (() => void) | null = null;
  private generation = 0;
  constructor(private readonly options: IndexedDbCommentRepositoryOptions = {}) {}

  private open(): Promise<IDBDatabase> {
    if (this.connection) return Promise.resolve(this.connection);
    if (this.opening) return this.opening;
    const generation = this.generation;
    const promise = new Promise<IDBDatabase>((resolve, reject) => {
      let settled = false;
      const fail = (error: CommentError) => {
        if (settled) return;
        settled = true;
        this.cancelOpen = null;
        reject(error);
      };
      this.cancelOpen = () => fail(new CommentError("storage", "코멘트 저장소 연결을 닫았습니다."));
      let request: IDBOpenDBRequest;
      try {
        const factory = this.options.factory ?? globalThis.indexedDB;
        if (!factory) throw new Error("IndexedDB unavailable");
        request = factory.open(this.options.dbName ?? COMMENT_DB_NAME, COMMENT_DB_VERSION);
      } catch (error) {
        fail(new CommentError("db_unavailable", "이 브라우저에서 코멘트 저장소를 사용할 수 없습니다.", { cause: error }));
        return;
      }
      request.onblocked = () => fail(new CommentError("db_blocked", "다른 탭의 작업 화면을 닫고 다시 불러와 주세요."));
      request.onerror = () => fail(storageError(request.error));
      request.onupgradeneeded = () => {
        if (settled || generation !== this.generation) { request.transaction?.abort(); return; }
        try {
          const db = request.result;
          db.createObjectStore("surfaces", { keyPath: ["namespace", "surfaceId"] });
          const users = db.createObjectStore("users", { keyPath: ["namespace", "id"] });
          users.createIndex("byNamespace", "namespace");
          const threads = db.createObjectStore("threads", { keyPath: ["namespace", "surfaceId", "id"] });
          threads.createIndex("bySurface", ["namespace", "surfaceId"]);
          threads.createIndex("byNumber", ["namespace", "surfaceId", "number"], { unique: true });
          const messages = db.createObjectStore("messages", { keyPath: ["namespace", "surfaceId", "id"] });
          messages.createIndex("bySurface", ["namespace", "surfaceId"]);
          messages.createIndex("byThread", ["namespace", "surfaceId", "threadId"]);
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
    this.archiveClosers.forEach(close=>close());this.archiveClosers.clear();
    this.cancelOpen?.();
    this.cancelOpen = null;
    this.connection?.close();
    this.connection = null;
    this.opening = null;
  }

  load(identity: CommentIdentity): Promise<CommentSnapshot> { return this.transact(identity); }
  async readExisting(identity:CommentIdentity):Promise<CommentSnapshot|null>{
    checkIdentity(identity);const generation=this.generation,factory=this.options.factory??globalThis.indexedDB,name=this.options.dbName??COMMENT_DB_NAME;
    if(!factory)throw new CommentError("db_unavailable","이 브라우저에서 이전 의견 저장소를 사용할 수 없습니다.");
    if(typeof factory.databases==="function"){const list=await factory.databases();if(generation!==this.generation)throw new CommentError("storage","저장소 연결이 종료되었습니다.");if(!list.some(d=>d.name===name))return null;}
    return new Promise((resolve,reject)=>{
      let db:IDBDatabase|null=null,tx:IDBTransaction|null=null,settled=false,missing=false;
      const finish=(value:CommentSnapshot|null,error?:Error)=>{if(settled)return;settled=true;this.archiveClosers.delete(cancel);db?.close();if(error)reject(error);else resolve(value);};
      const cancel=()=>{try{tx?.abort();}catch{/* 이미 종료된 읽기는 닫기만 한다. */}finish(null,new CommentError("storage","저장소 연결이 종료되었습니다."));};
      this.archiveClosers.add(cancel);let request:IDBOpenDBRequest;
      try{request=factory.open(name);}catch(error){finish(null,storageError(error));return;}
      request.onupgradeneeded=event=>{missing=event.oldVersion===0;request.transaction?.abort();};
      request.onerror=()=>{if(missing)finish(null);else finish(null,storageError(request.error));};
      request.onblocked=()=>finish(null,new CommentError("db_blocked","다른 탭을 닫고 이전 의견을 다시 조회해 주세요."));
      request.onsuccess=()=>{
        db=request.result;if(settled||generation!==this.generation){db.close();if(!settled)cancel();return;}
        if(db.version!==COMMENT_DB_VERSION||stores.some(s=>!db!.objectStoreNames.contains(s))){finish(null,new CommentError("invalid","이전 의견 저장소의 버전이나 구조가 예상과 다릅니다."));return;}
        db.onversionchange=cancel;
        try{
          tx=db.transaction(stores,"readonly");let result:CommentSnapshot|null=null,failure:Error|null=null,remaining=4;
          // IndexedDB 외부 데이터 경계는 기존 snapshot 검증기로 좁힌다.
          const values:Record<string,unknown>={},scope=identity.scope,key=[scope.namespace,scope.surfaceId];
          const requests:[string,IDBRequest][]=[["surfaces",tx.objectStore("surfaces").get(key)],["users",tx.objectStore("users").index("byNamespace").getAll(scope.namespace)],["threads",tx.objectStore("threads").index("bySurface").getAll(key)],["messages",tx.objectStore("messages").index("bySurface").getAll(key)]];
          tx.oncomplete=()=>generation===this.generation?finish(result,failure??undefined):cancel();
          tx.onabort=()=>finish(null,failure??storageError(tx?.error));
          tx.onerror=()=>{failure=storageError(tx?.error);};
          for(const [key,req]of requests){req.onerror=()=>{failure=storageError(req.error);};req.onsuccess=()=>{values[key]=req.result;if(--remaining!==0)return;try{
            if(values.surfaces===undefined)return;
            if(!Array.isArray(values.users))throw new CommentError("invalid","이전 의견 참여자 정보가 다릅니다.");
            const users=values.users.map((v:unknown)=>{if(!v||typeof v!=="object"||!("namespace"in v)||v.namespace!==scope.namespace)throw new CommentError("invalid","다른 저장 범위의 참여자입니다.");const {namespace,...user}=v;void namespace;return user;});
            result=validateCommentSnapshot({scope,surface:values.surfaces,users,threads:values.threads,messages:values.messages},scope);
            if(!result.users.some(u=>u.id===identity.actor.id))throw new CommentError("forbidden","본인의 이전 의견만 조회할 수 있습니다.");
          }catch(error){failure=storageError(error);tx?.abort();}};}
        }catch(error){finish(null,storageError(error));}
      };
    });
  }
  execute(identity: CommentIdentity, command: CommentCommand): Promise<CommentSnapshot> { return this.transact(identity, command); }

  private async transact(identity: CommentIdentity, command?: CommentCommand): Promise<CommentSnapshot> {
    checkIdentity(identity);
    const generation = this.generation;
    const db = await this.open();
    if (generation !== this.generation) throw new CommentError("storage", "코멘트 저장소 연결이 변경되었습니다. 다시 시도해 주세요.");
    return new Promise<CommentSnapshot>((resolve, reject) => {
      let transaction: IDBTransaction;
      try { transaction = db.transaction(stores, "readwrite"); } catch (error) { reject(storageError(error)); return; }
      let result: CommentSnapshot | null = null;
      let failure: CommentError | null = null;
      transaction.oncomplete = () => result ? resolve(result) : reject(storageError(null));
      transaction.onabort = () => reject(failure ?? storageError(transaction.error));
      transaction.onerror = () => { failure ??= storageError(transaction.error); };
      const scope = identity.scope;
      const surfaceKey = [scope.namespace, scope.surfaceId];
      const values: Record<string, unknown> = {};
      let remaining = stores.length;
      const abort = (error: unknown) => {
        failure = storageError(error);
        try { transaction.abort(); } catch { reject(failure); }
      };
      const process = () => {
        try {
          const now = (this.options.now ?? (() => new Date().toISOString()))();
          const threadRows = values.threads as unknown[];
          const messageRows = values.messages as unknown[];
          let before: CommentSnapshot | null = null;
          let next: CommentSnapshot;
          if (values.surfaces === undefined) {
            if (threadRows.length || messageRows.length) throw new CommentError("invalid", "저장소의 작업 영역 정보가 올바르지 않습니다.");
            if (command) throw new CommentError("not_found", "코멘트 작업 영역을 먼저 불러와 주세요.");
            next = createCommentSeed(identity, now);
          } else {
            const users = (values.users as unknown[]).map((value) => {
              if (!value || typeof value !== "object" || !("namespace" in value) || value.namespace !== scope.namespace) {
                throw new CommentError("invalid", "저장된 사용자 정보가 올바르지 않습니다.");
              }
              const { namespace: _namespace, ...user } = value as StoredCommentUser;
              void _namespace;
              return user;
            });
            before = validateCommentSnapshot({ scope, surface: values.surfaces, users, threads: threadRows, messages: messageRows }, scope);
            if (!before.users.some((user) => user.id === identity.actor.id)) throw new CommentError("forbidden", "이 작업 영역의 사용자가 아닙니다.");
            next = { ...before, users: before.users.map((user) => user.id === identity.actor.id ? { ...identity.actor } : user) };
            if (command) next = applyCommentCommand(next, identity.actor, command, now);
            next = validateCommentSnapshot(next, scope);
          }
          next.users.sort((a, b) => (a.id === identity.actor.id ? -1 : b.id === identity.actor.id ? 1 : a.id.localeCompare(b.id)));
          next.messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
          const surfaceStore = transaction.objectStore("surfaces");
          if (!before) surfaceStore.add(next.surface);
          else if (JSON.stringify(before.surface) !== JSON.stringify(next.surface)) surfaceStore.put(next.surface);
          for (const user of next.users) {
            const old = before?.users.find((item) => item.id === user.id);
            if (!old || JSON.stringify(old) !== JSON.stringify(user)) transaction.objectStore("users").put({ ...user, namespace: scope.namespace });
          }
          this.writeDiff(transaction.objectStore("threads"), before?.threads ?? [], next.threads, surfaceKey);
          this.writeDiff(transaction.objectStore("messages"), before?.messages ?? [], next.messages, surfaceKey);
          result = next;
        } catch (error) { abort(error); }
      };
      try {
        const requests: [string, IDBRequest][] = [
          ["surfaces", transaction.objectStore("surfaces").get(surfaceKey)],
          ["users", transaction.objectStore("users").index("byNamespace").getAll(scope.namespace)],
          ["threads", transaction.objectStore("threads").index("bySurface").getAll(surfaceKey)],
          ["messages", transaction.objectStore("messages").index("bySurface").getAll(surfaceKey)],
        ];
        for (const [key, request] of requests) {
          request.onerror = () => { failure ??= storageError(request.error); };
          request.onsuccess = () => { values[key] = request.result; if (--remaining === 0) process(); };
        }
      } catch (error) { abort(error); }
    });
  }

  private writeDiff<T extends { id: string }>(store: IDBObjectStore, before: T[], next: T[], scopeKey: string[]): void {
    const old = new Map(before.map((value) => [value.id, value]));
    const remaining = new Set(next.map((value) => value.id));
    for (const value of before) if (!remaining.has(value.id)) store.delete([...scopeKey, value.id]);
    for (const value of next) {
      const previous = old.get(value.id);
      if (!previous) store.add(value);
      else if (JSON.stringify(previous) !== JSON.stringify(value)) store.put(value);
    }
  }
}
