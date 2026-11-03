"use client";
import { useState } from "react";
import { DadamButton } from "@/components/ui/DadamControls";
import ModalFrame from "@/components/ui/ModalFrame";
import CommentComposer from "@/components/comments/CommentComposer";
import type { CommentDraft, CommentPoint } from "@/config/comments";
import type {
  ProjectRequest,
  ProjectView,
  WorkspaceOperation,
} from "@/types/workspace-production";
import { useProjectComments } from "@/hooks/workspace/use-project-comments";
import {
  DraftProtection,
  requestFor,
  WorkspaceErrorText,
} from "../../shared/WorkspaceUi";
import ProjectCommentThread from "./ProjectCommentThread";
export interface ProjectCommentsProps {
  view: ProjectView;
  slideId: string;
  snapshotId: string | null;
  initialPoint?: CommentPoint | null;
  initialThreadId?: string | null;
}
interface Compose {
  mode: "new" | "reply" | "edit";
  threadId: string | null;
  messageId: string | null;
  draft: CommentDraft;
  point: CommentPoint | null;
  request: ProjectRequest;
}
export default function ProjectComments({
  view,
  slideId,
  snapshotId,
  initialPoint,
  initialThreadId,
}: ProjectCommentsProps) {
  const comments = useProjectComments(view, slideId, snapshotId),
    [form, setForm] = useState<Compose | null>(() =>
      initialPoint
        ? {
            mode: "new",
            threadId: null,
            messageId: null,
            draft: { text: "", mentions: [] },
            point: initialPoint,
            request: requestFor(view),
          }
        : null,
    ),
    [confirm, setConfirm] = useState<{
      operation: WorkspaceOperation;
      request: ProjectRequest;
    } | null>(null),
    [filter, setFilter] = useState<"all" | "open">("all");
  const mutation = comments.mutation,
    sectionId = view.state.body.slides.find((s) => s.id === slideId)?.sectionId;
  const start = (
    mode: Compose["mode"],
    threadId: string | null,
    messageId: string | null,
    draft: CommentDraft = { text: "", mentions: [] },
  ) => {
    mutation.reset();
    setForm({
      mode,
      threadId,
      messageId,
      draft,
      point: null,
      request: requestFor(view),
    });
  };
  const save = async () => {
    if (!form || !sectionId) return;
    const operation: WorkspaceOperation =
      form.mode === "new"
        ? {
            type: "comment-create",
            sectionId,
            slideId,
            point: form.point,
            draft: form.draft,
            review: comments.review,
          }
        : form.mode === "reply"
          ? {
              type: "comment-reply",
              threadId: form.threadId!,
              draft: form.draft,
              review: comments.review,
            }
          : {
              type: "comment-edit",
              threadId: form.threadId!,
              messageId: form.messageId!,
              draft: form.draft,
              review: comments.review,
            };
    await mutation.mutateAsync({ ...form.request, operation });
    setForm(null);
  };
  const threads = comments.threads.filter(
    (t) =>
      (filter === "all" || t.status === "open") &&
      (!initialThreadId || t.id === initialThreadId),
  );
  return (
    <section aria-label="슬라이드 의견">
      <div className="tw:my-2 tw:flex tw:flex-wrap tw:gap-1">
        <DadamButton
          size="small"
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          전체 {comments.threads.length}
        </DadamButton>
        <DadamButton
          size="small"
          aria-pressed={filter === "open"}
          onClick={() => setFilter("open")}
        >
          미처리 {comments.openCount}
        </DadamButton>
        {comments.canCreate && !form && (
          <DadamButton size="small" onClick={() => start("new", null, null)}>
            {comments.review ? "완성 후 리뷰 작성" : "의견 작성"}
          </DadamButton>
        )}
      </div>
      {comments.review && !comments.readOnly && (
        <p className="tw:text-xs">
          완성 이후의 리뷰는 별도로 기록되며 완성본 의견은 유지됩니다.
        </p>
      )}
      {form && (
        <div className="tw:rounded-lg tw:bg-(--kpc-bg) tw:p-2">
          <p className="tw:text-xs">
            {form.mode === "edit"
              ? "내 의견 수정"
              : form.mode === "reply"
                ? "답글 작성"
                : form.point
                  ? "선택 위치에 의견 작성"
                  : "위치 없는 의견 작성"}
          </p>
          <CommentComposer
            mode={form.mode}
            draft={form.draft}
            users={comments.users}
            disabled={mutation.isPending}
            submitDisabled={!form.draft.text.trim()}
            autoFocus
            onChange={(draft) => setForm({ ...form, draft })}
            onSubmit={() => {
              void save().catch(() => {});
            }}
            onCancel={() => {
              if (!mutation.isPending) setForm(null);
            }}
          />
          <WorkspaceErrorText error={mutation.error} />
        </div>
      )}
      {threads.map((t) => (
        <ProjectCommentThread
          key={t.id}
          thread={t}
          capabilities={comments}
          busy={mutation.isPending || !!form}
          onEdit={(m) =>
            start("edit", t.id, m.id, { text: m.text, mentions: m.mentions })
          }
          onDelete={(m) =>
            setConfirm({
              request: requestFor(view),
              operation: {
                type: "comment-delete",
                threadId: t.id,
                messageId: m.id,
                review: comments.review,
              },
            })
          }
          onReply={() => start("reply", t.id, null)}
          onStatus={(operation) =>
            setConfirm({ operation, request: requestFor(view) })
          }
        />
      ))}
      {!threads.length && !form && <p>이 슬라이드에 표시할 의견이 없습니다.</p>}
      {!form && <WorkspaceErrorText error={mutation.error} />}
      {confirm && (
        <ModalFrame
          open
          title={
            confirm.operation.type === "comment-delete"
              ? "내 의견 삭제"
              : "의견 상태 변경"
          }
          contentKey="comment-action"
          onClose={() => {
            if (!mutation.isPending) setConfirm(null);
          }}
          footer={
            <>
              <DadamButton
                disabled={mutation.isPending}
                onClick={() => setConfirm(null)}
              >
                취소
              </DadamButton>
              <DadamButton
                appearance="primary"
                disabled={mutation.isPending}
                onClick={() => {
                  void mutation
                    .mutateAsync({
                      ...confirm.request,
                      operation: confirm.operation,
                    })
                    .then(() => setConfirm(null))
                    .catch(() => {});
                }}
              >
                확인
              </DadamButton>
            </>
          }
        >
          <p>
            {confirm.operation.type === "comment-delete"
              ? "루트 의견에 답글이 있으면 삭제 표시를 남기고 답글은 유지합니다."
              : "현재 의견의 처리 상태만 변경합니다."}
          </p>
          <WorkspaceErrorText error={mutation.error} />
        </ModalFrame>
      )}
      <DraftProtection
        dirty={!!form && !!form.draft.text.trim()}
        busy={mutation.isPending}
        onSave={save}
        onDiscard={() => setForm(null)}
      />
    </section>
  );
}
