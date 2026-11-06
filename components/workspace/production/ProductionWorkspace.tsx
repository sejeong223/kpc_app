"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useComments } from "@/components/comments/CommentsProvider";
import ModalFrame from "@/components/ui/ModalFrame";
import { DadamButton } from "@/components/ui/DadamControls";
import { loadProjectView, useWorkspaceAction, useWorkspaceCommand } from "@/hooks/workspace/use-workspace-production";
import { useWorkspaceSelection } from "@/hooks/workspace/use-workspace-selection";
import { useSlideDraft } from "@/hooks/workspace/use-slide-draft";
import { useSlideClipboard } from "@/hooks/workspace/use-slide-clipboard";
import { selectDeletionImpact } from "@/lib/workspace/production/selectors";
import { selectProductionSlides } from "@/lib/workspace/production/presentation";
import { slidePinIds } from "@/lib/workspace/production/clipboard";
import { workspaceHref } from "@/lib/workspace/production/routing";
import { isTypingTarget } from "@/lib/workspace/production/editor";
import { WorkspaceError, workspaceAssert as check } from "@/lib/workspace/production/errors";
import type { ProjectView, ProposalSlide, SlideBatchRequest, WorkspaceReceipt, MockRequest, WorkspaceOperation } from "@/types/workspace-production";
import { useWorkspaceRuntime } from "../WorkspaceProjectProvider";
import type { WorkspaceSceneProps } from "../WorkspaceScreen";
import { DraftProtection, requestFor, WorkspaceErrorText } from "../shared/WorkspaceUi";
import WorkspaceUndoNotice from "../shared/WorkspaceUndoNotice";
import ProductionToolbar from "./ProductionToolbar";
import ProductionPanels from "./ProductionPanels";
import SlideNavigator from "./SlideNavigator";
import SlideContentEditor, { type DocumentEditorState } from "./SlideContentEditor";
import ProductionPreview from "./ProductionPreview";
import SourcePanel from "./SourcePanel";
import ProductionAiPanel from "./ProductionAiPanel";
import ManufacturingPromptEditor from "./ManufacturingPromptEditor";
import { useManufacturingPrompt } from "@/hooks/workspace/use-manufacturing-prompt";
import { MFG_DEMO_PROJECT_ID } from "@/config/production-mfg-demo";

export interface ProductionWorkspaceProps extends WorkspaceSceneProps {
  onPropose?(request: MockRequest): void; aiFeedback?: React.ReactNode; aiBusy?: boolean;
  readOnlyError?: string | null; accessDenied?: boolean;
}
interface EditingSession { slideId: string; round: number; snapshotId: string | null; lastSlide: ProposalSlide; dirty: boolean }
interface ProductionEditorParts { editor: React.ReactNode; preview: React.ReactNode; dirty: boolean }
const cleanDocument: DocumentEditorState = { dirty: false, composing: false, error: null };
interface ActiveSlideProps {
  view: ProjectView; slide: ProposalSlide; snapshotId: string | null; externalConflict: string | null; busy: boolean; accessDenied: boolean;
  onDirtyChange(dirty: boolean): void; onBusyChange(busy: boolean): void;
  aiFeedback?: React.ReactNode; showPreview: boolean;
  commentCreateTarget: HTMLElement | null; renderLayout(parts: ProductionEditorParts): React.ReactNode;
}
function ActiveSlide({ view, slide, snapshotId, externalConflict, busy: externalBusy, accessDenied, onDirtyChange, onBusyChange, aiFeedback, showPreview, commentCreateTarget, renderLayout }: ActiveSlideProps) {
  const editor = useSlideDraft(view, slide);
  const [documentState, setDocumentState] = useState(cleanDocument), [resetKey, setResetKey] = useState(0), [error, setError] = useState<string | null>(null);
  const dirty = editor.draft.dirty || documentState.dirty, localBusy = editor.busy || documentState.composing;
  const busy = externalBusy || localBusy;
  const can = !snapshotId && !externalConflict && !accessDenied && view.state.phase === "writing" && view.capabilities.editableSlideIds.includes(slide.id);
  const conflict = externalConflict ?? (editor.conflict ? "다른 변경이 저장되었습니다. 입력을 보존했으니 필요한 내용을 복사한 뒤 최신 내용을 불러와 주세요." : null);
  const canSave = can && !conflict && !documentState.error && !documentState.composing && !busy;
  const readOnlyReason = snapshotId ? "보관본은 읽기 전용입니다." : view.state.phase !== "writing" ? "현재 작업 단계에서는 내용을 수정할 수 없습니다." :
    slide.state === "done" ? "작성 완료로 고정된 슬라이드입니다. 수정하려면 고정을 해제해 주세요." : "이 슬라이드의 편집 권한이 없습니다.";
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => onBusyChange(localBusy), [localBusy, onBusyChange]);
  const latestEditor = useRef(editor);
  useLayoutEffect(() => { latestEditor.current = editor; });
  const onDocumentState = useCallback((next: DocumentEditorState) => {
    const current = latestEditor.current;
    // Freeze the draft revision at the first raw edit, including an unfinished IME composition.
    if (next.dirty && !current.draft.dirty) current.setContent(current.draft.content);
    setDocumentState(next); onDirtyChange(next.dirty || current.draft.dirty);
  }, [onDirtyChange]);
  const discard = () => { editor.discard(); setDocumentState(cleanDocument); setResetKey(k => k + 1); setError(null); onDirtyChange(false); };
  const save = async () => {
    if (!canSave) throw new WorkspaceError("READ_ONLY", conflict ?? "지금은 슬라이드에 반영할 수 없습니다.");
    try { await editor.save(); setDocumentState(cleanDocument); setResetKey(k => k + 1); setError(null); onDirtyChange(false); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "슬라이드를 저장하지 못했습니다."); throw failure; }
  };
  const editorContent = <>
    {conflict && <p role="alert" className="tw:text-sm">{conflict}</p>}
    {!can && !conflict && !accessDenied && <p className="tw:text-xs tw:text-(--kpc-muted)">{readOnlyReason}</p>}
    {accessDenied && dirty && <p role="status" className="tw:text-xs">접근 권한 변경 전 작성하던 입력을 보관하고 있습니다. 필요한 내용을 복사할 수 있습니다.</p>}
    {(!accessDenied || dirty) && <SlideContentEditor value={editor.draft.content} resetKey={resetKey} readOnly={!can || !!conflict} busy={busy}
      error={editor.error ?? error} onChange={editor.setContent} onEditorStateChange={onDocumentState}
      onSave={() => { void save().catch(() => { /* Error is shown above. */ }); }} />}
    {aiFeedback}
  </>;
  const preview = showPreview && !accessDenied && !externalConflict ? <section aria-label="저장된 슬라이드"><ProductionPreview view={view} slide={slide} snapshotId={snapshotId} commentCreateTarget={commentCreateTarget} /></section> : null;
  return <div className="tw:flex tw:min-h-0 tw:min-w-0 tw:flex-1 tw:flex-col" onKeyDown={e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && !e.nativeEvent.isComposing) {
      e.preventDefault(); e.stopPropagation(); if (canSave) void save().catch(() => { /* save exposes the error and keeps input. */ });
    }
  }}>
    {renderLayout({ editor: editorContent, preview, dirty })}
    <DraftProtection dirty={dirty} busy={busy} onSave={canSave ? save : undefined} onDiscard={discard} />
  </div>;
}
function ActiveManufacturingSlide({ view, slide, snapshotId, externalConflict, busy: externalBusy, accessDenied, onDirtyChange, onBusyChange, aiFeedback, showPreview, commentCreateTarget, renderLayout }: ActiveSlideProps) {
  const editor = useManufacturingPrompt(view, slide);
  const [documentState, setDocumentState] = useState(cleanDocument), [resetKey, setResetKey] = useState(0), [error, setError] = useState<string | null>(null);
  const dirty = editor.draft.dirty || documentState.dirty, busy = externalBusy || editor.busy || documentState.composing;
  const section = view.state.body.sections.find(s => s.id === slide.sectionId);
  const conflict = externalConflict ?? (editor.conflict ? "다른 변경이 저장되었습니다. 입력을 보관했으니 필요한 내용을 복사한 뒤 최신 내용을 불러와 주세요." : null);
  const can = !snapshotId && !accessDenied && !conflict && view.state.phase === "writing" && !!section?.assigneeIds.includes(view.actor.id) && view.capabilities.editableSlideIds.includes(slide.id);
  const canSave = can && !busy && !documentState.error;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => onBusyChange(editor.busy || documentState.composing), [editor.busy, documentState.composing, onBusyChange]);
  const discard = () => { editor.discard(); setDocumentState(cleanDocument); setResetKey(key => key + 1); setError(null); onDirtyChange(false); };
  const save = async () => {
    if (!canSave) throw new WorkspaceError("READ_ONLY", conflict ?? "지금은 본문을 반영할 수 없습니다.");
    try { await editor.save(); setDocumentState(cleanDocument); setResetKey(key => key + 1); setError(null); onDirtyChange(false); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "본문을 저장하지 못했습니다."); throw failure; }
  };
  return <div className="tw:flex tw:min-h-0 tw:min-w-0 tw:flex-1 tw:flex-col" onKeyDown={event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && !event.nativeEvent.isComposing) {
      event.preventDefault(); event.stopPropagation(); if (canSave) void save().catch(() => {});
    }
  }}>
    {renderLayout({ dirty, editor: <>
      {conflict && <p role="alert" className="tw:text-xs">{conflict}</p>}
      {(!accessDenied || dirty) && <ManufacturingPromptEditor value={editor.draft.prompt} readOnly={!can} busy={externalBusy || editor.busy} resetKey={resetKey} error={editor.error ?? error}
        onChange={prompt => { editor.setPrompt(prompt); setError(null); }} onSave={() => { void save().catch(() => {}); }} onEditorStateChange={next => {
          if (next.dirty && !editor.draft.dirty) editor.markDirty(); setDocumentState(next); onDirtyChange(next.dirty || editor.draft.dirty);
        }} />}{aiFeedback}
    </>, preview: showPreview && !accessDenied && !externalConflict ? <section aria-label="저장된 슬라이드"><ProductionPreview view={view} slide={slide} snapshotId={snapshotId} commentCreateTarget={commentCreateTarget} /></section> : null })}
    <DraftProtection dirty={dirty} busy={busy} onSave={canSave ? save : undefined} onDiscard={discard} />
  </div>;
}
export default function ProductionWorkspace({ view, selection, readOnlyError = null, accessDenied = false, aiBusy = false, aiFeedback, onPropose }: ProductionWorkspaceProps): React.ReactElement {
  const runtime = useWorkspaceRuntime(), { commitSelection } = useWorkspaceSelection(), command = useWorkspaceCommand(), router = useRouter(), comments = useComments();
  const [commentCreateTarget, setCommentCreateTarget] = useState<HTMLDivElement | null>(null);
  const batch = useWorkspaceAction<WorkspaceReceipt, SlideBatchRequest>((r, input) => r.service.editSlides(input)), clipboard = useSlideClipboard();
  const rows = selectProductionSlides(view), active = rows.find(r => r.slide.id === selection.slideId) ?? rows.find(r => r.section.id === selection.sectionId) ?? null;
  const current = active?.slide ?? null, section = view.state.body.sections.find(s => s.id === (active?.section.id ?? selection.sectionId));
  const [session, setSession] = useState<EditingSession | null>(() => current ? { slideId: current.id, round: view.state.currentRound, snapshotId: selection.snapshotId, lastSlide: current, dirty: false } : null);
  if (!session?.dirty && (session?.slideId !== current?.id || (session && (session.round !== view.state.currentRound || session.lastSlide !== current))))
    setSession(current ? { slideId: current.id, round: view.state.currentRound, snapshotId: selection.snapshotId, lastSlide: current, dirty: false } : null);
  const [selected, setSelected] = useState<string[] | null>(null), [anchor, setAnchor] = useState<string | null>(null);
  const [dialog, setDialog] = useState<SlideBatchRequest | null>(null), [notice, setNotice] = useState<string | null>(null), [error, setError] = useState<string | null>(null);
  const [editorBusy, setEditorBusy] = useState(false), [working, setWorking] = useState(false), running = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const onDirtyChange = useCallback((dirty: boolean) => setSession(previous => previous && previous.dirty !== dirty ? { ...previous, dirty } : previous), []);
  const ids = rows.filter(r => (selected ?? (current ? [current.id] : [])).includes(r.slide.id)).map(r => r.slide.id);
  const externalBusy = working || command.isPending || batch.isPending || clipboard.copy.isPending || clipboard.paste.isPending || aiBusy;
  const busy = externalBusy || editorBusy;
  const readOnly = !!readOnlyError || accessDenied || !!selection.snapshotId || view.state.phase !== "writing";
  const stillHere = () => mounted.current && runtime.isActive() && runtime.selection.get()?.projectId === view.project.id && runtime.selection.get()?.snapshotId === selection.snapshotId;
  const fail = (failure: unknown) => { if (mounted.current && (!(failure instanceof WorkspaceError) || failure.code !== "CANCELLED")) setError(failure instanceof Error ? failure.message : "작업을 완료하지 못했습니다."); };
  const guarded = (action: () => Promise<void>) => {
    if (busy || running.current) return;
    void runtime.navigate(async () => {
      if (!stillHere() || running.current) return;
      running.current = true; setWorking(true); setError(null);
      try { await action(); } finally { running.current = false; if (mounted.current) setWorking(false); }
    }).catch(fail);
  };
  const freshView = async (write = true) => {
    check(stillHere() && !readOnlyError && !accessDenied && (!write || !readOnly), "READ_ONLY", readOnlyError ?? "현재 조회에서는 변경할 수 없습니다.");
    const fresh = await loadProjectView(runtime, view.project.id);
    check(stillHere() && fresh.state.currentRound === view.state.currentRound, "CONFLICT", "작업 회차가 변경되었습니다. 최신 내용을 확인해 주세요.");
    return fresh;
  };
  const assertEditable = (fresh: ProjectView, slideIds: readonly string[], sectionIds: readonly string[] = []) => {
    const slides = slideIds.map(id => fresh.state.body.slides.find(s => s.id === id));
    check(slides.every(Boolean), "NOT_FOUND", "선택한 슬라이드가 변경되었습니다.");
    check(slideIds.every(id => fresh.capabilities.editableSlideIds.includes(id)) &&
      sectionIds.every(id => fresh.capabilities.insertableSectionIds.includes(id)), "FORBIDDEN", "고정되었거나 수정 권한이 없는 슬라이드 또는 대상 소목차가 있습니다.");
  };
  const selectIds = async (slideIds: string[], focusId: string | null, after?: () => void) => {
    const row = rows.find(r => r.slide.id === focusId);
    if (row) await commitSelection({ ...selection, sectionId: row.section.id, slideId: row.slide.id });
    if (stillHere()) { setSelected(slideIds); after?.(); }
  };
  const chooseSlide = (id: string, mode: "single" | "toggle" | "range") => guarded(async () => {
    let next = [id];
    if (mode === "toggle") next = ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id];
    if (mode === "range") { const a = rows.findIndex(r => r.slide.id === (anchor ?? active?.slide.id)), b = rows.findIndex(r => r.slide.id === id); next = rows.slice(Math.max(0, Math.min(a, b)), Math.max(a, b) + 1).map(r => r.slide.id); }
    await selectIds(next, next.includes(id) ? id : next[0] ?? id, () => { if (mode !== "range") setAnchor(id); });
  });
  const applyReceipt = async (receipt: WorkspaceReceipt, preferred: string[] = [], options?: { silent?: boolean }) => {
    if (!stillHere()) return;
    const nextIds = receipt.createdIds.length ? receipt.createdIds : preferred;
    const slide = receipt.state.body.slides.find(s => s.id === nextIds[0]) ?? receipt.state.body.slides.find(s => s.id === current?.id) ?? null;
    await commitSelection({ ...selection, sectionId: slide?.sectionId ?? section?.id ?? null, slideId: slide?.id ?? null });
    if (stillHere()) { setSelected(nextIds.length ? nextIds : null); setNotice(options?.silent ? null : receipt.notices?.join(" ") || "변경을 반영했습니다."); }
  };
  const execute = (operation: WorkspaceOperation) => guarded(async () => {
    const silent = operation.type === "set-slide-state" || operation.type === "unlock-slide";
    if (silent) setNotice(null);
    const fresh = await freshView();
    const receipt = await command.mutateAsync({ ...requestFor(fresh), operation });
    await applyReceipt(receipt, "id" in operation && rows.some(r => r.slide.id === operation.id) ? [operation.id] : [], { silent });
  });
  const canCopy = (slideIds: readonly string[]) => !readOnlyError && !accessDenied && !selection.snapshotId && slideIds.length > 0 && slideIds.every(id => rows.some(r => r.slide.id === id)) && slidePinIds(rows.filter(r => slideIds.includes(r.slide.id)).map(r => r.slide)).every(id => view.assetAccess.find(a => a.pinId === id)?.access.status === "available");
  const copy = (slideIds: string[]) => { if (!canCopy(slideIds)) return; guarded(async () => { await freshView(false); const result = await clipboard.copy.mutateAsync({ projectId: view.project.id, slideIds }); if (stillHere()) setNotice(`${result.count}장 복사했습니다. 10분 안에 붙여넣을 수 있습니다.`); }); };
  const paste = (sectionId: string, afterId: string | null) => guarded(async () => {
    const fresh = await freshView(), token = clipboard.getToken(); check(!!token, "VALIDATION", "먼저 슬라이드를 복사해 주세요."); assertEditable(fresh, [], [sectionId]);
    await applyReceipt(await clipboard.paste.mutateAsync({ ...requestFor(fresh), sectionId, afterId, token }));
  });
  const openRemove = (slideIds: string[]) => guarded(async () => {
    const fresh = await freshView(); assertEditable(fresh, slideIds); batch.reset();
    setDialog({ ...requestFor(fresh), operation: "remove", slideIds, sectionId: null, beforeId: null });
  });
  const applyBatch = () => guarded(async () => {
    if (!dialog) return;
    const fresh = await freshView(); check(fresh.state.revision === dialog.expectedRevision, "CONFLICT", "확인 중 프로젝트가 변경되었습니다. 창을 닫고 다시 선택해 주세요.");
    assertEditable(fresh, dialog.slideIds, dialog.sectionId ? [dialog.sectionId] : []);
    const receipt = await batch.mutateAsync({ ...dialog, ...requestFor(fresh) });
    await applyReceipt(receipt); if (stillHere()) setDialog(null);
  });
  const savedSessionSlide = session ? rows.find(r => r.slide.id === session.slideId)?.slide : null;
  const sessionConflict = readOnlyError ?? (session?.dirty && (session.round !== view.state.currentRound || !savedSessionSlide) ? "편집 중인 슬라이드의 회차가 변경되었거나 삭제되었습니다. 입력을 복사한 뒤 최신 내용으로 이동해 주세요." : null);
  const editingSlide = session ? (session.round === view.state.currentRound ? savedSessionSlide ?? session.lastSlide : session.lastSlide) : null;
  const safeView = readOnly ? { ...view, capabilities: { ...view.capabilities, editableSectionIds: [], unlockableSectionIds: [], editableSlideIds: [], unlockableSlideIds: [], insertableSectionIds: [] } } : view;
  const multiple = ids.length > 1;
  const aiControls = multiple && !accessDenied && !readOnly && onPropose ?
    <ProductionAiPanel key={JSON.stringify([ids, view.state.currentRound])} view={view} slideIds={ids} busy={busy} onPropose={onPropose} /> : null;
  const removeSelectedSlide = (id: string) => guarded(async () => {
    const next = ids.filter(value => value !== id);
    if (!next.length || next.length === ids.length) return;
    await selectIds(next, current && next.includes(current.id) ? current.id : next[0]);
  });
  const selectedRows = rows.filter(row => ids.includes(row.slide.id));
  const stackRows = active && ids.includes(active.slide.id) ? [active, ...selectedRows.filter(row => row.slide.id !== active.slide.id)] : selectedRows;
  const empty = !accessDenied && <section aria-label="편집" className="tw:p-3">
    <p className="tw:text-sm">{section ? "이 소목차에는 슬라이드가 없습니다." : "목차가 비어 있습니다"}</p>
    <p className="tw:text-xs tw:text-(--kpc-muted)">{section ? "목록을 마우스 오른쪽 버튼으로 눌러 슬라이드를 추가해 주세요." : "목차 메뉴에서 대목차를 만들거나 RFP 기반 목차 추천을 사용하세요."}</p>
    {rows.length > 0 && <p className="tw:text-xs tw:text-(--kpc-muted)">왼쪽 목록에서 다른 슬라이드를 선택할 수 있습니다.</p>}
  </section>;
  const renderCenter = ({ editor, preview, dirty }: ProductionEditorParts) => <>
    <div data-production-editor-header className="tw:max-h-[55%] tw:min-h-0 tw:shrink-0 tw:overflow-y-auto tw:overscroll-contain tw:border-b tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:px-3 tw:pt-3.5 tw:pb-2.5 tw:@min-[761px]:px-[22px]">
      <WorkspaceErrorText error={error} />{notice && !accessDenied && <p role="status" className="tw:text-xs">{notice}</p>}
      {!accessDenied && <ProductionToolbar key={current?.id ?? section?.id ?? "empty"} view={safeView} sectionId={section?.id ?? null} slideId={current?.id ?? null} busy={busy}
        commentActionSlot={<div ref={setCommentCreateTarget} data-comment-control />}
        onManageToc={() => guarded(async () => { if (stillHere()) router.push(workspaceHref("toc", selection)); })}
        onSection={id => guarded(async () => {
          await commitSelection({ ...selection, sectionId: id, slideId: null });
          if (stillHere() && runtime.selection.get()?.sectionId === id) {
            setSelected(null);
            requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("[data-production-section-picker]")?.focus());
          }
        })}
        onState={state => { if (current) execute(state === "writing" ? { type: "unlock-slide", id: current.id } : { type: "set-slide-state", id: current.id, state }); }}
        onUnlock={() => { if (current) execute({ type: "unlock-slide", id: current.id }); }} />}
      {aiControls}
      <div hidden={multiple && !dirty}>
        {multiple && dirty && <p role="status" className="tw:text-xs">아직 반영하지 않은 단일 슬라이드 입력을 보관하고 있습니다.</p>}
        {editor}
      </div>
      {(multiple || !editingSlide) && aiFeedback}
    </div>
    <div data-production-scroll className="tw:min-h-0 tw:min-w-0 tw:flex-1 tw:overflow-y-auto tw:overscroll-contain tw:bg-(--kpc-bg) tw:px-3 tw:pt-5 tw:pb-[30px] tw:@min-[761px]:px-[22px]">
      {preview}
      {multiple && !accessDenied && !sessionConflict && <div className="tw:space-y-[22px]">{stackRows.map((row, index) => {
        const siblings = rows.filter(item => item.section.id === row.section.id);
        return <section key={row.slide.id} aria-label={row.number + "번 선택 슬라이드"}>
          <header data-comment-control className="tw:mb-2 tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-2 tw:text-xs">
            <span className="tw:rounded-full tw:bg-(--dadam-accent-soft) tw:px-2 tw:text-(--dadam-accent-ink)">{row.number}</span>
            <strong>{row.sectionNumber} {row.section.title}</strong>
            {siblings.length > 1 && <span className="tw:text-(--kpc-muted)">{siblings.findIndex(item => item.slide.id === row.slide.id) + 1}/{siblings.length}</span>}
            {index > 0 && <DadamButton className="tw:ml-auto" size="small" appearance="subtle" disabled={busy} onClick={() => removeSelectedSlide(row.slide.id)}>선택에서 빼기</DadamButton>}
          </header>
          <ProductionPreview view={view} slide={row.slide} snapshotId={selection.snapshotId} number={row.number} lazy priority={row.slide.id === current?.id}
            commentCreateTarget={row.slide.id === current?.id ? commentCreateTarget : null} />
        </section>;
      })}</div>}
      {!accessDenied && <fieldset disabled={busy || dirty || readOnly} data-comment-control className="tw:m-0 tw:min-w-0 tw:border-0 tw:p-0 tw:[&:not(:empty)]:pt-2"><WorkspaceUndoNotice view={view} /></fieldset>}
    </div>
  </>;
  const Editor = view.project.id === MFG_DEMO_PROJECT_ID && !editingSlide?.template && view.state.body.sections.some(s => s.id === editingSlide?.sectionId && s.demoPrompt) ? ActiveManufacturingSlide : ActiveSlide;
  const center = editingSlide ? <Editor key={view.project.id + ":" + (selection.snapshotId ?? "current") + ":" + editingSlide.id}
    view={view} slide={editingSlide} snapshotId={selection.snapshotId} externalConflict={sessionConflict} accessDenied={accessDenied} busy={externalBusy}
    onDirtyChange={onDirtyChange} onBusyChange={setEditorBusy} aiFeedback={!multiple ? aiFeedback : null} showPreview={!multiple}
    commentCreateTarget={commentCreateTarget} renderLayout={renderCenter} /> :
    <div className="tw:flex tw:min-h-0 tw:min-w-0 tw:flex-1 tw:flex-col">{renderCenter({ editor: null, preview: empty, dirty: false })}</div>;
  return <div className="tw:flex tw:min-h-0 tw:min-w-0 tw:flex-1 tw:flex-col" onKeyDown={event => {
    if (event.key !== "Escape" || event.defaultPrevented || event.nativeEvent.isComposing || isTypingTarget(event.target) || !multiple || !current || comments.state.pinMode || comments.state.view || document.querySelector("[data-modal-frame], [data-comment-popup], [role='menu'], [role='dialog']")) return;
    event.preventDefault(); event.stopPropagation(); chooseSlide(current.id, "single");
  }}>
    {<ProductionPanels namespace={runtime.identity.namespace}
      left={toggle => accessDenied ? null : <SlideNavigator panelToggle={toggle} view={safeView} rows={rows.map(row => ({ ...row, editable: !readOnly && row.editable }))} activeId={current?.id ?? null} sectionId={section?.id ?? null} selectedIds={ids} snapshotId={selection.snapshotId} busy={busy}
        onSelect={chooseSlide} onCommand={execute} onCopy={copy} canCopy={canCopy} onPaste={paste} canPaste={!readOnly && !!clipboard.getToken()} onRemove={openRemove} />}
      center={center} right={toggle => accessDenied ? null : <SourcePanel panelToggle={toggle} view={view} slide={current} snapshotId={selection.snapshotId} number={active?.number} />} />}
    {dialog && !accessDenied && <ModalFrame open title="선택 슬라이드 삭제" contentKey={dialog.operation} onClose={() => { if (!busy) setDialog(null); }}
      footer={<><DadamButton disabled={busy} onClick={() => setDialog(null)}>취소</DadamButton><DadamButton appearance="primary" disabled={busy || readOnly} onClick={applyBatch}>확인</DadamButton></>}>
      <p>{dialog.slideIds.length}장을 삭제합니다. 슬라이드에 연결된 미처리 의견 {dialog.slideIds.reduce((n, id) => n + selectDeletionImpact(view, id).openComments, 0)}개에 영향을 줍니다.</p>
      <p>연결된 핀 의견은 화면에서 숨겨집니다. 삭제를 되돌리면 다시 표시됩니다. 다른 변경 전에 15초 동안 되돌릴 수 있습니다.</p><WorkspaceErrorText error={error ?? batch.error} />
    </ModalFrame>}
  </div>;
}
