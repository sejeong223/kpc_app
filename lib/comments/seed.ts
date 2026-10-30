import type { CommentIdentity, CommentMessage, CommentSnapshot, CommentUser } from "@/config/comments";

import { validateCommentSnapshot } from "./domain";

export function createCommentSeed(identity: CommentIdentity, now: string): CommentSnapshot {
  const { scope, actor } = identity;
  const kim: CommentUser = { id: "mock:kim-minsu", name: "김민수", isMock: true };
  const lee: CommentUser = { id: "mock:lee-seoyeon", name: "이서연", isMock: true };
  const ago = (minutes: number) => new Date(Date.parse(now) - minutes * 60_000).toISOString();
  const message = (id: string, threadId: string, kind: "root" | "reply", author: CommentUser, text: string, minutes: number, mention?: CommentUser): CommentMessage => ({
    ...scope, id, threadId, kind, authorId: author.id, authorName: author.name, text,
    mentions: mention ? [{ userId: mention.id, name: mention.name, start: 0, end: mention.name.length + 1 }] : [],
    createdAt: ago(minutes), updatedAt: null, revision: 1, isSeed: true,
  });
  return validateCommentSnapshot({
    scope: { ...scope }, surface: { ...scope, seedVersion: 1, nextNumber: 3, createdAt: now },
    users: [...new Map([actor, kim, lee].map((user) => [user.id, { ...user }])).values()],
    threads: [
      { ...scope, id: "seed-thread-open", number: 1, rootMessageId: "seed-message-open", authorId: actor.id,
        xRatio: .25, yRatio: .30, status: "open", createdAt: ago(30), updatedAt: ago(25),
        resolvedAt: null, resolvedBy: null, revision: 1, isSeed: true },
      { ...scope, id: "seed-thread-resolved", number: 2, rootMessageId: "seed-message-resolved", authorId: kim.id,
        xRatio: .68, yRatio: .58, status: "resolved", createdAt: ago(120), updatedAt: ago(30),
        resolvedAt: ago(30), resolvedBy: actor.id, revision: 1, isSeed: true },
    ],
    messages: [
      message("seed-message-open", "seed-thread-open", "root", actor, "제목 문구를 더 간결하게 다듬어 주세요.", 30),
      message("seed-message-resolved", "seed-thread-resolved", "root", kim, "문구 수정 사항을 반영했습니다.", 120),
      message("seed-reply-open", "seed-thread-open", "reply", kim, `@${actor.name} 예시 답글입니다. 이 방향으로 확인하겠습니다.`, 25, actor),
      message("seed-reply-resolved", "seed-thread-resolved", "reply", actor, "@김민수 반영한 내용을 확인했습니다.", 60, kim),
    ],
  }, scope);
}
