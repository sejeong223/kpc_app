import { describe, expect, it, vi } from "vitest";

import type { CommentCommand, CommentIdentity } from "@/config/comments";
import { CommentController } from "@/lib/comments/controller";
import { applyCommentCommand, CommentError, resolveCommentIdentity } from "@/lib/comments/domain";
import { createCommentSeed } from "@/lib/comments/seed";

const identity = resolveCommentIdentity({ authEnabled: false, session: null, displayName: "정소담" })!;
const now = "2026-10-29T03:00:00.000Z";
const text = (value: string) => ({ text: value, mentions: [] });
function deferred() {
  let resolve!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup() {
  let snapshot = createCommentSeed(identity, now), sequence = 0;
  let gate: ReturnType<typeof deferred> | null = null;
  const repo = {
    load: vi.fn(async () => structuredClone(snapshot)),
    execute: vi.fn(async (actor: CommentIdentity, command: CommentCommand) => {
      await gate?.promise;
      snapshot = applyCommentCommand(snapshot, actor.actor, command, now);
      return structuredClone(snapshot);
    }),
    close: vi.fn(),
  };
  const controller = new CommentController({ identity, repositoryFactory: () => repo, createId: () => `test-${++sequence}` });
  return { controller, repo, pause: () => (gate = deferred()),
    external: (command: CommentCommand) => { snapshot = applyCommentCommand(snapshot, identity.actor, command, now); } };
}
const open = "seed-thread-open", resolved = "seed-thread-resolved", root = "seed-message-open";

describe("comment controller lifetime", () => {
  it("publishes stable immutable snapshots and writes nothing while typing", async () => {
    const { controller: c, repo } = setup(), listener = vi.fn();
    const initial = c.getSnapshot(), unsubscribe = c.subscribe(listener);
    expect(c.getSnapshot()).toBe(initial);
    await c.load();
    c.placePin({ xRatio: .4, yRatio: .3 }); c.setDraft("new", text("draft"));
    const old = c.getSnapshot(); c.setDraft("new", text("changed"));
    expect(old.drafts.new.text).toBe("draft");
    expect(repo.execute).not.toHaveBeenCalled();
    expect(c.getSnapshot()).toBe(c.getSnapshot());
    unsubscribe(); listener.mockClear(); c.closePopup(); expect(listener).not.toHaveBeenCalled();
  });
  it("preserves nonempty new/reply/edit drafts and popup size across close and navigation", async () => {
    const { controller: c } = setup(); await c.load();
    c.placePin({ xRatio: .4, yRatio: .3 }); c.setDraft("new", text("draft"));
    c.setDraft(`reply:${open}`, text("reply")); c.startEdit(root); c.setDraft(`edit:${root}`, text("edit"));
    c.setPopupSize({ width: 480, height: 500 }); c.suspendUi(); await c.load();
    expect(Object.keys(c.getSnapshot().drafts)).toHaveLength(3);
    expect(c.getSnapshot().popupSize.width).toBe(480);
    c.togglePinMode(); expect(c.getSnapshot().view).toEqual({ kind: "new" });
    c.startEdit(root); expect(c.getSnapshot().drafts[`edit:${root}`].text).toBe("edit");
    c.cancelEdit(); expect(c.getSnapshot().drafts[`edit:${root}`]).toBeUndefined();
    expect(c.getSnapshot().snapshot!.messages.find(m => m.id === root)!.text).not.toBe("edit");
  });
  it("clears empty pending pins and validates UI targets", async () => {
    const { controller: c } = setup(); await c.load();
    c.placePin({ xRatio: 0, yRatio: 1 }); c.setDraft("new", text("   ")); c.closePopup();
    expect(c.getSnapshot().pendingPoint).toBeNull();
    c.placePin({ xRatio: NaN, yRatio: 0 }); expect(c.getSnapshot().error?.code).toBe("invalid");
    c.startEdit("seed-message-resolved"); expect(c.getSnapshot().error?.code).toBe("forbidden");
    c.openThread("missing"); expect(c.getSnapshot().error?.code).toBe("not_found");
  });
  it("retries loading and deduplicates in-flight loads", async () => {
    const { controller: c, repo } = setup();
    repo.load.mockRejectedValueOnce(new CommentError("db_unavailable", "unavailable"));
    const first = c.load(); expect(c.load()).toBe(first); await first;
    expect(c.getSnapshot().status).toBe("error"); await c.load(); expect(c.getSnapshot().status).toBe("ready");
  });
  it("does not change ownership on a rename and starts a new controller without drafts", async () => {
    const { controller: c } = setup(); await c.load();
    c.updateActor({ ...identity.actor, name: "renamed" }); c.startEdit(root);
    expect(c.getSnapshot().editingMessageId).toBe(root);
    c.updateActor({ ...identity.actor, id: "other" }); expect(c.getSnapshot().error?.code).toBe("unidentified");
    expect(setup().controller.getSnapshot().drafts).toEqual({});
  });
});

describe("comment controller asynchronous mutations", () => {
  it("blocks duplicate submission and reads during writes; clears only the submitted draft", async () => {
    const { controller: c, repo, pause } = setup(); await c.load();
    c.placePin({ xRatio: .2, yRatio: .3 }); c.setDraft("new", text("saved"));
    c.setDraft(`reply:${open}`, text("other")); const gate = pause();
    const saved = c.submitNew(); expect(await c.submitNew()).toMatchObject({ ok: false, code: "busy" });
    await c.load(); expect(repo.load).toHaveBeenCalledTimes(1); expect(repo.execute).toHaveBeenCalledTimes(1);
    gate.resolve(); expect(await saved).toEqual({ ok: true });
    expect(c.getSnapshot().view).toEqual({ kind: "thread", threadId: "test-1" });
    expect(c.getSnapshot().drafts.new).toBeUndefined(); expect(c.getSnapshot().drafts[`reply:${open}`].text).toBe("other");
  });
  it("keeps newer input and the user's current selection", async () => {
    const { controller: c, pause } = setup(); await c.load(); c.openThread(open);
    c.setDraft(`reply:${open}`, text("sent")); const gate = pause(), saved = c.submitReply(open);
    c.setDraft(`reply:${open}`, text("next")); c.openThread(resolved); gate.resolve(); await saved;
    expect(c.getSnapshot().drafts[`reply:${open}`].text).toBe("next");
    expect(c.getSnapshot().view).toEqual({ kind: "thread", threadId: resolved });
  });
  it("preserves the pending point and draft on failure", async () => {
    const { controller: c, pause } = setup(); await c.load();
    c.placePin({ xRatio: .2, yRatio: .3 }); c.setDraft("new", text("retry me"));
    const before = c.getSnapshot(), gate = pause(), saved = c.submitNew();
    gate.reject(new CommentError("storage", "failed")); expect(await saved).toMatchObject({ ok: false, code: "storage" });
    expect(c.getSnapshot().snapshot).toBe(before.snapshot); expect(c.getSnapshot().pendingPoint).toEqual(before.pendingPoint);
    expect(c.getSnapshot().drafts.new.text).toBe("retry me"); expect(c.getSnapshot().busy).toBe(false);
  });
  it.each([false, true])("ignores disposed late responses (failure=%s) and can load again", async failure => {
    const { controller: c, pause, repo } = setup(); await c.load(); c.setDraft(`reply:${open}`, text("sent"));
    const gate = pause(), saved = c.submitReply(open); c.dispose(); const disposed = c.getSnapshot();
    if (failure) gate.reject(new Error("late")); else gate.resolve(); await saved;
    expect(c.getSnapshot()).toBe(disposed); expect(repo.close).toHaveBeenCalledOnce();
    await c.load(); expect(c.getSnapshot().status).toBe("ready");
  });
  it("requires an explicit rebase after an edit conflict and refresh", async () => {
    const { controller: c, external } = setup(); await c.load(); c.startEdit(root); c.setDraft(`edit:${root}`, text("mine"));
    external({ type: "edit-message", messageId: root, expectedRevision: 1, draft: text("elsewhere") });
    expect(await c.saveEdit(root)).toMatchObject({ code: "conflict" }); await c.load();
    expect(c.getSnapshot().drafts[`edit:${root}`]).toMatchObject({ text: "mine", baseRevision: 1 });
    expect(await c.saveEdit(root)).toMatchObject({ code: "conflict" });
    c.rebaseEdit(root); expect(await c.saveEdit(root)).toEqual({ ok: true });
    expect(c.getSnapshot().snapshot!.messages.find(m => m.id === root)!.text).toBe("mine");
  });
  it("preserves a reply through resolution and removes only deleted targets' drafts", async () => {
    const { controller: c } = setup(); await c.load();
    c.setDraft(`reply:${open}`, text("later")); c.setDraft(`reply:${resolved}`, text("keep")); c.startEdit(root);
    await c.setStatus(open, "resolved"); expect(await c.submitReply(open)).toMatchObject({ code: "resolved" });
    expect(c.getSnapshot().drafts[`reply:${open}`].text).toBe("later");
    await c.setStatus(open, "open"); await c.deleteThread(open);
    expect(c.getSnapshot().drafts[`reply:${open}`]).toBeUndefined(); expect(c.getSnapshot().drafts[`edit:${root}`]).toBeUndefined();
    expect(c.getSnapshot().drafts[`reply:${resolved}`].text).toBe("keep"); expect(c.getSnapshot().view).toBeNull();
  });
  it("updates the base of newer edit input without mutating old state", async () => {
    const { controller: c, pause } = setup(); await c.load(); c.startEdit(root); c.setDraft(`edit:${root}`, text("sent"));
    const gate = pause(), saved = c.saveEdit(root); c.setDraft(`edit:${root}`, text("next")); const old = c.getSnapshot();
    gate.resolve(); await saved;
    expect(old.drafts[`edit:${root}`].baseRevision).toBe(1);
    expect(c.getSnapshot().drafts[`edit:${root}`]).toMatchObject({ text: "next", baseRevision: 2 });
  });
});
