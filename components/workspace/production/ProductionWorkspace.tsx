"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import ModalFrame from "@/components/ui/ModalFrame";
import { DadamButton } from "@/components/ui/DadamControls";
import { loadProjectView, useWorkspaceAction, useWorkspaceCommand } from "@/hooks/workspace/use-workspace-production";
import { useWorkspaceSelection } from "@/hooks/workspace/use-workspace-selection";
import { useSlideDraft } from "@/hooks/workspace/use-slide-draft";
import { useSlideClipboard } from "@/hooks/workspace/use-slide-clipboard";
import { selectDeletionImpact } from "@/lib/workspace/production/selectors";
import { selectProductionSlides } from "@/lib/workspace/production/presentation";
import { slidePinIds } from "@/lib/workspace/production/clipboard";
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

export interface ProductionWorkspaceProps extends WorkspaceSceneProps {
  onPropose?(request: MockRequest): void; aiFeedback?: React.ReactNode; aiBusy?: boolean;
  readOnlyError?: string | null; accessDenied?: boolean;
}
interface EditingSession { slideId: string; round: number; snapshotId: string | null; lastSlide: ProposalSlide; dirty: boolean }
const cleanDocument: DocumentEditorState = { dirty: false, composing: false, error: null };
function ActiveSlide({ view, slide, snapshotId, externalConflict, busy: externalBusy, accessDenied, onDirtyChange, onBusyChange, aiFeedback, showPreview }: {
  view: ProjectView; slide: ProposalSlide; snapshotId: string | null; externalConflict: string | null; busy: boolean; accessDenied: boolean;
  onDirtyChange(dirty: boolean): void; onBusyChange(busy: boolean): void;
  aiFeedback?: React.ReactNode; showPreview: boolean;
}) {
  const editor = useSlideDraft(view, slide);
  const [documentState, setDocumentState] = useState(cleanDocument), [resetKey, setResetKey] = useState(0), [error, setError] = useState<string | null>(null);
  const dirty = editor.draft.dirty || documentState.dirty, localBusy = editor.busy || documentState.composing;
  const busy = externalBusy || localBusy;
  const can = !snapshotId && !externalConflict && !accessDenied && view.state.phase === "writing" && view.capabilities.editableSectionIds.includes(slide.sectionId);
  const conflict = externalConflict ?? (editor.conflict ? "다른 변경이 저장되었습니다. 입력을 보존했으니 필요한 내용을 복사한 뒤 최신 내용을 불러와 주세요." : null);
  const canSave = can && !conflict && !documentState.error && !documentState.composing && !busy;
  const readOnlyReason = snapshotId ? "보관본은 읽기 전용입니다." : view.state.phase !== "writing" ? "현재 작업 단계에서는 내용을 수정할 수 없습니다." :
    view.state.body.sections.find(section => section.id === slide.sectionId)?.locked ? "작성 완료로 고정된 소목차입니다. 수정하려면 권한에 따라 고정을 해제해 주세요." : "이 소목차의 편집 권한이 없습니다.";
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
  return <div className="tw:space-y-(--layout-section-gap)" onKeyDown={e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && !e.nativeEvent.isComposing) {
      e.preventDefault(); e.stopPropagation(); if (canSave) void save().catch(() => { /* save exposes the error and keeps input. */ });
    }
  }}>
    {conflict && <p role="alert" className="tw:text-sm">{conflict}</p>}
    {!can && !conflict && !accessDenied && <p className="tw:text-xs tw:text-(--kpc-muted)">{readOnlyReason}</p>}
    {accessDenied && dirty && <p role="status" className="tw:text-xs">접근 권한 변경 전 작성하던 입력을 보관하고 있습니다. 필요한 내용을 복사할 수 있습니다.</p>}
    {(!accessDenied || dirty) && <SlideContentEditor value={editor.draft.content} resetKey={resetKey} readOnly={!can || !!conflict} busy={busy}
      error={editor.error ?? error} onChange={editor.setContent} onEditorStateChange={onDocumentState}
      onSave={() => { void save().catch(() => { /* Error is shown above. */ }); }} />}
    {aiFeedback}
    {showPreview && !accessDenied && !externalConflict && <section aria-label="저장된 슬라이드"><ProductionPreview view={view} slide={slide} snapshotId={snapshotId} /></section>}
    <DraftProtection dirty={dirty} busy={busy} onSave={canSave ? save : undefined} onDiscard={discard} />
  </div>;
}
export default function ProductionWorkspace({ view, selection, readOnlyError = null, accessDenied = false, aiBusy = false, aiFeedback, onPropose }: ProductionWorkspaceProps): React.ReactElement {
  const runtime = useWorkspaceRuntime(), { commitSelection } = useWorkspaceSelection(), command = useWorkspaceCommand();
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
    check([...sectionIds, ...slides.map(s => s!.sectionId)].every(id => fresh.capabilities.editableSectionIds.includes(id)), "FORBIDDEN", "선택에 고정되었거나 수정 권한이 없는 소목차가 있습니다.");
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
  const applyReceipt = async (receipt: WorkspaceReceipt, preferred: string[] = []) => {
    if (!stillHere()) return;
    const nextIds = receipt.createdIds.length ? receipt.createdIds : preferred;
    const slide = receipt.state.body.slides.find(s => s.id === nextIds[0]) ?? receipt.state.body.slides.find(s => s.id === current?.id) ?? null;
    await commitSelection({ ...selection, sectionId: slide?.sectionId ?? section?.id ?? null, slideId: slide?.id ?? null });
    if (stillHere()) { setSelected(nextIds.length ? nextIds : null); setNotice(receipt.notices?.join(" ") || "변경을 반영했습니다."); }
  };
  const execute = (operation: WorkspaceOperation) => guarded(async () => {
    const fresh = await freshView();
    const receipt = await command.mutateAsync({ ...requestFor(fresh), operation });
    await applyReceipt(receipt, "id" in operation && rows.some(r => r.slide.id === operation.id) ? [operation.id] : []);
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
  const safeView = readOnly ? { ...view, capabilities: { ...view.capabilities, editableSectionIds: [], unlockableSectionIds: [] } } : view;
  const multiple = ids.length > 1;
  const aiControls = multiple && !accessDenied && !readOnly && onPropose ?
    <div className="tw:mb-(--layout-section-gap)"><ProductionAiPanel key={JSON.stringify([ids, view.state.currentRound])} view={view} slideIds={ids} busy={busy} onPropose={onPropose} /></div> : null;
  const center = <>
    <WorkspaceErrorText error={error} />{notice && !accessDenied && <p role="status" className="tw:text-xs">{notice}</p>}
    {!accessDenied && <ProductionToolbar view={safeView} sectionId={section?.id ?? null} busy={busy} onSection={id => guarded(async () => { await commitSelection({ ...selection, sectionId: id, slideId: null }); if (stillHere()) setSelected(null); })}
      onState={state => { if (section) execute({ type: "set-section-state", id: section.id, state }); }} onUnlock={() => { if (section) execute({ type: "unlock-section", id: section.id }); }} />
    }
    {multiple && aiControls}
    <div hidden={ids.length > 1 && !session?.dirty}>
      {multiple && session?.dirty && <p role="status" className="tw:text-xs">아래에 아직 반영하지 않은 단일 슬라이드 입력을 보관하고 있습니다.</p>}
      {editingSlide ? <ActiveSlide key={`${view.project.id}:${selection.snapshotId ?? "current"}:${editingSlide.id}`} view={view} slide={editingSlide} snapshotId={selection.snapshotId} externalConflict={sessionConflict} accessDenied={accessDenied} busy={externalBusy} onDirtyChange={onDirtyChange} onBusyChange={setEditorBusy}
        aiFeedback={!multiple ? aiFeedback : null} showPreview={!multiple} /> : !accessDenied && <section aria-label="편집" className="tw:mb-(--layout-section-gap) tw:p-(--layout-card-inset)">
        <p className="tw:text-sm">{section ? "이 소목차에는 슬라이드가 없습니다." : "목차 화면에서 소목차를 먼저 추가해 주세요."}</p>
        {section && <p className="tw:text-xs tw:text-(--kpc-muted)">목록을 마우스 오른쪽 버튼으로 눌러 슬라이드를 추가해 주세요.</p>}
        {rows.length > 0 && <p className="tw:text-xs tw:text-(--kpc-muted)">왼쪽 목록에서 다른 슬라이드를 선택할 수 있습니다.</p>}
      </section>}
    </div>
    {(multiple || !editingSlide) && aiFeedback}
    {ids.length > 1 && !accessDenied && <div className="tw:mt-(--layout-section-gap) tw:space-y-(--layout-section-gap)">{rows.filter(row => ids.includes(row.slide.id)).map(row => <section key={row.slide.id} aria-label={`${row.number}번 선택 슬라이드`}><h3 className="tw:text-sm">{row.number}. {row.slide.content.title || "제목 없음"} <small>{row.section.title}</small></h3><ProductionPreview view={view} slide={row.slide} snapshotId={selection.snapshotId} number={row.number} lazy priority={row.slide.id === current?.id} /></section>)}</div>}
    {!accessDenied && <fieldset disabled={busy || !!session?.dirty || readOnly} data-comment-control className="tw:m-0 tw:min-w-0 tw:border-0 tw:p-0 tw:[&:not(:empty)]:pt-(--layout-control-gap)"><WorkspaceUndoNotice view={view} /></fieldset>}
  </>;
  return <div className="tw:flex tw:min-h-0 tw:min-w-0 tw:flex-1 tw:flex-col">
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
