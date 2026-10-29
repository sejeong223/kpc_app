import type { Session } from "next-auth";
import { describe, expect, it } from "vitest";

import type { CommentCommand, CommentDraft, CommentIdentity } from "@/config/comments";
import { applyCommentCommand, CommentError, getThreadMessages, normalizeCommentDraft, resolveCommentIdentity, validateCommentSnapshot } from "@/lib/comments/domain";
import { createCommentSeed } from "@/lib/comments/seed";

const now = "2026-10-29T03:00:00.000Z";
const identity = resolveCommentIdentity({ authEnabled: false, session: null, displayName: "정소담" })!;
const seed = () => createCommentSeed(identity, now);
const draft = (text = "새 의견"): CommentDraft => ({ text, mentions: [] });
const run = (command: CommentCommand) => applyCommentCommand(seed(), identity.actor, command, now);
function errorCode(action: () => unknown, code: string) {
  try { action(); throw new Error("expected error"); } catch (error) {
    expect(error).toBeInstanceOf(CommentError);
    expect((error as CommentError).code).toBe(code);
  }
}

describe("comment identity and data integrity", () => {
  it("uses stable identity and never includes tokens or preview roles", () => {
    const session: Session = { user: { oid: "oid-1", upn: "USER@example.com", name: "A", roles: [], access_token: "secret" }, expires: "later" };
    const first = resolveCommentIdentity({ authEnabled: true, session, displayName: "A" })!;
    const renamed = resolveCommentIdentity({ authEnabled: true, session, displayName: "B" })!;
    expect(first.actor.id).toBe("entra:oid:oid-1");
    expect(first.scope).toEqual(renamed.scope);
    expect(JSON.stringify(first)).not.toContain("secret");
    expect(resolveCommentIdentity({ authEnabled: true, session: null, displayName: "A" })).toBeNull();
    expect(identity.actor.id).toBe("preview:sodam");
  });
  it.each([
    [{ upn: " A@EXAMPLE.COM " }, "entra:upn:a@example.com"],
    [{ email: " A@EXAMPLE.COM " }, "entra:email:a@example.com"],
  ])("falls back to a canonical identifier", (user, expected) => {
    expect(resolveCommentIdentity({ authEnabled: true, session: { user: { ...user, roles: [] }, expires: "" }, displayName: "" })?.actor.id).toBe(expected);
  });
  it("creates coherent independent seeds and orders first messages before replies", () => {
    const value = seed();
    expect(validateCommentSnapshot(value, identity.scope)).toEqual(value);
    expect(value.threads).toHaveLength(2);
    expect(value.messages).toHaveLength(4);
    expect(value.users).toHaveLength(3);
    expect(getThreadMessages(value, value.threads[0].id).map((m) => m.kind)).toEqual(["root", "reply"]);
    value.messages[0].text = "changed";
    expect(seed().messages[0].text).not.toBe("changed");
  });
  it.each(["scope", "root", "author", "number", "coordinate", "status", "time"])("rejects corrupt %s records", (kind) => {
    const value = seed();
    if (kind === "scope") value.messages[0].namespace = "someone-else";
    if (kind === "root") value.threads[0].rootMessageId = "missing";
    if (kind === "author") value.messages[0].authorId = "unknown";
    if (kind === "number") value.surface.nextNumber = 2;
    if (kind === "coordinate") value.threads[0].xRatio = NaN;
    if (kind === "status") value.threads[0].resolvedAt = now;
    if (kind === "time") value.messages[0].createdAt = "invalid";
    errorCode(() => validateCommentSnapshot(value, identity.scope), "invalid");
  });
});

describe("comment commands", () => {
  it("creates pin and first message together without changing input", () => {
    const before = seed();
    const copy = structuredClone(before);
    const result = applyCommentCommand(before, identity.actor, { type: "create-thread", threadId: "t3", messageId: "m3", point: { xRatio: 1, yRatio: 0 }, draft: draft("  의견  ") }, now);
    expect(before).toEqual(copy);
    expect(result.surface.nextNumber).toBe(4);
    expect(result.threads[2]).toMatchObject({ number: 3, rootMessageId: "m3", authorId: identity.actor.id, status: "open" });
    expect(result.messages.find((m) => m.id === "m3")).toMatchObject({ text: "의견", kind: "root", createdAt: now });
  });
  it("replies, edits and deletes own replies while preserving creation time", () => {
    let value = run({ type: "reply", threadId: "seed-thread-open", messageId: "reply", draft: draft() });
    value = applyCommentCommand(value, identity.actor, { type: "edit-message", messageId: "reply", expectedRevision: 1, draft: draft("수정") }, now);
    expect(value.messages.find((m) => m.id === "reply")).toMatchObject({ text: "수정", createdAt: now, updatedAt: now, revision: 2 });
    value = applyCommentCommand(value, identity.actor, { type: "delete-message", messageId: "reply", expectedRevision: 2 }, now);
    expect(value.messages.some((m) => m.id === "reply")).toBe(false);
    expect(value.threads[0].revision).toBe(4);
  });
  it("allows moving and reopening other authors' completed pins", () => {
    let value = run({ type: "move-thread", threadId: "seed-thread-resolved", expectedRevision: 1, point: { xRatio: .1, yRatio: .8 } });
    expect(value.threads[1]).toMatchObject({ xRatio: .1, yRatio: .8, revision: 2 });
    value = applyCommentCommand(value, identity.actor, { type: "set-status", threadId: "seed-thread-resolved", expectedRevision: 2, status: "open" }, now);
    expect(value.threads[1]).toMatchObject({ status: "open", resolvedAt: null, resolvedBy: null });
    value = applyCommentCommand(value, identity.actor, { type: "set-status", threadId: "seed-thread-resolved", expectedRevision: 3, status: "resolved" }, now);
    expect(value.threads[1].resolvedBy).toBe(identity.actor.id);
  });
  it("blocks replies to completed threads but permits editing own existing comments", () => {
    errorCode(() => run({ type: "reply", threadId: "seed-thread-resolved", messageId: "reply", draft: draft() }), "resolved");
    expect(run({ type: "edit-message", messageId: "seed-reply-resolved", expectedRevision: 1, draft: draft("확인했습니다") }).messages.find((m) => m.id === "seed-reply-resolved")?.text).toBe("확인했습니다");
  });
  it.each<CommentCommand>([
    { type: "edit-message", messageId: "seed-message-resolved", expectedRevision: 1, draft: draft() },
    { type: "delete-message", messageId: "seed-reply-open", expectedRevision: 1 },
    { type: "delete-thread", threadId: "seed-thread-resolved", expectedRevision: 1 },
  ])("rejects another author's content management: $type", (command) => {
    const original = seed();
    const copy = structuredClone(original);
    errorCode(() => applyCommentCommand(original, identity.actor, command, now), "forbidden");
    expect(original).toEqual(copy);
  });
  it("rejects root-only deletion, stale revisions and invalid positions", () => {
    errorCode(() => run({ type: "delete-message", messageId: "seed-message-open", expectedRevision: 1 }), "invalid");
    errorCode(() => run({ type: "edit-message", messageId: "seed-message-open", expectedRevision: 9, draft: draft() }), "conflict");
    for (const coordinate of [-1, 1.1, NaN, Infinity]) {
      errorCode(() => run({ type: "move-thread", threadId: "seed-thread-open", expectedRevision: 1, point: { xRatio: coordinate, yRatio: 0 } }), "invalid");
    }
  });
  it("keeps revision for unchanged edits, positions and status", () => {
    const value = seed();
    expect(applyCommentCommand(value, identity.actor, { type: "edit-message", messageId: value.messages[0].id, expectedRevision: 1, draft: draft(value.messages[0].text) }, now)).toBe(value);
    expect(applyCommentCommand(value, identity.actor, { type: "move-thread", threadId: value.threads[0].id, expectedRevision: 1, point: { xRatio: .25, yRatio: .3 } }, now)).toBe(value);
    expect(applyCommentCommand(value, identity.actor, { type: "set-status", threadId: value.threads[0].id, expectedRevision: 1, status: "open" }, now)).toBe(value);
  });
  it("deletes whole conversations without resetting initialization or numbers", () => {
    let value = run({ type: "delete-thread", threadId: "seed-thread-open", expectedRevision: 1 });
    expect(value.messages).toHaveLength(2);
    const kim: CommentIdentity = { scope: identity.scope, actor: value.users[1] };
    value = applyCommentCommand(value, kim.actor, { type: "delete-thread", threadId: "seed-thread-resolved", expectedRevision: 1 }, now);
    expect(value.threads).toHaveLength(0);
    expect(value.messages).toHaveLength(0);
    expect(value.surface).toMatchObject({ seedVersion: 1, nextNumber: 3 });
  });
});

describe("draft validation", () => {
  it.each(["", " ", "\n\t"])("rejects empty input %j", (text) => errorCode(() => normalizeCommentDraft(draft(text), seed().users), "empty"));
  it("normalizes whitespace and UTF-16 mention ranges", () => {
    const value = { text: "  😀 @김민수 확인  ", mentions: [{ userId: "mock:kim-minsu", name: "김민수", start: 5, end: 9 }] };
    expect(normalizeCommentDraft(value, seed().users)).toEqual({ text: "😀 @김민수 확인", mentions: [{ userId: "mock:kim-minsu", name: "김민수", start: 3, end: 7 }] });
    expect(value.mentions[0].start).toBe(5);
  });
  it("rejects fabricated or overlapping mention metadata", () => {
    const mention = { userId: "mock:kim-minsu", name: "김민수", start: 0, end: 4 };
    for (const mentions of [[{ ...mention, userId: "unknown" }], [mention, mention], [{ ...mention, end: 3 }]]) {
      errorCode(() => normalizeCommentDraft({ text: "@김민수", mentions }, seed().users), "invalid");
    }
  });
});
