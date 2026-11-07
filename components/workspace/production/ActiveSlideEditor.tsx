"use client";
import { useEffect, useRef, useState } from "react";
import { useSlidePrompt } from "@/hooks/workspace/use-slide-prompt";
import { WorkspaceError } from "@/lib/workspace/production/errors";
import { readSlidePrompt } from "@/lib/workspace/production/slide-prompt";
import type { ProjectView, ProposalSlide } from "@/types/workspace-production";
import { DraftProtection } from "../shared/WorkspaceUi";
import SlidePromptEditor from "./SlidePromptEditor";
import CompletedSlidePrompt from "./CompletedSlidePrompt";
import ProductionPreview from "./ProductionPreview";

export interface ProductionEditorParts { editor: React.ReactNode; preview: React.ReactNode; dirty: boolean }
export interface ActiveSlideEditorProps {
  view: ProjectView; slide: ProposalSlide; snapshotId: string | null; externalConflict: string | null; busy: boolean; accessDenied: boolean;
  onDirtyChange(dirty: boolean): void; onBusyChange(busy: boolean): void;
  aiFeedback?: React.ReactNode; showPreview: boolean;
  commentCreateTarget: HTMLElement | null; renderLayout(parts: ProductionEditorParts): React.ReactNode;
}
export default function ActiveSlideEditor({ view, slide, snapshotId, externalConflict, busy: externalBusy, accessDenied,
  onDirtyChange, onBusyChange, aiFeedback, showPreview, commentCreateTarget, renderLayout }: ActiveSlideEditorProps): React.ReactElement {
  const editor = useSlidePrompt(view, slide), [composing, setComposing] = useState(false), composingNow = useRef(false);
  const dirty = editor.draft.dirty, localBusy = editor.busy || composing, busy = externalBusy || localBusy;
  const conflict = externalConflict ?? (editor.conflict ? "다른 변경이 저장되었습니다. 입력을 보존했으니 필요한 내용을 복사한 뒤 최신 내용을 불러와 주세요." : null);
  const completed = slide.state === "done";
  // External completion removes the input, so it cannot emit compositionend.
  if (completed && composing) setComposing(false);
  useEffect(() => { if (completed) composingNow.current = false; }, [completed]);
  const can = !completed && !snapshotId && !externalConflict && !accessDenied && view.state.phase === "writing" && view.capabilities.editableSlideIds.includes(slide.id);
  const canSave = can && !conflict && !busy && !editor.error;
  const readOnlyReason = snapshotId ? "보관본은 읽기 전용입니다." : view.state.phase !== "writing" ? "현재 작업 단계에서는 내용을 수정할 수 없습니다." :
    "이 슬라이드의 편집 권한이 없습니다.";
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange(localBusy); }, [localBusy, onBusyChange]);
  const startEditing = () => { editor.markDirty(); onDirtyChange(true); };
  const compositionChange = (value: boolean) => { composingNow.current = value; setComposing(value); onBusyChange(editor.busy || value); };
  const discard = () => { editor.discard(); compositionChange(false); onDirtyChange(false); };
  const save = async () => {
    if (!canSave || composingNow.current) throw new WorkspaceError("READ_ONLY", conflict ?? "지금은 슬라이드에 반영할 수 없습니다.");
    await editor.save();
    onDirtyChange(false);
  };
  const editorContent = <>
    {conflict && <p role="alert" className="tw:text-xs">{conflict}</p>}
    {!completed && !can && !conflict && !accessDenied && <p className="tw:text-xs tw:text-(--kpc-muted)">{readOnlyReason}</p>}
    {accessDenied && dirty && <p role="status" className="tw:text-xs">접근 권한 변경 전 작성하던 입력을 보관하고 있습니다. 필요한 내용을 복사할 수 있습니다.</p>}
    {completed && !accessDenied && <CompletedSlidePrompt key={JSON.stringify([view.project.id, view.state.currentRound, snapshotId, slide.id])} prompt={readSlidePrompt(slide)} />}
    {completed && dirty && <section aria-label="미반영 원문" className="tw:mt-3 tw:min-w-0 tw:text-xs">
      <p role="status">미반영 원문을 보관하고 있습니다. 필요한 내용을 복사하거나 미저장 변경을 폐기할 수 있습니다.</p>
      <div role="region" aria-label="보관 중인 미반영 원문" tabIndex={0} className="tw:max-h-[180px] tw:min-w-0 tw:overflow-y-auto tw:overscroll-contain tw:leading-[1.7] tw:whitespace-pre-wrap tw:[overflow-wrap:anywhere]">{editor.draft.prompt}</div>
    </section>}
    {!completed && (!accessDenied || dirty) && <SlidePromptEditor value={editor.draft.prompt} dirty={dirty} readOnly={!can || !!conflict}
      busy={externalBusy || editor.busy} composing={composing} error={editor.error} onEditStart={startEditing}
      onChange={editor.setPrompt} onCompositionChange={compositionChange} onSave={() => { void save().catch(() => { /* The hook keeps the input and reports errors. */ }); }} />}
    {aiFeedback}
  </>;
  const preview = showPreview && !accessDenied && !externalConflict ? <section aria-label="저장된 슬라이드"><ProductionPreview view={view} slide={slide} snapshotId={snapshotId} commentCreateTarget={commentCreateTarget} /></section> : null;
  return <div className="tw:flex tw:min-h-0 tw:min-w-0 tw:flex-1 tw:flex-col" onKeyDown={event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault(); event.stopPropagation();
      if (canSave && !event.nativeEvent.isComposing && !composingNow.current) void save().catch(() => { /* Error is rendered with the preserved draft. */ });
    }
  }}>
    {renderLayout({ editor: editorContent, preview, dirty })}
    <DraftProtection dirty={dirty} busy={busy} onSave={canSave ? save : undefined} onDiscard={discard} />
  </div>;
}
