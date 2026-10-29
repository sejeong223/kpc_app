import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CommentCommand, CommentIdentity } from "@/config/comments";
import { resolveCommentIdentity } from "@/lib/comments/domain";
import { IndexedDbCommentRepository } from "@/lib/comments/repository";

const now = "2026-10-29T03:00:00.000Z";
const identity = resolveCommentIdentity({ authEnabled: false, session: null, displayName: "정소담" })!;
const repositories: IndexedDbCommentRepository[] = [];
function setup(factory = new IDBFactory()) {
  const repo = new IndexedDbCommentRepository({ factory, dbName: "test-comments", now: () => now });
  repositories.push(repo);
  return { factory, repo };
}
function create(n: number): CommentCommand {
  return { type: "create-thread", threadId: `thread-${n}`, messageId: `message-${n}`, point: { xRatio: .3, yRatio: .7 }, draft: { text: `의견 ${n}`, mentions: [] } };
}
function open(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open("test-comments", 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
afterEach(() => {
  repositories.splice(0).forEach((repo) => repo.close());
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe("native IndexedDB repository", () => {
  it("initializes exactly once even with concurrent connections", async () => {
    const { factory, repo } = setup();
    const other = setup(factory).repo;
    const values = await Promise.all([repo.load(identity), other.load(identity)]);
    expect(values[0]).toEqual(values[1]);
    expect(values[0].threads).toHaveLength(2);
    expect(values[0].messages).toHaveLength(4);
    expect(values[0].users).toHaveLength(3);
  });
  it("persists writing, mentions, edits, location and completion after reopening", async () => {
    const { factory, repo } = setup();
    await repo.load(identity);
    await repo.execute(identity, create(3));
    await repo.execute(identity, { type: "reply", threadId: "thread-3", messageId: "reply", draft: {
      text: "@김민수 확인", mentions: [{ userId: "mock:kim-minsu", name: "김민수", start: 0, end: 4 }],
    } });
    await repo.execute(identity, { type: "edit-message", messageId: "message-3", expectedRevision: 1, draft: { text: "수정한 첫 의견", mentions: [] } });
    await repo.execute(identity, { type: "move-thread", threadId: "thread-3", expectedRevision: 3, point: { xRatio: .9, yRatio: .1 } });
    const saved = await repo.execute(identity, { type: "set-status", threadId: "thread-3", expectedRevision: 4, status: "resolved" });
    repo.close();
    const reopened = setup(factory).repo;
    expect(await reopened.load(identity)).toEqual(saved);
    const restored = await reopened.execute(identity, { type: "set-status", threadId: "thread-3", expectedRevision: 5, status: "open" });
    expect(restored.threads[2]).toMatchObject({ xRatio: .9, yRatio: .1, status: "open", resolvedAt: null });
    expect(restored.messages.find((m) => m.id === "reply")?.mentions).toHaveLength(1);
  });
  it("keeps data unchanged on permission and completed-reply errors", async () => {
    const { repo } = setup();
    const before = await repo.load(identity);
    await expect(repo.execute(identity, { type: "delete-thread", threadId: "seed-thread-resolved", expectedRevision: 1 })).rejects.toMatchObject({ code: "forbidden" });
    await expect(repo.execute(identity, { type: "reply", threadId: "seed-thread-resolved", messageId: "bad", draft: { text: "답글", mentions: [] } })).rejects.toMatchObject({ code: "resolved" });
    expect(await repo.load(identity)).toEqual(before);
    expect((await repo.execute(identity, { type: "move-thread", threadId: "seed-thread-resolved", expectedRevision: 1, point: { xRatio: 0, yRatio: 1 } })).threads[1].xRatio).toBe(0);
  });
  it("deletes replies with the thread and never reseeds an intentionally empty surface", async () => {
    const { factory, repo } = setup();
    const initial = await repo.load(identity);
    await repo.execute(identity, { type: "delete-thread", threadId: "seed-thread-open", expectedRevision: 1 });
    const kim: CommentIdentity = { scope: identity.scope, actor: initial.users.find((u) => u.id === "mock:kim-minsu")! };
    await repo.execute(kim, { type: "delete-thread", threadId: "seed-thread-resolved", expectedRevision: 1 });
    repo.close();
    const reopened = setup(factory).repo;
    const empty = await reopened.load(identity);
    expect(empty.threads).toHaveLength(0); expect(empty.messages).toHaveLength(0);
    expect(empty.surface).toMatchObject({ seedVersion: 1, nextNumber: 3 });
    expect((await reopened.execute(identity, create(3))).threads[0].number).toBe(3);
  });
  it("isolates namespaces and preserves historical author names", async () => {
    const { repo } = setup();
    const other: CommentIdentity = { scope: { ...identity.scope, namespace: "another-account" }, actor: { id: "another-account", name: "다른 사용자", isMock: false } };
    const first = await repo.load(identity);
    const second = await repo.load(other);
    expect(second.threads[0].id).toBe(first.threads[0].id);
    await repo.execute(identity, { type: "delete-thread", threadId: "seed-thread-open", expectedRevision: 1 });
    expect(await repo.load(other)).toEqual(second);
    const renamed = await repo.load({ ...other, actor: { ...other.actor, name: "바뀐 이름" } });
    expect(renamed.users.find((u) => u.id === other.actor.id)?.name).toBe("바뀐 이름");
    expect(renamed.messages.find((m) => m.id === "seed-message-open")?.authorName).toBe("다른 사용자");
  });
  it("serializes concurrent numbering and rejects stale edits", async () => {
    const { factory, repo } = setup();
    const other = setup(factory).repo;
    await repo.load(identity);
    await Promise.all([repo.execute(identity, create(3)), other.execute(identity, create(4))]);
    expect((await repo.load(identity)).threads.map((t) => t.number)).toEqual([1, 2, 3, 4]);
    const results = await Promise.allSettled([repo, other].map((r, index) => r.execute(identity, {
      type: "edit-message", messageId: "seed-message-open", expectedRevision: 1, draft: { text: `수정 ${index}`, mentions: [] },
    })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({ reason: { code: "conflict" } });
  });
  it("rolls back surface and thread when the subsequent message write fails", async () => {
    const { factory, repo } = setup();
    const before = await repo.load(identity);
    const original = IDBObjectStore.prototype.add;
    const spy = vi.spyOn(IDBObjectStore.prototype, "add").mockImplementation(function(this: IDBObjectStore, value, key) {
      if (this.name === "messages") throw new DOMException("write failure", "QuotaExceededError");
      return original.call(this, value, key);
    });
    await expect(repo.execute(identity, create(3))).rejects.toMatchObject({ code: "storage" });
    spy.mockRestore(); repo.close();
    expect(await setup(factory).repo.load(identity)).toEqual(before);
  });
  it("does not overwrite corrupt records with seed data", async () => {
    const { factory, repo } = setup();
    await repo.load(identity);
    const db = await open(factory);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("surfaces", "readwrite");
      tx.objectStore("surfaces").delete([identity.scope.namespace, identity.scope.surfaceId]);
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error);
    });
    db.close();
    await expect(repo.load(identity)).rejects.toMatchObject({ code: "invalid" });
  });
  it("retries after denied opening and handles unavailable browser storage", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await expect(new IndexedDbCommentRepository().load(identity)).rejects.toMatchObject({ code: "db_unavailable" });
    const { factory, repo } = setup();
    vi.spyOn(factory, "open").mockImplementationOnce(() => { throw new DOMException("Denied", "SecurityError"); });
    await expect(repo.load(identity)).rejects.toMatchObject({ code: "db_unavailable" });
    expect((await repo.load(identity)).threads).toHaveLength(2);
  });
  it("rejects cancelled opening, then can reopen cleanly", async () => {
    const { repo } = setup();
    const pending = expect(repo.load(identity)).rejects.toMatchObject({ code: "storage" });
    repo.close();
    await pending;
    expect((await repo.load(identity)).threads).toHaveLength(2);
  });
  it("reports blocked opening and closes a late connection without reusing it", async () => {
    const { factory, repo } = setup();
    const close = vi.fn();
    const request = { onblocked: null, onsuccess: null, onerror: null, onupgradeneeded: null, result: { close } } as unknown as IDBOpenDBRequest;
    vi.spyOn(factory, "open").mockReturnValueOnce(request);
    const rejected = expect(repo.load(identity)).rejects.toMatchObject({ code: "db_blocked" });
    request.onblocked!.call(request, new Event("blocked") as IDBVersionChangeEvent);
    await rejected;
    request.onsuccess!.call(request, new Event("success"));
    expect(close).toHaveBeenCalledOnce();
    expect((await repo.load(identity)).threads).toHaveLength(2);
  });
});
