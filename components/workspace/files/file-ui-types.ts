import type { FileCategory, FileResourceView, FileSettings, FileUploadDraft, WebOriginal, WorkspaceFileError } from "@/types/workspace-files";
export interface FileDialogBaseProps {
  open: boolean; busy: boolean; error: WorkspaceFileError | null; onClose(): void;
  onDirtyChange(dirty: boolean): void; onReload(): void;
}
export interface FileReferenceFieldsProps { value: FileSettings; idPrefix: string; disabled?: boolean; onChange(value: FileSettings): void }
export interface FileUploadDialogProps extends FileDialogBaseProps {
  category: Exclude<FileCategory, "web">; availableSlots: number; initialFiles: File[];
  onSubmit(files: FileUploadDraft[]): Promise<void>;
}
export interface FileUploadRow extends FileUploadDraft { key: string; expanded: boolean; validationError: string | null }
export interface FileSettingsDialogProps extends FileDialogBaseProps { resource: FileResourceView; copyToCurrent: boolean; onSubmit(settings: FileSettings): Promise<void> }
export interface WebReferenceDraft extends Pick<WebOriginal, "url" | "period"> { instruction: string }
export interface WebReferenceDialogProps extends FileDialogBaseProps { initial: WebReferenceDraft | null; copyToCurrent: boolean; onSubmit(value: WebReferenceDraft): Promise<void> }
interface FileDialogScope { projectId: string; baseRevision: number; baseRound: number }
export type FileDialogState =
  | (FileDialogScope & { type: "upload"; category: Exclude<FileCategory, "web">; files: File[] })
  | (FileDialogScope & { type: "web-new" })
  | (FileDialogScope & { type: "edit"; source: FileResourceView; copyToCurrent: boolean })
  | null;
