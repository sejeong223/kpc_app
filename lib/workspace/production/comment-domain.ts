import type {
  PreparedWorkspaceOperation,
  ProjectWorkspaceState,
  WorkspaceContext,
} from "@/types/workspace-production";
import { normalizeCommentDraft } from "@/lib/comments/domain";
import type { CommentDraft } from "@/config/comments";
import { workspaceAssert as check, WorkspaceError } from "./errors";
import { isSectionAuthor } from "./permissions";

export function applyProjectComment(
  state: ProjectWorkspaceState,
  operation: PreparedWorkspaceOperation,
  context: WorkspaceContext,
  newId: () => string,
  created: string[],
): void {
  if (!("review" in operation))
    throw new WorkspaceError("VALIDATION", "의견 요청을 확인해 주세요.");
  check(
    operation.review === (state.phase === "completed"),
    "READ_ONLY",
    "이 회차의 의견은 읽기 전용입니다.",
  );
  const rows = operation.review ? state.reviews : state.body.threads,
    actor = context.identity.actor;
  const draft = (value: CommentDraft): CommentDraft => {
    try {
      const normalized = normalizeCommentDraft(
        value,
        context.members.map((m) => ({ id: m.id, name: m.name, isMock: false })),
      );
      check(
        normalized.mentions.every((m) =>
          context.members.some((u) => u.id === m.userId && u.name === m.name),
        ),
        "VALIDATION",
        "멘션 사용자를 다시 선택해 주세요.",
      );
      return normalized;
    } catch (error) {
      throw new WorkspaceError(
        "VALIDATION",
        "의견 본문과 멘션을 확인해 주세요.",
        { cause: error },
      );
    }
  };
  if (operation.type === "comment-create") {
    check(
      state.body.slides.some(
        (s) =>
          s.id === operation.slideId && s.sectionId === operation.sectionId,
      ),
      "NOT_FOUND",
      "의견을 남길 슬라이드가 없습니다.",
    );
    const id = newId(),
      messageId = newId(),
      value = draft(operation.draft);
    const number =
      Math.max(
        state.nextCommentNumber - 1,
        0,
        ...state.body.threads.map((t) => t.number),
        ...state.reviews
          .filter((t) => t.round === state.currentRound)
          .map((t) => t.number),
      ) + 1;
    state.nextCommentNumber = number + 1;
    rows.push({
      id,
      sectionId: operation.sectionId,
      slideId: operation.slideId,
      round: state.currentRound,
      number,
      authorId: actor.id,
      status: "open",
      point: operation.point,
      createdAt: context.now,
      updatedAt: context.now,
      resolvedBy: null,
      resolvedAt: null,
      revision: 1,
      carriedFromId: null,
      messages: [
        {
          ...value,
          id: messageId,
          threadId: id,
          authorId: actor.id,
          authorName: actor.name,
          createdAt: context.now,
          updatedAt: null,
          deletedAt: null,
          revision: 1,
        },
      ],
    });
    created.push(id);
    return;
  }
  const thread = rows.find(
    (t) => t.id === operation.threadId && t.round === state.currentRound,
  );
  check(!!thread, "NOT_FOUND", "현재 회차의 의견이 아닙니다.");
  if (operation.type === "comment-status") {
    check(
      isSectionAuthor(context, state, thread.sectionId),
      "FORBIDDEN",
      "담당자만 의견 처리 상태를 변경할 수 있습니다.",
    );
    thread.status = operation.status;
    thread.resolvedBy = operation.status === "resolved" ? actor.id : null;
    thread.resolvedAt = operation.status === "resolved" ? context.now : null;
  } else {
    check(
      thread.status === "open",
      "READ_ONLY",
      "처리된 의견은 다시 연 뒤 수정해 주세요.",
    );
    if (operation.type === "comment-reply")
      thread.messages.push({
        ...draft(operation.draft),
        id: newId(),
        threadId: thread.id,
        authorId: actor.id,
        authorName: actor.name,
        createdAt: context.now,
        updatedAt: null,
        deletedAt: null,
        revision: 1,
      });
    else if (operation.type === "comment-move") {
      check(
        thread.authorId === actor.id && !thread.messages[0].deletedAt,
        "FORBIDDEN",
        "본인 의견의 핀만 이동할 수 있습니다.",
      );
      thread.point = operation.point;
    } else {
      const messageId = operation.messageId ?? thread.messages[0].id,
        message = thread.messages.find((m) => m.id === messageId);
      check(!!message, "NOT_FOUND", "의견 내용이 없습니다.");
      check(
        message.authorId === actor.id && message.deletedAt === null,
        "FORBIDDEN",
        "본인의 삭제되지 않은 의견만 수정할 수 있습니다.",
      );
      if (operation.type === "comment-edit")
        Object.assign(message, draft(operation.draft), {
          updatedAt: context.now,
          revision: message.revision + 1,
        });
      else if (message === thread.messages[0]) {
        if (thread.messages.length === 1) rows.splice(rows.indexOf(thread), 1);
        else
          Object.assign(message, {
            text: "삭제된 의견입니다.",
            mentions: [],
            deletedAt: context.now,
            updatedAt: context.now,
            revision: message.revision + 1,
          });
      } else
        thread.messages = thread.messages.filter((m) => m.id !== message.id);
    }
  }
  thread.revision++;
  thread.updatedAt = context.now;
}
