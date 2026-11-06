"use client";
import { useState } from "react";
import { ArrowUp20Regular } from "@fluentui/react-icons";
import { DadamButton } from "@/components/ui/DadamControls";
import type { MockRequest, ProjectView } from "@/types/workspace-production";
import { selectProductionSlides } from "@/lib/workspace/production/presentation";
import { requestFor } from "../shared/WorkspaceUi";

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
  return <section className="tw:relative tw:mt-2.5 tw:min-w-0 tw:rounded-[14px] tw:border tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:shadow-sm" data-comment-control aria-label="선택 슬라이드 편집">
    <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:px-3.5 tw:pt-2.5">
      <strong className="tw:text-sm">{slideIds.length}장 선택</strong>
      {rows.map(row => <span key={row.slide.id} className="tw:rounded tw:bg-(--kpc-bg) tw:px-2 tw:py-1 tw:text-xs">{row.number} · {row.sectionNumber}</span>)}
    </div>
    <div className="tw:relative">
      <textarea className="tw:block tw:max-h-[180px] tw:min-h-12 tw:w-full tw:min-w-0 tw:resize-none tw:rounded-b-[14px] tw:border-0 tw:bg-transparent tw:py-3 tw:pr-[52px] tw:pl-4 tw:font-[inherit] tw:text-[13px] tw:leading-[1.7] tw:focus-visible:outline-2 tw:focus-visible:outline-(--dadam-accent) tw:disabled:cursor-not-allowed tw:disabled:opacity-60" aria-label="선택한 슬라이드에 한 번에 요청" placeholder="선택한 슬라이드에 한 번에 요청하세요"
        rows={2} maxLength={4000} value={instruction} disabled={busy || !editable}
        onChange={event => setInstruction(event.target.value)}
        onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }} />
      <DadamButton className="tw:absolute tw:right-2.5 tw:bottom-2.5 tw:h-[30px] tw:min-h-[30px] tw:w-[30px] tw:min-w-[30px] tw:rounded-full tw:p-0" appearance="primary" icon={<ArrowUp20Regular />} title="선택한 슬라이드에 적용" aria-label="선택한 슬라이드에 적용"
        disabled={busy || !editable || !instruction.trim()} onClick={send} />
    </div>
    {!editable && <p className="tw:mx-3 tw:text-xs tw:text-(--kpc-muted)">수정할 수 있는 슬라이드만 선택해 주세요.</p>}
  </section>;
}
