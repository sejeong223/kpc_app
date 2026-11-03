export type FileCategory = "proposal" | "related" | "web";
export type ReferenceKind = "rfp" | "business" | "customer" | "case-study" | "technical" | "company" | "web" | "other";
export type ReferencePriority = "required" | "preferred" | "normal" | "excluded";
export type WebPeriod = "all" | "1y" | "3m";
export type FileRole = "super_admin" | "department_admin" | "user";
export type AllowedFileExtension = ".pdf" | ".hwp" | ".hwpx" | ".doc" | ".docx" | ".ppt" | ".pptx" | ".xls" | ".xlsx" | ".txt";

export interface FileActor { id: string; name: string; role: FileRole; isMock: boolean }
export interface FileIdentity { namespace: string; actor: FileActor }
export interface WorkspaceProject {
  id: string;
  number: string;
  name: string;
  departmentId: string | null;
  pmId: string;
  pmName: string;
  memberIds: string[];
}
export interface FileSettings { kind: ReferenceKind; priority: ReferencePriority; instruction: string }
export interface FileOriginal {
  type: "file";
  blobId: string;
  filename: string;
  extension: AllowedFileExtension;
  mediaType: string;
  byteLength: number;
  lastModified: number;
}
export interface WebOriginal { type: "web"; url: string; period: WebPeriod }
export interface FileAsset { id: string; ownerId: string; ownerName: string; createdAt: string; sourceKind: "file" | "web" }
export interface FileVersion extends FileSettings {
  id: string;
  assetId: string;
  category: FileCategory;
  createdInRound: number;
  createdAt: string;
  createdBy: string;
  label: string;
  source: FileOriginal | WebOriginal;
}
export interface FileRoundEntry { assetId: string; versionId: string }
export interface FileRound {
  number: number;
  createdAt: string;
  createdBy: string;
  sealedAt: string | null;
  categoryOrder: FileCategory[];
  entries: FileRoundEntry[];
}
export interface FileRemoval {
  id: string;
  round: number;
  entry: FileRoundEntry;
  index: number;
  removedBy: string;
  expiresAt: string;
}
export interface FileProjectState {
  schemaVersion: 1;
  projectId: string;
  revision: number;
  currentRound: number;
  rounds: FileRound[];
  assets: FileAsset[];
  versions: FileVersion[];
  removals: FileRemoval[];
}
export interface FileResourceView {
  asset: FileAsset;
  version: FileVersion;
  canManage: boolean;
  currentVersionId: string | null;
  isInherited: boolean;
}
export interface FileRoundView extends Omit<FileRound, "entries"> { readOnly: boolean; resources: FileResourceView[] }
export interface FileWorkspaceView {
  workspaceRevision: number;
  phase: "writing" | "completed";
  project: WorkspaceProject;
  revision: number;
  currentRound: number;
  rounds: FileRoundView[];
  currentCount: number;
  canAdd: boolean;
  canStartRound: boolean;
  canReorder: boolean;
}
export interface FileUploadDraft extends FileSettings { file: File }
export type FileOperation =
  | { type: "add-files"; category: Exclude<FileCategory, "web">; files: FileUploadDraft[] }
  | { type: "add-web"; url: string; period: WebPeriod; instruction: string }
  | { type: "edit"; assetId: string; sourceVersionId: string; settings: FileSettings; web: WebOriginal | null }
  | { type: "remove"; assetId: string; sourceVersionId: string }
  | { type: "undo-remove"; removalId: string }
  | { type: "start-round" }
  | { type: "reorder"; categoryOrder: FileCategory[] };
export interface FileMutation {
  expectedWorkspaceRevision?: number;
  projectId: string;
  expectedRevision: number;
  expectedRound: number;
  operation: FileOperation;
}
export interface PreparedUpload extends FileSettings { original: FileOriginal }
export type PreparedFileOperation =
  | Exclude<FileOperation, { type: "add-files" }>
  | { type: "add-files"; category: Exclude<FileCategory, "web">; files: PreparedUpload[] };
export interface PreparedFileMutation extends Omit<FileMutation, "operation"> { operation: PreparedFileOperation }
export interface FileCommandContext { identity: FileIdentity; project: WorkspaceProject; now: string; newId(): string }
export interface FileReceipt { state: FileProjectState; createdAssetIds: string[]; removalId: string | null }
export interface FileOriginalRequest { projectId: string; round: number; versionId: string }
export interface StoredFileProject { namespace: string; projectId: string; state: FileProjectState }
export interface StoredFileBlob {
  namespace: string;
  projectId: string;
  id: string;
  blob: Blob;
  filename: string;
  mediaType: string;
  byteLength: number;
  createdAt: string;
}
export interface StoredFilePreference { namespace: string; key: "selected-project"; projectId: string }
export interface FileRepository {
  loadViewContext(projectId: string): Promise<import("./workspace-production").FileViewContext>;
  load(projectId: string): Promise<FileProjectState>;
  execute(input: FileMutation): Promise<FileReceipt>;
  readOriginal(input: FileOriginalRequest): Promise<File>;
  readSelection(): Promise<string | null>;
  saveSelection(projectId: string): Promise<void>;
  close(): void;
}
export interface FileProjectCatalog {
  list(): readonly WorkspaceProject[];
  get(projectId: string): WorkspaceProject | null;
}
export type FileErrorCode = "UNIDENTIFIED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "LIMIT"
  | "READ_ONLY" | "CONFLICT" | "DB_UNAVAILABLE" | "DB_BLOCKED" | "STORAGE"
  | "QUOTA" | "ORIGINAL_MISSING" | "CANCELLED" | "UNDO_EXPIRED";
export type { WorkspaceFileError } from "@/lib/workspace/files/errors";
