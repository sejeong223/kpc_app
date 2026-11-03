"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import WorkspacePage from "@/components/layout/WorkspacePage";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import { useFileCommand, useFileProjects, useFileSelection, useFileWorkspace, useSelectFileProject } from "@/hooks/workspace/use-workspace-files";
import { useFileDraftGuard } from "@/hooks/workspace/use-file-draft-guard";
import { DadamButton } from "@/components/ui/DadamControls";
import ModalFrame from "@/components/ui/ModalFrame";
import { WorkspaceFileError } from "@/lib/workspace/files/errors";
import type { FileCategory, FileOperation, FileRemoval, FileResourceView, WorkspaceProject } from "@/types/workspace-files";
import type { FileDialogState, WebReferenceDraft } from "./file-ui-types";
import FileUploadDialog from "./FileUploadDialog";
import FileSettingsDialog from "./FileSettingsDialog";
import WebReferenceDialog from "./WebReferenceDialog";
import FileDiscardDialog from "./FileDiscardDialog";
import FileUndoNotice from "./FileUndoNotice";
import FilePreviewDialog from "./FilePreviewDialog";
import ProjectSelector from "@/components/workspace/ProjectSelector";
import FileRoundSection from "./FileRoundSection";

export default function FilesWorkspace({ onReconnect }: { onReconnect(): void }): React.ReactElement {
  const projects = useFileProjects(), selection = useFileSelection(), choose = useSelectFileProject();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const firstId = projects.data?.[0]?.id;
  const restoredId = selection.data && projects.data?.some(project => project.id === selection.data) ? selection.data : null;
  // 저장된 마지막 선택은 최초 복원에만 사용한다. 다른 탭의 선택으로 편집 중인 프로젝트를 바꾸지 않는다.
  if (selectedId === null && restoredId) setSelectedId(restoredId);
  const validSelection = selectedId && projects.data?.some(project => project.id === selectedId) ? selectedId : restoredId;
  const { mutate, isIdle } = choose;
  useEffect(() => {
    if (projects.isSuccess && selection.isSuccess && !validSelection && firstId && isIdle) mutate(firstId, { onSuccess: () => setSelectedId(firstId) });
  }, [projects.isSuccess, selection.isSuccess, validSelection, firstId, isIdle, mutate]);
  const error = projects.error ?? selection.error;
  if (error) return <WorkspacePage title="파일 업로드"><AdminAsyncState state="error" message={error.message} onRetry={onReconnect} /></WorkspacePage>;
  if (projects.isPending || selection.isPending) return <WorkspacePage title="파일 업로드"><AdminAsyncState state="loading" /></WorkspacePage>;
  if (!projects.data?.length) return <WorkspacePage title="파일 업로드"><AdminAsyncState state="empty" message="참여 중인 프로젝트가 없습니다." /></WorkspacePage>;
  const selectProject = (id: string) => choose.mutate(id, { onSuccess: () => setSelectedId(id) });
  const selector = <ProjectSelector projects={projects.data} value={validSelection} disabled={choose.isPending} onChange={selectProject} />;
  if (!validSelection || choose.isPending) return <WorkspacePage title="파일 업로드" leading={selector}>
    {choose.error ? <AdminAsyncState state="error" message={choose.error.message} onRetry={() => choose.reset()} /> : <AdminAsyncState state="loading" message="프로젝트를 선택하는 중입니다." />}
  </WorkspacePage>;
  return <FileProjectWorkspace key={validSelection} projectId={validSelection} projects={projects.data} onSelect={selectProject} onReconnect={onReconnect} selectionError={choose.error?.message} />;
}
interface FileProjectWorkspaceProps { projectId: string; projects: WorkspaceProject[]; onSelect(id: string): void; onReconnect(): void; selectionError?: string }
interface ActionConfirmation { operation: Extract<FileOperation, { type: "remove" | "start-round" }>; revision: number; round: number; label: string }
function FileProjectWorkspace({ projectId, projects, onSelect, onReconnect, selectionError }: FileProjectWorkspaceProps): React.ReactElement {
  const query = useFileWorkspace(projectId);
  const command = useFileCommand();
  const { reset } = command;
  const [dialog, setDialog] = useState<FileDialogState>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmation, setConfirmation] = useState<ActionConfirmation | null>(null);
  const [removal, setRemoval] = useState<FileRemoval | null>(null);
  const [localError, setLocalError] = useState<WorkspaceFileError | null>(null);
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<{ resource: FileResourceView; round: number } | null>(null);
  const running = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const closeDraft = useCallback(() => { setDialog(null); setDirty(false); setLocalError(null); reset(); }, [reset]);
  const guard = useFileDraftGuard({ dirty, busy: command.isPending, onDiscard: closeDraft });
  const expireUndo = useCallback(() => setRemoval(null), []);
  const data = query.data;
  const previewResource = !query.error && preview ? data?.rounds.find(round => round.number === preview.round)?.resources.find(resource => resource.version.id === preview.resource.version.id) : null;
  const busy = command.isPending;
  const error = localError ?? command.error;
  function openAdd(category: FileCategory, files: File[] = [], view = data) {
    if (!view || running.current || query.error) return;
    reset(); setLocalError(null); setDirty(files.length > 0);
    const scope = { projectId, baseRevision: view.revision, baseRound: view.currentRound };
    setDialog(category === "web" ? { ...scope, type: "web-new" } : { ...scope, type: "upload", category, files });
  }
  function openEdit(resource: FileResourceView, view = data) {
    if (!view || running.current || query.error) return;
    // 보관본에서 진입해도 현재 버전, 없으면 마지막으로 사용한 보관 버전을 편집한다.
    const latest = [...view.rounds].reverse().flatMap(round => round.resources).find(item => item.asset.id === resource.asset.id);
    if (!latest || !latest.canManage) { setLocalError(new WorkspaceFileError("FORBIDDEN", "이 자료를 변경할 권한이 없습니다.")); return; }
    reset(); setLocalError(null); setDirty(false);
    setDialog({ type: "edit", projectId, baseRevision: view.revision, baseRound: view.currentRound, source: latest,
      copyToCurrent: latest.version.createdInRound < view.currentRound || latest.currentVersionId === null });
  }
  async function execute(operation: FileOperation, base?: { revision: number; round: number }): Promise<void> {
    if (running.current) return;
    if (!data || query.error) {
      const failure = new WorkspaceFileError("CONFLICT", "최신 자료를 다시 불러온 뒤 저장해 주세요."); setLocalError(failure); throw failure;
    }
    running.current = true; setLocalError(null); setNotice("");
    try {
      const result = await command.mutateAsync({ projectId, expectedRevision: base?.revision ?? data.revision, expectedRound: base?.round ?? data.currentRound, operation });
      if (!mounted.current) return;
      if (operation.type === "remove") setRemoval(result.state.removals.find(item => item.id === result.removalId) ?? null);
      else if (operation.type === "undo-remove" || operation.type === "start-round") setRemoval(null);
      setConfirmation(null); closeDraft();
      setNotice(operation.type === "start-round" ? `${result.state.currentRound}차 자료함을 시작했습니다.` : operation.type === "undo-remove" ? "삭제한 자료를 복원했습니다." : "변경 사항을 저장했습니다.");
    } finally { running.current = false; }
  }
  function submit(operation: FileOperation): Promise<void> {
    if (!dialog) return Promise.reject(new WorkspaceFileError("CANCELLED", "편집창이 닫혔습니다."));
    return execute(operation, { revision: dialog.baseRevision, round: dialog.baseRound });
  }
  function reloadDraft() {
    const previous = dialog;
    guard.request(() => {
      closeDraft();
      void query.refetch().then(result => {
        if (!mounted.current || !previous || !result.data || result.error) return;
        if (previous.type === "edit") openEdit(previous.source, result.data);
        else openAdd(previous.type === "web-new" ? "web" : previous.category, [], result.data);
      });
    });
  }
  const dialogProps = { open: true, busy, error, onClose: () => guard.request(closeDraft), onDirtyChange: setDirty, onReload: reloadDraft };
  function saveWeb(value: WebReferenceDraft): Promise<void> {
    if (dialog?.type === "edit") return submit({ type: "edit", assetId: dialog.source.asset.id, sourceVersionId: dialog.source.version.id,
      settings: { kind: "web", priority: "normal", instruction: value.instruction }, web: { type: "web", url: value.url, period: value.period } });
    return submit({ type: "add-web", ...value });
  }
  const selector = <ProjectSelector projects={projects} value={projectId} disabled={busy} onChange={id => { if (id !== projectId) guard.request(() => onSelect(id)); }} />;
  return <WorkspacePage title="파일 업로드" leading={selector} actions={data && <>
    <span className="tw:text-xs tw:text-(--kpc-secondary)">현재 자료 <b>{data.currentCount}</b> / 30개 · 파일당 50MB</span>
    <progress value={data.currentCount} max={30} aria-label="현재 회차 자료 사용량" className="tw:h-1.5 tw:w-20 tw:accent-(--dadam-accent)" />
    {data.canStartRound && <DadamButton disabled={busy || query.isFetching || Boolean(query.error)} onClick={() => setConfirmation({ operation: { type: "start-round" }, revision: data.revision, round: data.currentRound, label: `${data.currentRound + 1}차 자료함` })}>다음 회차 시작</DadamButton>}
  </>}>
    {selectionError && <p role="alert" className="tw:m-0 tw:text-red-700">{selectionError}</p>}
    {!dialog && !confirmation && error && <div role="alert" className="tw:flex tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap) tw:text-red-700">{error.message}<DadamButton disabled={busy} onClick={() => { reset(); setLocalError(null); void query.refetch(); }}>최신 자료 다시 불러오기</DadamButton></div>}
    {notice && <p role="status" className="tw:m-0 tw:text-xs tw:text-(--dadam-accent-ink)">{notice}</p>}
    {removal && removal.round === data?.currentRound && <FileUndoNotice key={removal.id} removal={removal} busy={busy} onExpire={expireUndo} onUndo={removalId => { void execute({ type: "undo-remove", removalId }).catch(() => {}); }} />}
    {query.error ? <AdminAsyncState state="error" message={query.error.message} onRetry={() => guard.request(onReconnect)} /> : query.isPending ? <AdminAsyncState state="loading" /> : data && <>
      <p className="tw:m-0 tw:text-xs tw:text-(--kpc-secondary)">자료의 참조 순서는 왼쪽부터 적용됩니다. 문서당 300쪽 이내를 권장합니다.</p>
      {[...data.rounds].reverse().map(round => <FileRoundSection key={data.currentRound + ":" + round.number} value={round} canAdd={data.canAdd} canReorder={data.canReorder} disabled={busy || query.isFetching}
        onAdd={category => openAdd(category)} onDropFiles={(category, files) => openAdd(category, files)} onEdit={resource => openEdit(resource)}
        onOpen={(resource, round) => setPreview({ resource, round })}
        onRemove={resource => setConfirmation({ operation: { type: "remove", assetId: resource.asset.id, sourceVersionId: resource.version.id }, revision: data.revision, round: data.currentRound, label: resource.version.label })}
        onReorder={categoryOrder => { void execute({ type: "reorder", categoryOrder }).catch(() => {}); }} />)}
    </>}
    {dialog?.type === "upload" && <FileUploadDialog {...dialogProps} category={dialog.category} initialFiles={dialog.files} availableSlots={Math.max(0, 30 - (data?.currentCount ?? 30))} onSubmit={files => submit({ type: "add-files", category: dialog.category, files })} />}
    {dialog?.type === "web-new" && <WebReferenceDialog {...dialogProps} initial={null} copyToCurrent={false} onSubmit={saveWeb} />}
    {dialog?.type === "edit" && (dialog.source.version.source.type === "file"
      ? <FileSettingsDialog {...dialogProps} resource={dialog.source} copyToCurrent={dialog.copyToCurrent} onSubmit={settings => submit({ type: "edit", assetId: dialog.source.asset.id, sourceVersionId: dialog.source.version.id, settings, web: null })} />
      : <WebReferenceDialog {...dialogProps} initial={{ url: dialog.source.version.source.url, period: dialog.source.version.source.period, instruction: dialog.source.version.instruction }} copyToCurrent={dialog.copyToCurrent} onSubmit={saveWeb} />)}
    {confirmation && <ModalFrame open title={confirmation.operation.type === "remove" ? "자료를 삭제할까요?" : "다음 회차를 시작할까요?"} subtitle={confirmation.label} contentKey={confirmation.operation.type} onClose={() => { if (!busy) { setConfirmation(null); reset(); } }}
      footer={<><span className="tw:mr-auto" /><DadamButton disabled={busy} onClick={() => { setConfirmation(null); reset(); }}>취소</DadamButton><DadamButton appearance="primary" disabled={busy} onClick={() => { void execute(confirmation.operation, { revision: confirmation.revision, round: confirmation.round }).catch(() => {}); }}>{busy ? "저장 중…" : "확인"}</DadamButton></>}>
      <p>{confirmation.operation.type === "remove" ? "현재 회차에서만 제외됩니다. 이전 회차의 보관본은 유지되며, 삭제 후 15초 동안 되돌릴 수 있습니다." : "이전 회차를 읽기 전용으로 보관하고 현재 자료와 참조 순서를 새 회차에 계승합니다."}</p>
      {error && <p role="alert" className="tw:m-0 tw:text-red-700">{error.message} 취소 후 최신 자료를 다시 확인해 주세요.</p>}
    </ModalFrame>}
    {guard.confirmOpen && <FileDiscardDialog open onKeep={guard.keepEditing} onDiscard={guard.discardAndContinue} />}
    {preview && previewResource && <FilePreviewDialog key={preview.resource.version.id + ":" + preview.round} open projectId={projectId} resource={previewResource} round={preview.round} onClose={() => setPreview(null)} />}
  </WorkspacePage>;
}
