"use client";
import { useState } from "react";
import { ArrowUp20Regular } from "@fluentui/react-icons";
import { DadamButton, DadamTextarea } from "@/components/ui/DadamControls";
import type { MockRequest, ProjectView } from "@/types/workspace-production";
import { selectProductionSlides } from "@/lib/workspace/production/presentation";
import { requestFor, workspaceCard } from "../shared/WorkspaceUi";

export default function ProductionAiPanel({ view, slideIds, onPropose, busy = false }: {
  view: ProjectView; slideIds: string[]; onPropose(request: MockRequest): void; busy?: boolean;
}) {
  const [instruction, setInstruction] = useState("");
  const rows = selectProductionSlides(view).filter(row => slideIds.includes(row.slide.id));
  const editable = view.state.phase === "writing" && slideIds.length > 1 &&
    rows.length === slideIds.length && rows.every(row => row.editable);
  const send = () => {
    if (busy || !editable || !instruction.trim()) return;
    onPropose({ ...requestFor(view), kind: "polish", instruction: instruction.trim(), slideIds, sectionIds: [] });
  };
  if (slideIds.length < 2) return null;
  return <section className={workspaceCard} data-comment-control aria-label="선택 슬라이드 편집">
    <div className="tw:mb-2 tw:flex tw:flex-wrap tw:items-center tw:gap-2">
      <strong className="tw:text-sm">{slideIds.length}장 선택</strong>
      {rows.map(row => <span key={row.slide.id} className="tw:rounded tw:bg-(--kpc-bg) tw:px-2 tw:py-1 tw:text-xs">{row.number} · {row.sectionNumber}</span>)}
    </div>
    <div className="tw:flex tw:items-end tw:gap-2">
      <DadamTextarea className="tw:min-w-0 tw:flex-1" aria-label="선택한 슬라이드에 한 번에 요청" placeholder="선택한 슬라이드에 한 번에 요청하세요"
        rows={2} maxLength={4000} value={instruction} disabled={busy || !editable}
        onChange={(_, data) => setInstruction(data.value)}
        onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }} />
      <DadamButton appearance="primary" icon={<ArrowUp20Regular />} title="선택한 슬라이드에 적용" aria-label="선택한 슬라이드에 적용"
        disabled={busy || !editable || !instruction.trim()} onClick={send} />
    </div>
    {!editable && <p className="tw:text-xs tw:text-(--kpc-muted)">수정할 수 있는 슬라이드만 선택해 주세요.</p>}
  </section>;
}
