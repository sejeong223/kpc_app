import type {
  FileIdentity,
  WorkspaceProject,
  FileRoundEntry,
  FileProjectCatalog,
  FileProjectState,
} from "./workspace-files";
import type { WorkspaceDatabase } from "@/services/workspace/WorkspaceDatabase";
import type { PromptSource, PromptRevision } from "./admin-prompts";
import type { SkillAssetRevision, TemplateAssetRevision } from "./admin-assets";
import type {
  CommentThread,
  CommentMessage,
  CommentScope,
  CommentPoint,
  CommentMention,
  CommentDraft,
  CommentCommand,
} from "@/config/comments";
import type { AdminActor } from "./admin";
import type { TemplatePreviewData } from "./template-work";
import type { ObjectRole, TemplateObject } from "./pptx-template";
import type { WorkspaceAssetService } from "@/services/workspace/WorkspaceAssetService";

export type ProjectPermission =
  | "outline"
  | "assign"
  | "setup"
  | "complete"
  | "rework";
export interface WorkspaceMember {
  role?: FileIdentity["actor"]["role"];
  id: string;
  adminUserId: string;
  name: string;
  departmentId: string | null;
  departmentName: string;
  email: string | null;
}
export interface ProjectGrant {
  userId: string;
  permissions: ProjectPermission[];
}
export interface Chapter {
  id: string;
  title: string;
}
export interface ManufacturingPrompt { intro: string; bullets: string[] }
export interface Section {
  demoPrompt?: ManufacturingPrompt;
  id: string;
  chapterId: string;
  title: string;
  assigneeIds: string[];
  reviewerIds: string[];
  state: "writing" | "done";
  locked: boolean;
}
export type ContentBlock =
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "list"; items: string[] }
  | { id: string; kind: "table"; columns: string[]; rows: string[][] }
  | {
      id: string;
      kind: "image";
      blobId: string;
      alt: string;
      width: number;
      height: number;
      mime: "image/png" | "image/jpeg";
    };
export interface SlideContent {
  title: string;
  lead: string;
  blocks: ContentBlock[];
}
export interface ElementBinding {
  key: "title" | "lead" | string;
  objectId: string;
}
export interface SlideTemplateRef {
  pinId: string;
  sourceSlidePath: string;
  bindings: ElementBinding[];
}
export interface SourceRef {
  id: string;
  kind: "requirement" | "file";
  targetId: string;
  fileRound: number | null;
  versionId: string | null;
  page: number | null;
  quote: string | null;
  provenance: "mock" | "manual";
}
export interface SlideUsedSettings {
  skillPinId: string | null;
  promptPinId: string | null;
  promptItemId: string | null;
  prompt: string;
  sources: PromptSource[];
}
export interface ProposalSlide {
  demoSourceKey?: string;
  id: string;
  sectionId: string;
  revision: number;
  content: SlideContent;
  template: SlideTemplateRef | null;
  usedSettings: SlideUsedSettings;
  sources: SourceRef[];
}
export interface Requirement {
  id: string;
  sectionId: string | null;
  title: string;
  coverage: "none" | "partial" | "full";
  page: number | null;
  excerpt: string | null;
  provenance: "mock" | "manual";
}
export interface ChecklistItem {
  id: string;
  title: string;
  source: string;
  assigneeIds: string[];
  done: boolean;
  checkedBy: string | null;
  checkedAt: string | null;
}
export interface ProjectPromptBinding {
  sectionId: string;
  itemId: string | null;
}
export interface ProjectPromptOverride {
  itemId: string;
  prompt: string | null;
  sources: PromptSource[] | null;
}
export interface ProjectSettings {
  promptPinId: string | null;
  skillPinId: string | null;
  templatePinId: string | null;
  bindings: ProjectPromptBinding[];
  overrides: ProjectPromptOverride[];
}
export interface ProjectCommentMessage {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  text: string;
  mentions: CommentMention[];
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
  revision: number;
}
export interface ProjectCommentThread {
  id: string;
  sectionId: string;
  slideId: string;
  round: number;
  number: number;
  authorId: string;
  status: "open" | "resolved";
  point: CommentPoint | null;
  createdAt: string;
  updatedAt: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  revision: number;
  carriedFromId: string | null;
  messages: ProjectCommentMessage[];
}
export interface CanvasCommentThread extends Omit<CommentThread, keyof CommentScope | "slideId"> {
  slideId: string | null;
  carriedFrom: { round: number; threadId: string } | null;
}
export type CanvasCommentMessage = Omit<CommentMessage, keyof CommentScope>;
export interface CanvasCommentState {
  nextNumber: number;
  threads: CanvasCommentThread[];
  messages: CanvasCommentMessage[];
}
export interface RoundBody {
  canvasComments: CanvasCommentState;
  chapters: Chapter[];
  sections: Section[];
  slides: ProposalSlide[];
  requirements: Requirement[];
  checklist: ChecklistItem[];
  settings: ProjectSettings;
  threads: ProjectCommentThread[];
}
export interface RoundSnapshot {
  id: string;
  round: number;
  kind: "complete" | "unfinished";
  createdAt: string;
  createdBy: string;
  inputRevision: number;
  body: RoundBody;
  fileEntries: FileRoundEntry[];
  fileRevision: number;
  pptVersionId: string | null;
}
export type AssetPin =
  | {
      id: string;
      kind: "prompt";
      assetId: string;
      revisionId: string;
      revision: number;
      name: string;
      capturedAt: string;
      capturedBy: string;
      snapshot: PromptRevision;
    }
  | {
      id: string;
      kind: "skill";
      assetId: string;
      revisionId: string;
      revision: number;
      name: string;
      capturedAt: string;
      capturedBy: string;
      snapshot: SkillAssetRevision;
    }
  | {
      id: string;
      kind: "template";
      assetId: string;
      revisionId: string;
      revision: number;
      name: string;
      capturedAt: string;
      capturedBy: string;
      snapshot: TemplateAssetRevision;
      blobId: string;
      sha256: string;
    };
export interface ManifestElement {
  key: string;
  objectId: string;
  shapeId: string;
  kind: "text" | "list" | "table" | "image";
}
export interface ManifestSlide {
  id: string;
  sectionId: string;
  path: string;
  sourcePinId: string;
  sourcePath: string;
  elements: ManifestElement[];
}
export interface ExportManifest {
  version: 1;
  projectId: string;
  round: number;
  inputRevision: number;
  exportId: string;
  slides: ManifestSlide[];
}
export interface PptVersion {
  id: string;
  index: number;
  round: number;
  snapshotId: string | null;
  kind: "generated" | "uploaded";
  pinIds: string[];
  blobId: string;
  filename: string;
  byteLength: number;
  sha256: string;
  createdAt: string;
  createdBy: string;
  inputRevision: number;
  baseVersionId: string | null;
  manifest: ExportManifest | null;
}
export interface WorkspaceUndo {
  id: string;
  actorId: string;
  expiresAt: string;
  afterRevision: number;
  round: number;
  label: string;
  previousBody: RoundBody;
  sectionIds: string[];
  permission: ProjectPermission | "content";
}
export interface ProjectWorkspaceState {
  nextCommentNumber: number;
  schemaVersion: 2;
  projectId: string;
  revision: number;
  inputRevision: number;
  currentRound: number;
  phase: "writing" | "completed";
  grants: ProjectGrant[];
  body: RoundBody;
  snapshots: RoundSnapshot[];
  pins: AssetPin[];
  pptVersions: PptVersion[];
  reviews: ProjectCommentThread[];
  undo: WorkspaceUndo | null;
}
export type LegacyRoundBody = Omit<RoundBody, "canvasComments">;
export interface LegacyRoundSnapshot extends Omit<RoundSnapshot, "body"> { body: LegacyRoundBody }
export interface LegacyWorkspaceUndo extends Omit<WorkspaceUndo, "previousBody"> { previousBody: LegacyRoundBody }
export interface LegacyProjectWorkspaceState extends Omit<ProjectWorkspaceState, "schemaVersion" | "body" | "snapshots" | "undo"> {
  schemaVersion: 1;
  body: LegacyRoundBody;
  snapshots: LegacyRoundSnapshot[];
  undo: LegacyWorkspaceUndo | null;
}
export interface WorkspaceContext {
  identity: FileIdentity;
  project: WorkspaceProject;
  members: readonly WorkspaceMember[];
  now: string;
  newId(): string;
}
export interface WorkspaceMutation {
  projectId: string;
  expectedRevision: number;
  expectedRound: number;
  operation: WorkspaceOperation;
}
export interface WorkspaceReceipt {
  state: ProjectWorkspaceState;
  createdIds: string[];
  undoId: string | null;
  notices?: string[];
}
export type WorkspaceErrorCode =
  | "VALIDATION"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "READ_ONLY"
  | "LOCKED"
  | "CONFLICT"
  | "LIMIT"
  | "CANCELLED"
  | "STORAGE"
  | "DB_UNAVAILABLE"
  | "DB_BLOCKED"
  | "QUOTA"
  | "ORIGINAL_MISSING"
  | "UNDO_EXPIRED"
  | "ASSET_UNAVAILABLE"
  | "MAPPING"
  | "LAYOUT";

export type WorkspaceOperation =
  | { type: "apply-manufacturing-prompt"; sectionId: string; slideId: string; prompt: ManufacturingPrompt }
  | {type:"set-grants-batch";grants:ProjectGrant[]}
  | {type:"canvas-command";command:CommentCommand}
  | {
      type: "add-chapter";
      title: string;
      afterId: string | null;
      beforeId?: string;
    }
  | { type: "rename-chapter"; id: string; title: string }
  | { type: "move-chapter"; id: string; beforeId: string | null }
  | { type: "remove-chapter"; id: string }
  | {
      type: "add-section";
      chapterId: string;
      title: string;
      afterId: string | null;
      beforeId?: string;
    }
  | { type: "rename-section"; id: string; title: string }
  | {
      type: "move-section";
      id: string;
      chapterId: string;
      beforeId: string | null;
    }
  | { type: "remove-section"; id: string }
  | {
      type: "assign-section";
      id: string;
      assigneeIds: string[];
      reviewerIds: string[];
    }
  | { type: "set-grants"; userId: string; permissions: ProjectPermission[] }
  | { type: "set-section-state"; id: string; state: "writing" | "done" }
  | { type: "unlock-section"; id: string }
  | { type: "add-check"; title: string; source: string }
  | { type: "edit-check"; id: string; title: string; source: string }
  | { type: "assign-check"; id: string; assigneeIds: string[] }
  | { type: "check"; id: string; done: boolean }
  | { type: "remove-check"; id: string }
  | {
      type: "add-slide";
      sectionId: string;
      afterId: string | null;
      template: SlideTemplateRef | null;
    }
  | { type: "edit-slide"; id: string; content: SlideContent }
  | {
      type: "save-slide";
      id: string;
      content: SlideContent;
      template: SlideTemplateRef | null;
    }
  | { type: "bind-slide"; id: string; template: SlideTemplateRef }
  | {
      type: "duplicate-slide";
      id: string;
      targetSectionId: string;
      afterId: string | null;
    }
  | {
      type: "move-slide";
      id: string;
      sectionId: string;
      beforeId: string | null;
    }
  | { type: "remove-slide"; id: string }
  | { type: "set-sources"; id: string; sources: SourceRef[] }
  | {
      type: "set-coverage";
      requirementId: string;
      coverage: Requirement["coverage"];
    }
  | { type: "map-prompt"; sectionId: string; itemId: string | null }
  | {
      type: "override-prompt";
      itemId: string;
      prompt: string | null;
      sources: PromptSource[] | null;
    }
  | {
      type: "comment-create";
      sectionId: string;
      slideId: string;
      point: CommentPoint | null;
      draft: CommentDraft;
      review: boolean;
    }
  | {
      type: "comment-reply";
      threadId: string;
      draft: CommentDraft;
      review: boolean;
    }
  | {
      type: "comment-edit";
      threadId: string;
      messageId: string;
      draft: CommentDraft;
      review: boolean;
    }
  | {
      type: "comment-delete";
      threadId: string;
      messageId: string | null;
      review: boolean;
    }
  | {
      type: "comment-move";
      threadId: string;
      point: CommentPoint | null;
      review: boolean;
    }
  | {
      type: "comment-status";
      threadId: string;
      status: "open" | "resolved";
      review: boolean;
    }
  | { type: "complete"; expectedFileRevision: number; acknowledged: boolean }
  | { type: "start-round"; expectedFileRevision: number; acknowledged: boolean }
  | { type: "undo"; id: string };
export interface PreparedAssetChange {
  type: "pin-assets";
  pins: AssetPin[];
  settings: ProjectSettings;
  slides: ProposalSlide[];
}
export interface PreparedProposalChange {
  type: "apply-proposal";
  sectionIds: string[];
  chapters: Chapter[] | null;
  sections: Section[] | null;
  slides: ProposalSlide[] | null;
  requirements: Requirement[] | null;
  checklist: ChecklistItem[] | null;
}
export interface PreparedContentChange {
  type: "replace-content";
  sectionIds: string[];
  slides: ProposalSlide[];
  pins: AssetPin[];
}
export interface PreparedVersionChange {
  type: "register-ppt";
  version: PptVersion;
}
export interface PreparedVersionPinsChange {
  type: "protect-ppt";
  versionId: string;
  pinIds: string[];
}
export interface SlideBatchRequest extends ProjectRequest {
  operation: "move" | "remove";
  slideIds: string[];
  sectionId: string | null;
  beforeId: string | null;
}
export interface PreparedSlideBatch extends Omit<
  SlideBatchRequest,
  keyof ProjectRequest
> {
  type: "batch-slides";
}
export type PreparedWorkspaceOperation =
  | WorkspaceOperation
  | PreparedAssetChange
  | PreparedProposalChange
  | PreparedVersionChange
  | PreparedContentChange
  | PreparedVersionPinsChange
  | PreparedSlideBatch;
export interface PreparedWorkspaceMutation extends Omit<
  WorkspaceMutation,
  "operation"
> {
  operation: PreparedWorkspaceOperation;
}

export interface WorkspaceProjectDirectory extends FileProjectCatalog {
  members(projectId: string): readonly WorkspaceMember[];
}
export interface WorkspaceBundle {
  state: ProjectWorkspaceState;
  files: FileProjectState;
}
export interface WorkspaceBlobInput {
  id: string;
  kind: "template" | "ppt" | "image";
  blob: Blob;
  filename: string;
  sha256: string;
}
export interface StoredWorkspaceBlob extends WorkspaceBlobInput {
  namespace: string;
  projectId: string;
  byteLength: number;
  createdAt: string;
}
export interface FileRoundControl {
  workspaceRevision: number;
  phase: "writing" | "completed";
  canStartRound: boolean;
}
export interface FileViewContext {
  files: FileProjectState;
  control: FileRoundControl;
}
export interface WorkspaceRepository {
  load(projectId: string): Promise<WorkspaceBundle>;
  execute(input: WorkspaceMutation): Promise<WorkspaceReceipt>;
  commitPrepared(
    input: PreparedWorkspaceMutation,
    blobs: readonly WorkspaceBlobInput[],
    assertAccess: () => void,
  ): Promise<WorkspaceReceipt>;
  readBlob(projectId: string, blobId: string): Promise<StoredWorkspaceBlob>;
  readSelection(): Promise<string | null>;
  saveSelection(projectId: string): Promise<void>;
  close(): void;
}
export interface WorkspaceRepositoryOptions {
  identity: FileIdentity;
  catalog: WorkspaceProjectDirectory;
  database?: WorkspaceDatabase;
  factory?: IDBFactory;
  dbName?: string;
  now?: () => string;
  newId?: () => string;
}

export type WorkspaceAssetKind = "prompt" | "skill" | "template";
export type WorkspaceAssetAccess =
  | { status: "available"; catalogRevision: number }
  | { status: "forbidden" | "unavailable"; reason: string };
export interface WorkspaceAssetChoice {
  kind: WorkspaceAssetKind;
  id: string;
  name: string;
  revisionId: string;
  revision: number;
  ownerDepartmentId: string | null;
  active: boolean;
  hasOriginal: boolean;
}
export interface WorkspaceAssetSource {
  choice: WorkspaceAssetChoice;
  snapshot: PromptRevision | SkillAssetRevision | TemplateAssetRevision;
  bytes: Uint8Array | null;
}
export interface WorkspaceAssetHost {
  listWorkspaceAssets(
    actor: AdminActor,
    kind: WorkspaceAssetKind,
  ): Promise<WorkspaceAssetChoice[]>;
  resolveWorkspaceAsset(
    actor: AdminActor,
    kind: WorkspaceAssetKind,
    id: string,
    revisionId: string | null,
    mode: "new" | "existing",
  ): Promise<WorkspaceAssetSource>;
  checkWorkspaceAsset(actor: AdminActor, pin: AssetPin): WorkspaceAssetAccess;
  subscribe(listener: () => void): () => void;
  getRevision(): number;
}
export interface AssetSelection {
  kind: WorkspaceAssetKind;
  assetId: string;
  revisionId: string;
}
export interface WorkspaceAssetServiceOptions {
  host: WorkspaceAssetHost;
  getActor(): AdminActor;
  identity: FileIdentity;
  repository: WorkspaceRepository;
  catalog: WorkspaceProjectDirectory;
}
export interface SlideRenderInput {
  slide: ProposalSlide;
  templateBytes: Uint8Array;
  templateFilename: string;
  templateRevision: TemplateAssetRevision;
  skill: SkillAssetRevision | null;
  images: ReadonlyMap<
    string,
    {
      bytes: Uint8Array;
      mime: "image/png" | "image/jpeg";
      width: number;
      height: number;
    }
  >;
}
export interface RenderedSlide {
  slideId: string;
  sectionId: string;
  sourcePinId: string;
  sourcePath: string;
  bytes: Uint8Array;
  width: number;
  height: number;
  preview: TemplatePreviewData;
  elements: ManifestElement[];
  warnings: string[];
}
export interface ContentSlot {
  objectId: string;
  shapeId: string;
  role: ObjectRole;
  kind: TemplateObject["kind"];
  supported: boolean;
  reasons: string[];
}
export interface DeckInput {
  projectId: string;
  round: number;
  inputRevision: number;
  exportId: string;
  slides: RenderedSlide[];
}
export interface DeckResult {
  bytes: Uint8Array;
  manifest: ExportManifest;
  warnings: string[];
}
export interface ImportMapping {
  externalPath: string;
  externalShapeId: string;
  slideId: string;
  key: string;
}
export interface PptContentChange {
  id: string;
  slideId: string;
  key: string;
  kind: "text" | "list" | "table";
  before: ContentBlock | string;
  after: ContentBlock | string;
  externalPath: string;
  externalShapeId: string;
}
export interface ImportIssue {
  externalPath: string | null;
  slideId: string | null;
  code: "unmatched" | "ambiguous" | "unsupported" | "missing" | "layout";
  message: string;
}
export interface ExternalPptShape {
  path: string;
  slideName: string;
  shapeId: string;
  name: string;
  kind: "text" | "shape" | "table" | "image" | "unsupported";
  excerpt: string;
  reasons: string[];
}
export interface PptComparison {
  changes: PptContentChange[];
  issues: ImportIssue[];
  matchedSlideIds: string[];
  externalSlideCount: number;
  externalShapes: ExternalPptShape[];
}
export interface ProjectRequest {
  projectId: string;
  expectedRevision: number;
  expectedRound: number;
}
export interface MockRequest extends ProjectRequest {
  kind: "recommend-toc" | "edit-toc" | "draft" | "polish" | "check";
  sectionIds: string[];
  slideIds: string[];
  instruction: string;
}
export interface ProposalItem {
  id: string;
  sectionId: string | null;
  slideId: string | null;
  title: string;
  before: string;
  after: string;
  warnings: string[];
  affectedSectionIds: string[];
}
export interface WorkspaceProposal {
  id: string;
  projectId: string;
  round: number;
  baseRevision: number;
  kind: MockRequest["kind"];
  items: ProposalItem[];
  mock: true;
  createdAt: string;
}
export interface ExportRequest extends ProjectRequest {
  snapshotId: string | null;
}
export interface ImportRequest extends ProjectRequest {
  file: File;
  baseVersionId: string | null;
  mapping: ImportMapping[];
}
export interface ImportedPpt {
  sessionId: string;
  versionId: string;
  comparison: PptComparison;
  baseRevision: number;
}
export interface WorkspaceProgress {
  jobId: string;
  stage: "reading" | "rendering" | "assembling" | "comparing" | "saving";
  completed: number;
  total: number;
  message: string;
}
export interface WorkspaceProductionOptions {
  identity: FileIdentity;
  catalog: WorkspaceProjectDirectory;
  repository: WorkspaceRepository;
  assets: WorkspaceAssetService;
  now?: () => string;
  newId?: () => string;
}
export interface WorkspaceSelection {
  projectId: string | null;
  sectionId: string | null;
  slideId: string | null;
  snapshotId: string | null;
}
export interface ProjectView {
  roundCreatedAt: string;
  actor: Pick<FileIdentity["actor"], "id" | "role">;
  project: WorkspaceProject;
  members: WorkspaceMember[];
  state: ProjectWorkspaceState;
  fileRevision: number;
  capabilities: ReturnType<
    typeof import("@/lib/workspace/production/selectors").getWorkspaceCapabilities
  >;
  assetAccess: Array<{ pinId: string; access: WorkspaceAssetAccess }>;
}
