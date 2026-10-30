import type { Session } from "next-auth";
import { z } from "zod";

import {
  COMMENT_SURFACE_ID, type CommentCommand, type CommentDraft, type CommentErrorCode,
  type CommentIdentity, type CommentMessage, type CommentScope, type CommentSnapshot,
  type CommentThread, type CommentUser,
} from "@/config/comments";
import { PROFILE_PREVIEW_USER } from "@/config/profile-preview";

export class CommentError extends Error {
  constructor(readonly code: CommentErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CommentError";
  }
}

const id = z.string().trim().min(1);
const integer = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const timestamp = z.string().datetime();
const scopeFields = { namespace: id, surfaceId: z.literal(COMMENT_SURFACE_ID) };
const scopeSchema = z.object(scopeFields).strict();
const userSchema = z.object({ id, name: id, isMock: z.boolean() }).strict();
const pointFields = { xRatio: z.number().min(0).max(1), yRatio: z.number().min(0).max(1) };
const mentionSchema = z.object({
  userId: id, name: id, start: z.number().int().nonnegative(), end: integer,
}).strict();
const draftSchema = z.object({ text: z.string(), mentions: z.array(mentionSchema) }).strict();
const snapshotSchema = z.object({
  scope: scopeSchema,
  surface: z.object({ ...scopeFields, seedVersion: z.literal(1), nextNumber: integer, createdAt: timestamp }).strict(),
  users: z.array(userSchema),
  threads: z.array(z.object({
    ...scopeFields, ...pointFields, id, number: integer, rootMessageId: id, authorId: id,
    status: z.enum(["open", "resolved"]), createdAt: timestamp, updatedAt: timestamp,
    resolvedAt: timestamp.nullable(), resolvedBy: id.nullable(), revision: integer, isSeed: z.boolean(),
  }).strict()),
  messages: z.array(z.object({
    ...scopeFields, id, threadId: id, kind: z.enum(["root", "reply"]), authorId: id,
    authorName: id, text: z.string(), mentions: z.array(mentionSchema), createdAt: timestamp,
    updatedAt: timestamp.nullable(), revision: integer, isSeed: z.boolean(),
  }).strict()),
}).strict();
const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create-thread"), threadId: id, messageId: id, point: z.object(pointFields).strict(), draft: draftSchema }).strict(),
  z.object({ type: z.literal("reply"), threadId: id, messageId: id, draft: draftSchema }).strict(),
  z.object({ type: z.literal("edit-message"), messageId: id, expectedRevision: integer, draft: draftSchema }).strict(),
  z.object({ type: z.literal("delete-message"), messageId: id, expectedRevision: integer }).strict(),
  z.object({ type: z.literal("delete-thread"), threadId: id, expectedRevision: integer }).strict(),
  z.object({ type: z.literal("move-thread"), threadId: id, expectedRevision: integer, point: z.object(pointFields).strict() }).strict(),
  z.object({ type: z.literal("set-status"), threadId: id, expectedRevision: integer, status: z.enum(["open", "resolved"]) }).strict(),
]);

function invalid(message = "코멘트 데이터가 올바르지 않습니다."): never {
  throw new CommentError("invalid", message);
}

export function resolveCommentIdentity({ authEnabled, session, displayName }: {
  authEnabled: boolean; session: Session | null; displayName: string;
}): CommentIdentity | null {
  if (!authEnabled) return {
    scope: { namespace: "preview:sodam", surfaceId: COMMENT_SURFACE_ID },
    actor: { id: "preview:sodam", name: displayName.trim() || PROFILE_PREVIEW_USER.name, isMock: true },
  };
  const user = session?.user;
  const oid = user?.oid?.trim();
  const upn = user?.upn?.trim().toLowerCase();
  const email = user?.email?.trim().toLowerCase();
  const actorId = oid ? `entra:oid:${oid}` : upn ? `entra:upn:${upn}` : email ? `entra:email:${email}` : null;
  return actorId ? {
    scope: { namespace: actorId, surfaceId: COMMENT_SURFACE_ID },
    actor: { id: actorId, name: displayName.trim() || "사용자", isMock: false },
  } : null;
}

export function normalizeCommentDraft(draft: CommentDraft, users: readonly CommentUser[]): CommentDraft {
  const parsed = draftSchema.safeParse(draft);
  if (!parsed.success) invalid("본문과 멘션 정보를 확인해 주세요.");
  const text = parsed.data.text.trim();
  if (!text) throw new CommentError("empty", "의견 내용을 입력하세요.");
  const leading = parsed.data.text.length - parsed.data.text.trimStart().length;
  const mentions = parsed.data.mentions.map((m) => ({ ...m, start: m.start - leading, end: m.end - leading }))
    .sort((a, b) => a.start - b.start);
  let lastEnd = 0;
  for (const m of mentions) {
    if (m.start < lastEnd || m.end <= m.start || m.end > text.length
      || !users.some((u) => u.id === m.userId) || text.slice(m.start, m.end) !== `@${m.name}`) {
      invalid("멘션을 다시 선택해 주세요.");
    }
    lastEnd = m.end;
  }
  return { text, mentions };
}

export function validateCommentSnapshot(value: unknown, scope: CommentScope): CommentSnapshot {
  const parsed = snapshotSchema.safeParse(value);
  if (!parsed.success || !scopeSchema.safeParse(scope).success) invalid();
  const result = parsed.data;
  const sameScope = (item: CommentScope) => item.namespace === scope.namespace && item.surfaceId === scope.surfaceId;
  if (!sameScope(result.scope) || !sameScope(result.surface)
    || !result.threads.every(sameScope) || !result.messages.every(sameScope)) invalid("다른 작업 영역의 코멘트입니다.");
  const users = new Set(result.users.map((u) => u.id));
  const threads = new Map(result.threads.map((t) => [t.id, t]));
  const messages = new Map(result.messages.map((m) => [m.id, m]));
  if (users.size !== result.users.length || threads.size !== result.threads.length
    || messages.size !== result.messages.length || new Set(result.threads.map((t) => t.number)).size !== threads.size) invalid();
  for (const thread of result.threads) {
    const root = messages.get(thread.rootMessageId);
    if (!users.has(thread.authorId) || !root || root.kind !== "root" || root.threadId !== thread.id
      || root.authorId !== thread.authorId || result.messages.filter((m) => m.threadId === thread.id && m.kind === "root").length !== 1
      || thread.number >= result.surface.nextNumber || thread.updatedAt < thread.createdAt) invalid();
    if (thread.status === "open" ? thread.resolvedAt !== null || thread.resolvedBy !== null
      : !thread.resolvedAt || !thread.resolvedBy || !users.has(thread.resolvedBy)
        || thread.resolvedAt < thread.createdAt || thread.resolvedAt > thread.updatedAt) invalid();
  }
  for (const message of result.messages) {
    const thread = threads.get(message.threadId);
    if (!thread || !users.has(message.authorId) || message.createdAt < thread.createdAt
      || (message.updatedAt !== null && message.updatedAt < message.createdAt)) invalid();
    const normalized = normalizeCommentDraft({ text: message.text, mentions: message.mentions }, result.users);
    if (normalized.text !== message.text || JSON.stringify(normalized.mentions) !== JSON.stringify(message.mentions)) invalid();
  }
  result.threads.sort((a, b) => a.number - b.number);
  return result;
}

export function canEditComment(message: CommentMessage, actorId: string): boolean { return message.authorId === actorId; }
export function canManageThread(thread: CommentThread, actorId: string): boolean { return thread.authorId === actorId; }
export function getThreadMessages(snapshot: CommentSnapshot, threadId: string): CommentMessage[] {
  return snapshot.messages.filter((m) => m.threadId === threadId).sort((a, b) =>
    (a.kind === b.kind ? 0 : a.kind === "root" ? -1 : 1) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function applyCommentCommand(snapshot: CommentSnapshot, actor: CommentUser, input: CommentCommand, now: string): CommentSnapshot {
  const next = validateCommentSnapshot(snapshot, snapshot.scope);
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success || !timestamp.safeParse(now).success || !userSchema.safeParse(actor).success) invalid();
  if (!next.users.some((u) => u.id === actor.id)) throw new CommentError("forbidden", "이 작업 영역의 사용자가 아닙니다.");
  const command = parsed.data;
  const findThread = (threadId: string) => {
    const thread = next.threads.find((t) => t.id === threadId);
    if (!thread) throw new CommentError("not_found", "코멘트를 찾을 수 없습니다. 다시 불러와 주세요.");
    return thread;
  };
  const revision = (actual: number, expected: number) => {
    if (actual !== expected) throw new CommentError("conflict", "코멘트가 변경되었습니다. 최신 내용을 불러와 확인해 주세요.");
  };
  const own = (allowed: boolean) => { if (!allowed) throw new CommentError("forbidden", "본인이 작성한 의견만 수정하거나 삭제할 수 있습니다."); };
  const touch = (thread: CommentThread) => {
    if (now < thread.updatedAt || thread.revision >= Number.MAX_SAFE_INTEGER) invalid();
    thread.updatedAt = now; thread.revision += 1;
  };
  const message = (messageId: string, threadId: string, kind: "root" | "reply", draft: CommentDraft): CommentMessage => ({
    ...next.scope, ...normalizeCommentDraft(draft, next.users), id: messageId, threadId, kind,
    authorId: actor.id, authorName: actor.name, createdAt: now, updatedAt: null, revision: 1, isSeed: false,
  });
  if (command.type === "create-thread") {
    if (next.threads.some((t) => t.id === command.threadId) || next.messages.some((m) => m.id === command.messageId)
      || next.surface.nextNumber >= Number.MAX_SAFE_INTEGER) invalid();
    const root = message(command.messageId, command.threadId, "root", command.draft);
    next.threads.push({ ...next.scope, ...command.point, id: command.threadId, number: next.surface.nextNumber++,
      rootMessageId: root.id, authorId: actor.id, status: "open", createdAt: now, updatedAt: now,
      resolvedAt: null, resolvedBy: null, revision: 1, isSeed: false });
    next.messages.push(root);
  } else if (command.type === "reply") {
    const thread = findThread(command.threadId);
    if (thread.status === "resolved") throw new CommentError("resolved", "다시 열기를 누른 후 답글을 남겨 주세요.");
    if (next.messages.some((m) => m.id === command.messageId)) invalid();
    next.messages.push(message(command.messageId, thread.id, "reply", command.draft));
    touch(thread);
  } else if (command.type === "edit-message" || command.type === "delete-message") {
    const current = next.messages.find((m) => m.id === command.messageId);
    if (!current) throw new CommentError("not_found", "의견을 찾을 수 없습니다. 다시 불러와 주세요.");
    own(canEditComment(current, actor.id)); revision(current.revision, command.expectedRevision);
    const thread = findThread(current.threadId);
    if (command.type === "delete-message") {
      if (current.kind !== "reply") invalid("첫 의견은 대화 전체 삭제를 이용해 주세요.");
      next.messages = next.messages.filter((m) => m.id !== current.id);
    } else {
      const draft = normalizeCommentDraft(command.draft, next.users);
      if (draft.text === current.text && JSON.stringify(draft.mentions) === JSON.stringify(current.mentions)) return snapshot;
      if (current.revision >= Number.MAX_SAFE_INTEGER) invalid();
      Object.assign(current, draft, { updatedAt: now, revision: current.revision + 1 });
    }
    touch(thread);
  } else {
    const thread = findThread(command.threadId);
    if (command.type === "delete-thread") own(canManageThread(thread, actor.id));
    revision(thread.revision, command.expectedRevision);
    if (command.type === "delete-thread") {
      next.threads = next.threads.filter((t) => t.id !== thread.id);
      next.messages = next.messages.filter((m) => m.threadId !== thread.id);
    } else if (command.type === "move-thread") {
      if (thread.xRatio === command.point.xRatio && thread.yRatio === command.point.yRatio) return snapshot;
      Object.assign(thread, command.point); touch(thread);
    } else {
      if (thread.status === command.status) return snapshot;
      thread.status = command.status;
      thread.resolvedAt = command.status === "resolved" ? now : null;
      thread.resolvedBy = command.status === "resolved" ? actor.id : null;
      touch(thread);
    }
  }
  return validateCommentSnapshot(next, next.scope);
}
