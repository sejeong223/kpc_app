"use client";
import { useState } from "react";
import ModalFrame from "@/components/ui/ModalFrame";
import { DadamButton, DadamCheckbox } from "@/components/ui/DadamControls";
import type {
  ProjectView,
  WorkspaceProposal,
} from "@/types/workspace-production";
import { proposalItemAllowed } from "@/lib/workspace/production/diff";
import { WorkspaceErrorText } from "../shared/WorkspaceUi";
import ContentDiff from "./ContentDiff";
export default function ProposalReview({
  view,
  proposal,
  busy,
  error,
  onApply,
  onKeep,
  onRegenerate,
}: {
  view: ProjectView;
  proposal: WorkspaceProposal;
  busy: boolean;
  error: string | null;
  onApply(ids: string[]): void;
  onKeep(): void;
  onRegenerate(): void;
}) {
  const [selected, setSelected] = useState(() =>
      proposal.items
        .filter((i) => proposalItemAllowed(view, proposal, i))
        .map((i) => i.id),
    ),
    eligible = proposal.items.filter((i) =>
      proposalItemAllowed(view, proposal, i),
    ),
    ids = selected.filter((id) => eligible.some((i) => i.id === id)),
    stale = proposal.baseRevision !== view.state.revision;
  return (
    <ModalFrame
      open
      title="제안 비교 · Mock"
      subtitle="실제 AI·파일 분석 결과가 아닙니다. 선택한 항목만 검토 후 적용합니다."
      contentKey={proposal.id}
      width={1040}
      onClose={() => {
        if (!busy) onKeep();
      }}
      footer={
        <>
          <DadamButton disabled={busy} onClick={onKeep}>
            원문 유지 · 닫기
          </DadamButton>
          <DadamButton disabled={busy} onClick={onRegenerate}>
            현재 내용으로 다시 생성
          </DadamButton>
          {eligible.length > 0 && (
            <DadamButton
              appearance="primary"
              disabled={busy || !ids.length || stale}
              onClick={() => onApply(ids)}
            >
              선택 {ids.length}개 적용
            </DadamButton>
          )}
        </>
      }
    >
      {stale && (
        <p role="alert">
          제안 이후 원문이 변경되었습니다. 현재 내용으로 다시 생성해 주세요.
        </p>
      )}
      <WorkspaceErrorText error={error} />
      {proposal.items.map((item) => {
        const allowed = proposalItemAllowed(view, proposal, item);
        return (
          <article
            key={item.id}
            className="tw:mb-3 tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:p-3"
          >
            <header className="tw:flex tw:items-center tw:gap-2">
              {allowed ? (
                <DadamCheckbox
                  label={item.title + " 적용"}
                  checked={ids.includes(item.id)}
                  disabled={busy || stale}
                  onChange={(_, d) =>
                    setSelected((v) =>
                      d.checked
                        ? [...v, item.id]
                        : v.filter((id) => id !== item.id),
                    )
                  }
                />
              ) : (
                <strong>{item.title} · 고정 또는 적용 권한 없음</strong>
              )}
            </header>
            <ContentDiff before={item.before} after={item.after} />
            <ul className="tw:text-xs">
              {item.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </article>
        );
      })}
      {!proposal.items.length && <p>검토할 변경 제안이 없습니다.</p>}
    </ModalFrame>
  );
}
