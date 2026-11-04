"use client";
import { useState } from "react";
import { DadamButton } from "@/components/ui/DadamControls";
import ModalFrame from "@/components/ui/ModalFrame";
import { useLegacyCommentIdentity } from "@/components/comments/CommentsProvider";
import CommentMessageView from "@/components/comments/CommentMessage";
import { useLegacyComments } from "@/hooks/workspace/use-legacy-comments";
import type { CommentIdentity, CommentSnapshot } from "@/config/comments";
import { WorkspaceErrorText } from "../../shared/WorkspaceUi";
export function LegacyArchiveContent({
  snapshot,
}: {
  snapshot: CommentSnapshot | null;
}) {
  const [now] = useState(() => Date.now());
  return snapshot ? (
    <>
      <p>
        이전 작업 화면의 의견입니다. 프로젝트나 슬라이드로 자동 연결하지
        않습니다.
      </p>
      {snapshot.threads.map((t) => (
        <section key={t.id}>
          <h3 className="tw:text-sm">
            의견 #{t.number} · {t.status === "open" ? "미처리" : "반영 완료"}
          </h3>
          {snapshot.messages
            .filter((m) => m.threadId === t.id)
            .map((m) => (
              <CommentMessageView
                key={m.id}
                message={m}
                now={now}
                showActions={false}
                disabled
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ))}
        </section>
      ))}
    </>
  ) : (
    <p>보관된 이전 의견이 없습니다.</p>
  );
}
function ExistingArchive({
  identity,
  onClose,
}: {
  identity: CommentIdentity;
  onClose(): void;
}) {
  const query = useLegacyComments(identity, true);
  return (
    <ModalFrame
      open
      title="이전 의견 보관함"
      subtitle="읽기 전용"
      contentKey={identity.scope.namespace}
      width={780}
      onClose={onClose}
      footer={<DadamButton onClick={onClose}>닫기</DadamButton>}
    >
      {query.isPending ? (
        <p>이전 의견을 확인하고 있습니다.</p>
      ) : query.error ? (
        <>
          <WorkspaceErrorText error={query.error} />
          <DadamButton
            onClick={() => {
              void query.refetch();
            }}
          >
            다시 조회
          </DadamButton>
        </>
      ) : (
        <LegacyArchiveContent snapshot={query.data ?? null} />
      )}
    </ModalFrame>
  );
}
export default function LegacyCommentsArchive() {
  const identity = useLegacyCommentIdentity(),
    [open, setOpen] = useState(false);
  return identity ? (
    <>
      <DadamButton onClick={() => setOpen(true)}>이전 의견</DadamButton>
      {open && (
        <ExistingArchive
          key={identity.scope.namespace + identity.actor.id}
          identity={identity}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  ) : null;
}
