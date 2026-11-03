"use client";
import ModalFrame from "@/components/ui/ModalFrame";
import { DadamButton } from "@/components/ui/DadamControls";
import type { selectDeletionImpact } from "@/lib/workspace/production/selectors";
import { WorkspaceErrorText } from "./WorkspaceUi";
export default function WorkspaceDeleteDialog({
  open,
  title,
  impact,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  impact: ReturnType<typeof selectDeletionImpact>;
  busy: boolean;
  error: string | null;
  onConfirm(): void;
  onClose(): void;
}) {
  return (
    <ModalFrame
      open={open}
      title={title + " 삭제"}
      contentKey={title}
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          <DadamButton disabled={busy} onClick={onClose}>
            취소
          </DadamButton>
          <DadamButton
            appearance="primary"
            disabled={busy || impact.blocked}
            onClick={onConfirm}
          >
            삭제
          </DadamButton>
        </>
      }
    >
      <p>
        소목차 {impact.sectionIds.length}개 · 슬라이드 {impact.slideIds.length}
        개 · 미처리 의견 {impact.openComments}개에 영향을 줍니다.
      </p>
      <p>삭제 후 15초 안에, 다른 변경 전까지 되돌릴 수 있습니다.</p>
      {impact.reasons.map((r) => (
        <p key={r}>{r}</p>
      ))}
      <WorkspaceErrorText error={error} />
    </ModalFrame>
  );
}
