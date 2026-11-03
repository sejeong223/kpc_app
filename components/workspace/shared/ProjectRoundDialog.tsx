"use client";
import { useState } from "react";
import ModalFrame from "@/components/ui/ModalFrame";
import { DadamButton, DadamCheckbox } from "@/components/ui/DadamControls";
import type { ProjectView } from "@/types/workspace-production";
import { getCompletionSummary } from "@/lib/workspace/production/selectors";
import { WorkspaceErrorText } from "./WorkspaceUi";
export interface ProjectRoundDialogProps {
  open: boolean;
  mode: "complete" | "start-round";
  view: ProjectView;
  busy: boolean;
  error: string | null;
  onConfirm(input: {
    revision: number;
    fileRevision: number;
    round: number;
    acknowledged: true;
  }): void;
  onClose(): void;
}
export function RoundSummary({
  view,
  mode,
}: {
  view: ProjectView;
  mode: ProjectRoundDialogProps["mode"];
}) {
  const s = getCompletionSummary(view.state);
  return (
    <>
      <p>
        작성 중 소목차 <strong>{s.writingSections}</strong> · 미처리 의견{" "}
        <strong>{s.openComments}</strong> · 미확인 체크{" "}
        <strong>{s.uncheckedItems}</strong> · 슬라이드{" "}
        <strong>{s.slideCount}</strong>
      </p>
      {mode === "complete" ? (
        <p>
          현재 상태 그대로 완성본에 보관합니다. 미완료 항목을 자동 완료 처리하지
          않습니다. 완성 후에는 리뷰와 다운로드를 이용하고, 내용을 바꾸려면
          재작업을 시작합니다.
        </p>
      ) : (
        <p>
          {view.state.phase === "writing"
            ? "현재 작업을 미완성 이력으로 보관합니다."
            : "현재 완성본을 보존합니다."}{" "}
          파일 자료와 작성 내용을 다음 회차로 이어가며, 완료된 소목차는 고정하고
          미처리 의견만 복사합니다.
        </p>
      )}
    </>
  );
}
export default function ProjectRoundDialog({
  open,
  mode,
  view,
  busy,
  error,
  onConfirm,
  onClose,
}: ProjectRoundDialogProps) {
  const [baseline] = useState(() => ({
      revision: view.state.revision,
      fileRevision: view.fileRevision,
      round: view.state.currentRound,
      view,
    })),
    [agreed, setAgreed] = useState(false),
    summary = getCompletionSummary(baseline.view.state),
    warn =
      summary.writingSections + summary.openComments + summary.uncheckedItems >
      0;
  return (
    <ModalFrame
      open={open}
      title={mode === "complete" ? "현재 회차 완성" : "새 회차 재작업"}
      contentKey={mode}
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
            disabled={busy || (warn && !agreed)}
            onClick={() =>
              onConfirm({
                revision: baseline.revision,
                fileRevision: baseline.fileRevision,
                round: baseline.round,
                acknowledged: true,
              })
            }
          >
            {busy
              ? "저장 중…"
              : mode === "complete"
                ? "완성본 보관"
                : "새 회차 시작"}
          </DadamButton>
        </>
      }
    >
      <RoundSummary view={baseline.view} mode={mode} />
      {warn && (
        <DadamCheckbox
          label="남아 있는 작업을 확인했으며 현재 상태 그대로 보관합니다."
          checked={agreed}
          disabled={busy}
          onChange={(_, d) => setAgreed(!!d.checked)}
        />
      )}
      <WorkspaceErrorText error={error} />
    </ModalFrame>
  );
}
