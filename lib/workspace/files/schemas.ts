import { z } from "zod";
import { ALLOWED_FILE_EXTENSIONS, FILE_CATEGORIES, FILE_LIMITS, REFERENCE_KINDS, REFERENCE_PRIORITIES, WEB_PERIODS } from "@/config/workspace-files";
import type {
  FileActor, FileAsset, FileIdentity, FileMutation, FileOperation, FileOriginal, FileOriginalRequest,
  FileProjectState, FileRemoval, FileRound, FileRoundEntry, FileSettings, FileUploadDraft,
  FileVersion, PreparedFileMutation, PreparedFileOperation, PreparedUpload, WebOriginal, WorkspaceProject,
} from "@/types/workspace-files";
import { hasControlCharacters, normalizeWebUrl, validateUploadFile } from "./validation";
import { WorkspaceFileError } from "./errors";

export const FileIdSchema = z.string().min(1).max(FILE_LIMITS.idLength).regex(/^\S+$/);
export const FileCounterSchema = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
export const FileIsoSchema = z.iso.datetime();
const DisplayName = z.string().min(1).max(500).refine(value => value.trim().length > 0);
const Instruction = z.string().max(FILE_LIMITS.instructionLength);
const Filename = z.string().min(1).max(FILE_LIMITS.filenameLength)
  .refine(value => value.trim().length > 0 && !hasControlCharacters(value));
export const FileCategorySchema = z.enum(FILE_CATEGORIES.map(item => item.value));
export const ReferenceKindSchema = z.enum(REFERENCE_KINDS.map(item => item.value));
export const ReferencePrioritySchema = z.enum(REFERENCE_PRIORITIES.map(item => item.value));
export const WebPeriodSchema = z.enum(WEB_PERIODS.map(item => item.value));
export const FileCategoryOrderSchema = z.array(FileCategorySchema).length(FILE_CATEGORIES.length)
  .refine(values => new Set(values).size === FILE_CATEGORIES.length, "자료 분류를 한 번씩 지정해 주세요.");

export const FileActorSchema = z.strictObject({
  id: FileIdSchema, name: DisplayName, role: z.enum(["super_admin", "department_admin", "user"]), isMock: z.boolean(),
}) satisfies z.ZodType<FileActor>;
export const FileIdentitySchema = z.strictObject({
  namespace: z.string().min(1).max(FILE_LIMITS.namespaceLength).regex(/^\S+$/), actor: FileActorSchema,
}).refine(identity => identity.namespace === "files:" + identity.actor.id
  && (identity.actor.isMock ? identity.actor.id === "preview:sodam" : /^entra:(oid|upn|email):\S+$/.test(identity.actor.id)),
"사용자 저장 범위를 확인해 주세요.") satisfies z.ZodType<FileIdentity>;
export const WorkspaceProjectSchema = z.strictObject({
  id: FileIdSchema, number: DisplayName, name: DisplayName, departmentId: FileIdSchema.nullable(),
  pmId: FileIdSchema, pmName: DisplayName,
  memberIds: z.array(FileIdSchema).refine(ids => new Set(ids).size === ids.length),
}) satisfies z.ZodType<WorkspaceProject>;

export const FileSettingsSchema = z.strictObject({
  kind: ReferenceKindSchema, priority: ReferencePrioritySchema, instruction: Instruction,
}) satisfies z.ZodType<FileSettings>;
export const FileOriginalSchema = z.strictObject({
  type: z.literal("file"), blobId: FileIdSchema, filename: Filename, extension: z.enum(ALLOWED_FILE_EXTENSIONS),
  mediaType: z.string().min(1).max(255), byteLength: z.number().int().min(1).max(FILE_LIMITS.fileBytes),
  lastModified: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
}).refine(source => source.filename.toLowerCase().endsWith(source.extension), "파일 이름과 형식이 일치하지 않습니다.") satisfies z.ZodType<FileOriginal>;

const WebUrlInput = z.string().min(1).max(FILE_LIMITS.urlLength).refine(value => {
  try { normalizeWebUrl(value); return true; } catch { return false; }
}, "올바른 HTTP 또는 HTTPS 링크를 입력해 주세요.");
function isCanonicalWebUrl(value: string): boolean {
  try { return normalizeWebUrl(value) === value; } catch { return false; }
}
export const WebOriginalSchema = z.strictObject({
  type: z.literal("web"), url: WebUrlInput, period: WebPeriodSchema,
}) satisfies z.ZodType<WebOriginal>;
export const FileAssetSchema = z.strictObject({
  id: FileIdSchema, ownerId: FileIdSchema, ownerName: DisplayName, createdAt: FileIsoSchema, sourceKind: z.enum(["file", "web"]),
}) satisfies z.ZodType<FileAsset>;
export const FileVersionSchema = z.strictObject({
  ...FileSettingsSchema.shape,
  id: FileIdSchema, assetId: FileIdSchema, category: FileCategorySchema, createdInRound: FileCounterSchema,
  createdAt: FileIsoSchema, createdBy: FileIdSchema, label: z.string().min(1).max(FILE_LIMITS.urlLength),
  source: z.discriminatedUnion("type", [FileOriginalSchema, WebOriginalSchema]),
}).superRefine((version, context) => {
  const valid = version.source.type === "web"
    ? version.category === "web" && version.kind === "web" && version.priority === "normal"
      && version.label === version.source.url && isCanonicalWebUrl(version.source.url)
    : version.category !== "web" && version.label === version.source.filename;
  if (!valid) context.addIssue({ code: "custom", message: "자료의 종류와 원본 설정이 일치하지 않습니다." });
}) satisfies z.ZodType<FileVersion>;
export const FileRoundEntrySchema = z.strictObject({ assetId: FileIdSchema, versionId: FileIdSchema }) satisfies z.ZodType<FileRoundEntry>;
export const FileRoundSchema = z.strictObject({
  number: FileCounterSchema, createdAt: FileIsoSchema, createdBy: FileIdSchema, sealedAt: FileIsoSchema.nullable(),
  categoryOrder: FileCategoryOrderSchema,
  entries: z.array(FileRoundEntrySchema).max(FILE_LIMITS.currentMaterials)
    .refine(entries => new Set(entries.map(entry => entry.assetId)).size === entries.length, "같은 자료가 중복 등록되었습니다."),
}) satisfies z.ZodType<FileRound>;
export const FileRemovalSchema = z.strictObject({
  id: FileIdSchema, round: FileCounterSchema, entry: FileRoundEntrySchema,
  index: z.number().int().min(0).max(FILE_LIMITS.currentMaterials - 1), removedBy: FileIdSchema, expiresAt: FileIsoSchema,
}) satisfies z.ZodType<FileRemoval>;

export const FileProjectStateSchema = z.strictObject({
  schemaVersion: z.literal(1), projectId: FileIdSchema, revision: FileCounterSchema, currentRound: FileCounterSchema,
  rounds: z.array(FileRoundSchema).min(1), assets: z.array(FileAssetSchema),
  versions: z.array(FileVersionSchema), removals: z.array(FileRemovalSchema),
}).superRefine((state, context) => {
  const issue = (message: string, path: (string | number)[]) => context.addIssue({ code: "custom", message, path });
  const assets = new Map(state.assets.map(asset => [asset.id, asset]));
  const versions = new Map(state.versions.map(version => [version.id, version]));
  if (assets.size !== state.assets.length) issue("중복된 자료 ID입니다.", ["assets"]);
  if (versions.size !== state.versions.length) issue("중복된 버전 ID입니다.", ["versions"]);
  if (new Set(state.removals.map(removal => removal.id)).size !== state.removals.length) issue("중복된 삭제 기록입니다.", ["removals"]);
  if (state.rounds.length !== state.currentRound) issue("회차 개수가 일치하지 않습니다.", ["rounds"]);

  const sourceByAsset = new Map<string, FileVersion>();
  const assetByBlob = new Map<string, string>();
  state.versions.forEach((version, index) => {
    const asset = assets.get(version.assetId);
    if (!asset || asset.sourceKind !== version.source.type || version.createdInRound > state.currentRound) {
      issue("자료 버전의 원본 또는 생성 회차를 확인해 주세요.", ["versions", index]);
    }
    const previous = sourceByAsset.get(version.assetId);
    if (previous && (previous.category !== version.category || (version.source.type === "file"
      && JSON.stringify(previous.source) !== JSON.stringify(version.source)))) {
      issue("같은 자료의 원본과 분류는 변경할 수 없습니다.", ["versions", index]);
    }
    sourceByAsset.set(version.assetId, version);
    if (version.source.type === "file") {
      const blobOwner = assetByBlob.get(version.source.blobId);
      if (blobOwner && blobOwner !== version.assetId) issue("다른 자료의 원본을 참조할 수 없습니다.", ["versions", index, "source"]);
      assetByBlob.set(version.source.blobId, version.assetId);
    }
  });
  const checkEntry = (entry: FileRoundEntry, round: number, path: (string | number)[]) => {
    const version = versions.get(entry.versionId);
    if (!assets.has(entry.assetId) || !version || version.assetId !== entry.assetId || version.createdInRound > round) {
      issue("자료 목록이 존재하지 않거나 다른 자료의 버전을 참조합니다.", path);
    }
  };
  state.rounds.forEach((round, index) => {
    if (round.number !== index + 1 || (round.number === state.currentRound ? round.sealedAt !== null : round.sealedAt === null)) {
      issue("현재 회차와 보관 회차 상태가 일치하지 않습니다.", ["rounds", index]);
    }
    round.entries.forEach((entry, entryIndex) => checkEntry(entry, round.number, ["rounds", index, "entries", entryIndex]));
  });
  state.removals.forEach((removal, index) => {
    if (removal.round > state.currentRound) issue("삭제 기록의 회차를 확인해 주세요.", ["removals", index]);
    checkEntry(removal.entry, removal.round, ["removals", index, "entry"]);
  });
}) satisfies z.ZodType<FileProjectState>;

// File 생성자는 import 때 평가하지 않고 브라우저 입력을 검증할 때만 사용한다.
const UploadFileSchema = z.custom<File>(value => typeof File !== "undefined" && value instanceof File)
  .superRefine((file, context) => {
    try { validateUploadFile(file); } catch (error) {
      context.addIssue({ code: "custom", message: error instanceof Error ? error.message : "파일을 확인해 주세요.",
        params: { fileErrorCode: error instanceof WorkspaceFileError ? error.code : "VALIDATION" } });
    }
  });
export const FileUploadDraftSchema = z.strictObject({ ...FileSettingsSchema.shape, file: UploadFileSchema }) satisfies z.ZodType<FileUploadDraft>;
export const PreparedUploadSchema = z.strictObject({ ...FileSettingsSchema.shape, original: FileOriginalSchema }) satisfies z.ZodType<PreparedUpload>;
const sharedOperations = [
  z.strictObject({ type: z.literal("add-web"), url: WebUrlInput, period: WebPeriodSchema, instruction: Instruction }),
  z.strictObject({ type: z.literal("edit"), assetId: FileIdSchema, sourceVersionId: FileIdSchema, settings: FileSettingsSchema, web: WebOriginalSchema.nullable() }),
  z.strictObject({ type: z.literal("remove"), assetId: FileIdSchema, sourceVersionId: FileIdSchema }),
  z.strictObject({ type: z.literal("undo-remove"), removalId: FileIdSchema }),
  z.strictObject({ type: z.literal("start-round") }),
  z.strictObject({ type: z.literal("reorder"), categoryOrder: FileCategoryOrderSchema }),
] as const;
export const FileOperationSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("add-files"), category: z.enum(["proposal", "related"]), files: z.array(FileUploadDraftSchema).min(1).max(FILE_LIMITS.currentMaterials) }),
  ...sharedOperations,
]) satisfies z.ZodType<FileOperation>;
export const PreparedFileOperationSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("add-files"), category: z.enum(["proposal", "related"]), files: z.array(PreparedUploadSchema).min(1).max(FILE_LIMITS.currentMaterials) }),
  ...sharedOperations,
]) satisfies z.ZodType<PreparedFileOperation>;
const mutationFields = { projectId: FileIdSchema, expectedRevision: FileCounterSchema, expectedRound: FileCounterSchema };
export const FileMutationSchema = z.strictObject({ ...mutationFields, operation: FileOperationSchema }) satisfies z.ZodType<FileMutation>;
export const PreparedFileMutationSchema = z.strictObject({ ...mutationFields, operation: PreparedFileOperationSchema }) satisfies z.ZodType<PreparedFileMutation>;
export const FileOriginalRequestSchema = z.strictObject({ projectId: FileIdSchema, round: FileCounterSchema, versionId: FileIdSchema }) satisfies z.ZodType<FileOriginalRequest>;
