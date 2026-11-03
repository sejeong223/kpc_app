"use client";
import { useState } from "react";
import { DadamButton } from "@/components/ui/DadamControls";
import CommentMessageView from "@/components/comments/CommentMessage";
import type {
  ProjectCommentMessage,
  ProjectCommentThread as Thread,
  WorkspaceOperation,
} from "@/types/workspace-production";
import type { ProjectCommentView } from "@/lib/workspace/production/comment-selectors";
export default function ProjectCommentThread({
  thread,
  capabilities,
  busy,
  onEdit,
  onDelete,
  onReply,
  onStatus,
}: {
  thread: Thread;
  capabilities: ProjectCommentView;
  busy: boolean;
  onEdit(message: ProjectCommentMessage): void;
  onDelete(message: ProjectCommentMessage): void;
  onReply(): void;
  onStatus(operation: WorkspaceOperation): void;
}) {
  const readOnly = capabilities.readonlyThreadIds.includes(thread.id),
    [now] = useState(() => Date.now());
  return (
    <article
      id={"project-comment-" + thread.id}
      className="tw:my-3 tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:p-3"
    >
      <header className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
        <strong className="tw:mr-auto tw:text-sm">
          #{thread.number} · {thread.status === "open" ? "미처리" : "반영 완료"}
        </strong>
        {readOnly ? (
          <span className="tw:text-xs">보관 의견</span>
        ) : (
          capabilities.canResolve && (
            <DadamButton
              size="small"
              disabled={busy}
              onClick={() =>
                onStatus({
                  type: "comment-status",
                  threadId: thread.id,
                  status: thread.status === "open" ? "resolved" : "open",
                  review: capabilities.review,
                })
              }
            >
              {thread.status === "open" ? "반영 완료" : "다시 열기"}
            </DadamButton>
          )
        )}
      </header>
      {thread.carriedFromId && <small>이전 회차에서 이어받은 의견</small>}
      {thread.messages.map((message) => (
        <CommentMessageView
          key={message.id}
          message={{ ...message, deleted: !!message.deletedAt }}
          now={now}
          showActions={capabilities.editableMessageIds.includes(message.id)}
          disabled={busy}
          onEdit={() => onEdit(message)}
          onDelete={() => onDelete(message)}
        />
      ))}
      {!readOnly && thread.status === "open" && (
        <DadamButton size="small" disabled={busy} onClick={onReply}>
          답글
        </DadamButton>
      )}
    </article>
  );
}
