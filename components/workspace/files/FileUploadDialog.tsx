"use client";
import { useId, useRef, useState } from "react";
import ModalFrame from "@/components/ui/ModalFrame";
import { DadamButton, DadamSelect } from "@/components/ui/DadamControls";
import { ALLOWED_FILE_EXTENSIONS, FILE_LIMITS, FILE_CATEGORIES, REFERENCE_KINDS, REFERENCE_PRIORITIES } from "@/config/workspace-files";
import { FileSettingsSchema } from "@/lib/workspace/files/schemas";
import { guessReferenceKind, validateUploadFile } from "@/lib/workspace/files/validation";
import FileReferenceFields from "./FileReferenceFields";
import FileDialogFeedback from "./FileDialogFeedback";
import type { FileUploadDialogProps, FileUploadRow } from "./file-ui-types";

function pendingRow(file: File): FileUploadRow {
  let validationError: string | null = null;
  try { validateUploadFile(file); } catch (error) { validationError = error instanceof Error ? error.message : "파일을 확인해 주세요."; }
  return { file, key: crypto.randomUUID(), kind: guessReferenceKind(file.name), priority: "normal", instruction: "", expanded: false, validationError };
}
export default function FileUploadDialog(props: FileUploadDialogProps): React.ReactElement {
  const { category, availableSlots, initialFiles, busy, onSubmit, onClose, onDirtyChange } = props;
  const [rows, setRows] = useState(() => initialFiles.map(pendingRow));
  const picker = useRef<HTMLInputElement>(null), id = useId();
  const changeRows = (next: FileUploadRow[]) => { setRows(next); onDirtyChange(next.length > 0); };
  const addPendingFiles = (files: File[]) => { if (!busy) changeRows([...rows, ...files.map(pendingRow)]); };
  const overflow = rows.length > availableSlots;
  const invalid = overflow || !rows.length || rows.some(row => row.validationError !== null || !FileSettingsSchema.safeParse({ kind: row.kind, priority: row.priority, instruction: row.instruction }).success);
  return <ModalFrame open={props.open} title="파일 추가" subtitle={`${FILE_CATEGORIES.find(item => item.value === category)?.label} · 추가 가능 ${availableSlots}개 · 파일당 ${FILE_LIMITS.fileBytes / 1024 / 1024}MB · 이 브라우저에 저장`} width={820} contentKey={category} onClose={onClose}
    footer={<><span className="tw:mr-auto tw:text-xs tw:text-(--kpc-secondary)">선택한 파일 {rows.length}개</span><DadamButton disabled={busy} onClick={onClose}>취소</DadamButton><DadamButton appearance="primary" disabled={busy || invalid} onClick={() => { void onSubmit(rows.map(({ file, kind, priority, instruction }) => ({ file, kind, priority, instruction }))).catch(() => {}); }}>{busy ? "저장 중…" : "자료 추가"}</DadamButton></>}>
    <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-(--layout-control-gap) tw:rounded-lg tw:border tw:border-dashed tw:border-(--dadam-control-border) tw:p-(--layout-card-inset)"
      onDragOver={event => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); event.dataTransfer.dropEffect = busy ? "none" : "copy"; } }}
      onDrop={event => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); addPendingFiles(Array.from(event.dataTransfer.files)); } }}>
      <div><b>파일을 끌어다 놓거나 선택하세요</b><p className="tw:mb-0 tw:text-xs tw:text-(--kpc-secondary)">PDF · HWP/HWPX · Word · PowerPoint · Excel · TXT</p></div>
      <DadamButton disabled={busy} onClick={() => {if(picker.current){picker.current.value="";picker.current.click();}}}>파일 선택</DadamButton>
      <input ref={picker} type="file" multiple hidden accept={ALLOWED_FILE_EXTENSIONS.join(",")} onChange={event => { addPendingFiles(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ""; }} />
    </div>
    {rows.length > 1 && <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap)"><b>모든 파일에 적용</b>
      <DadamSelect aria-label="모든 파일의 종류" value="" disabled={busy} onChange={(_, data) => { const kind = REFERENCE_KINDS.find(item => item.value === data.value)?.value; if (kind) changeRows(rows.map(row => ({ ...row, kind }))); }}>
        <option value="">종류 선택</option>{REFERENCE_KINDS.map(kind => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
      </DadamSelect>
      {REFERENCE_PRIORITIES.map(priority => <DadamButton key={priority.value} size="small" disabled={busy} aria-pressed={rows.every(row => row.priority === priority.value)} onClick={() => changeRows(rows.map(row => ({ ...row, priority: priority.value })))}>{priority.label}</DadamButton>)}
    </div>}
    {rows.map(row => <section key={row.key} className="tw:flex tw:min-w-0 tw:flex-col tw:gap-(--layout-control-gap) tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:p-(--layout-card-inset)">
      <div className="tw:flex tw:min-w-0 tw:items-start tw:gap-(--layout-control-gap)"><b className="tw:min-w-0 tw:flex-1 tw:[overflow-wrap:anywhere]">{row.file.name}</b><small>{(row.file.size / 1024 / 1024).toFixed(2)} MB</small>
        <DadamButton size="small" aria-label={row.file.name + " 대기 목록에서 제거"} disabled={busy} onClick={() => changeRows(rows.filter(item => item.key !== row.key))}>빼기</DadamButton></div>
      {row.validationError && <p role="alert" className="tw:m-0 tw:text-red-700">{row.validationError}</p>}
      <FileReferenceFields value={row} idPrefix={id + row.key} disabled={busy} onChange={settings => changeRows(rows.map(item => item.key === row.key ? { ...item, ...settings } : item))} />
    </section>)}
    {overflow && <p role="alert" className="tw:m-0 tw:text-red-700">현재 회차에는 {availableSlots}개를 더 추가할 수 있습니다. 초과한 대기 파일을 빼 주세요.</p>}
    <div className="tw:flex tw:flex-wrap tw:gap-(--layout-control-gap) tw:text-xs tw:text-(--kpc-secondary)">{REFERENCE_PRIORITIES.map(priority => <span key={priority.value}><b>{priority.label}</b> · {priority.description}</span>)}</div>
    <FileDialogFeedback {...props} />
  </ModalFrame>;
}
