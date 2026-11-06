import { CanvasCommentStateSchema, CanvasCommandSchema, canvasReferenceErrors } from "./canvas-schemas";
import { z } from "zod";
import {
  WORKSPACE_LIMITS as L,
  PROJECT_PERMISSIONS,
} from "@/config/workspace-production";
import {
  PromptRevisionSchema,
  PromptSourceSchema,
} from "@/lib/admin/prompts/schemas";
import {
  SkillAssetRevisionSchema,
  TemplateAssetRevisionSchema,
} from "@/lib/admin/assets/schemas";
import { FileRoundEntrySchema } from "@/lib/workspace/files/schemas";
import type {
  ProjectWorkspaceState,
  LegacyProjectWorkspaceState,
  LegacyRoundBody,
  WorkspaceMutation,
  PreparedWorkspaceMutation,
  AssetPin,
} from "@/types/workspace-production";

export const WorkspaceIdSchema = z.string().min(1).max(400).regex(/^\S+$/);
const id = WorkspaceIdSchema,
  nullableId = id.nullable();
const count = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  time = z.iso.datetime();
const title = z.string().trim().min(1).max(L.title);
const ids = z
  .array(id)
  .max(1000)
  .refine((a) => new Set(a).size === a.length, "식별자가 중복되었습니다.");
const sources = z
  .array(PromptSourceSchema)
  .max(3)
  .refine((a) => new Set(a).size === a.length);
export const ProjectPermissionSchema = z.enum(PROJECT_PERMISSIONS);
export const ProjectGrantSchema=z.strictObject({userId:id,permissions:z.array(ProjectPermissionSchema).max(5).refine(p=>new Set(p).size===p.length)});
export const ChapterSchema = z.strictObject({ id, title });
export const ManufacturingPromptSchema = z.strictObject({
  intro: z.string().max(10000), bullets: z.array(z.string().max(2000)).max(12),
});
export const SectionSchema = z
  .strictObject({
    demoPrompt: ManufacturingPromptSchema.optional(),
    id,
    chapterId: id,
    title,
    assigneeIds: ids.refine((a) => a.length > 0),
    reviewerIds: ids,
    state: z.enum(["writing", "done"]),
    locked: z.boolean(),
  })
  .refine(
    (s) => !s.locked || s.state === "done",
    "고정 섹션의 상태를 확인해 주세요.",
  );
const blockId = id.refine((value) => value !== "title" && value !== "lead");
export const ContentBlockSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    id: blockId,
    kind: z.literal("text"),
    text: z.string().max(L.text),
  }),
  z.strictObject({
    id: blockId,
    kind: z.literal("list"),
    items: z.array(z.string().max(L.itemText)).max(L.listItems),
  }),
  z
    .strictObject({
      id: blockId,
      kind: z.literal("table"),
      columns: z.array(z.string().max(L.itemText)).min(1).max(L.columns),
      rows: z
        .array(z.array(z.string().max(L.itemText)).min(1).max(L.columns))
        .min(1)
        .max(L.rows),
    })
    .refine(
      (v) => v.rows.every((row) => row.length === v.columns.length),
      "표의 열 수가 다릅니다.",
    ),
  z
    .strictObject({
      id: blockId,
      kind: z.literal("image"),
      blobId: id,
      alt: z.string().max(1000),
      width: count.max(L.imageDimension),
      height: count.max(L.imageDimension),
      mime: z.enum(["image/png", "image/jpeg"]),
    })
    .refine((v) => v.width * v.height <= L.imagePixels),
]);
export const SlideContentSchema = z
  .strictObject({
    title: z.string().max(L.title),
    lead: z.string().max(L.lead),
    blocks: z.array(ContentBlockSchema).max(L.blocks),
  })
  .refine((v) => new Set(v.blocks.map((b) => b.id)).size === v.blocks.length);
export const SlideTemplateSchema = z
  .strictObject({
    pinId: id,
    sourceSlidePath: z
      .string()
      .min(1)
      .max(400)
      .refine((p) => !p.includes("..") && /^ppt\/slides\/.+\.xml$/.test(p)),
    bindings: z
      .array(z.strictObject({ key: id, objectId: id }))
      .max(L.blocks + 2),
  })
  .refine(
    (v) =>
      new Set(v.bindings.map((b) => b.key)).size === v.bindings.length &&
      new Set(v.bindings.map((b) => b.objectId)).size === v.bindings.length,
    "같은 요소를 중복 지정할 수 없습니다.",
  );
export const SourceRefSchema = z
  .strictObject({
    id,
    kind: z.enum(["requirement", "file"]),
    targetId: id,
    fileRound: count.nullable(),
    versionId: nullableId,
    page: count.nullable(),
    quote: z.string().max(L.text).nullable(),
    provenance: z.enum(["mock", "manual"]),
  })
  .refine((s) =>
    s.kind === "file"
      ? s.fileRound !== null && s.versionId !== null
      : s.fileRound === null && s.versionId === null,
  );
export const UsedSettingsSchema = z.strictObject({
  skillPinId: nullableId,
  promptPinId: nullableId,
  promptItemId: nullableId,
  prompt: z.string().max(10000),
  sources,
});
export const ProposalSlideSchema = z
  .strictObject({
    demoSourceKey: id.optional(),
    id,
    sectionId: id,
    revision: count,
    content: SlideContentSchema,
    template: SlideTemplateSchema.nullable(),
    usedSettings: UsedSettingsSchema,
    sources: z.array(SourceRefSchema).max(200),
  })
  .refine(
    (s) =>
      !s.template ||
      s.template.bindings.every(
        (b) =>
          b.key === "title" ||
          b.key === "lead" ||
          s.content.blocks.some((v) => v.id === b.key),
      ),
    "내용과 요소 연결이 다릅니다.",
  );
export const RequirementSchema = z.strictObject({
  id,
  sectionId: nullableId,
  title,
  coverage: z.enum(["none", "partial", "full"]),
  page: count.nullable(),
  excerpt: z.string().max(L.text).nullable(),
  provenance: z.enum(["mock", "manual"]),
});
export const ChecklistSchema = z
  .strictObject({
    id,
    title,
    source: z.string().max(2000),
    assigneeIds: ids,
    done: z.boolean(),
    checkedBy: nullableId,
    checkedAt: time.nullable(),
  })
  .refine((v) =>
    v.done
      ? v.checkedBy !== null && v.checkedAt !== null
      : v.checkedBy === null && v.checkedAt === null,
  );
export const ProjectSettingsSchema = z.strictObject({
  promptPinId: nullableId,
  skillPinId: nullableId,
  templatePinId: nullableId,
  bindings: z
    .array(z.strictObject({ sectionId: id, itemId: nullableId }))
    .max(L.sections),
  overrides: z
    .array(
      z.strictObject({
        itemId: id,
        prompt: z.string().max(10000).nullable(),
        sources: sources.nullable(),
      }),
    )
    .max(100),
});
export const PointSchema = z.strictObject({
  xRatio: z.number().finite().min(0).max(1),
  yRatio: z.number().finite().min(0).max(1),
});
const mention = z.strictObject({
  userId: id,
  name: z.string().min(1).max(500),
  start: z.number().int().min(0),
  end: z.number().int().min(1),
});
export const CommentDraftSchema = z.strictObject({
  text: z.string().min(1).max(L.comment),
  mentions: z.array(mention).max(100),
});
const message = z.strictObject({
  ...CommentDraftSchema.shape,
  id,
  threadId: id,
  authorId: id,
  authorName: z.string().min(1).max(500),
  createdAt: time,
  updatedAt: time.nullable(),
  deletedAt: time.nullable(),
  revision: count,
});
export const ProjectThreadSchema = z
  .strictObject({
    id,
    sectionId: id,
    slideId: id,
    round: count,
    number: count,
    authorId: id,
    status: z.enum(["open", "resolved"]),
    point: PointSchema.nullable(),
    createdAt: time,
    updatedAt: time,
    resolvedBy: nullableId,
    resolvedAt: time.nullable(),
    revision: count,
    carriedFromId: nullableId,
    messages: z.array(message).min(1).max(1000),
  })
  .refine(
    (v) =>
      v.messages[0].authorId === v.authorId &&
      v.messages.every((m) => m.threadId === v.id) &&
      new Set(v.messages.map((m) => m.id)).size === v.messages.length &&
      (v.status === "open"
        ? v.resolvedBy === null && v.resolvedAt === null
        : v.resolvedBy !== null && v.resolvedAt !== null),
  );
const LegacyRoundBodySchema = z.strictObject({
  chapters: z.array(ChapterSchema).max(L.chapters),
  sections: z.array(SectionSchema).max(L.sections),
  slides: z.array(ProposalSlideSchema).max(L.slides),
  requirements: z.array(RequirementSchema).max(1000),
  checklist: z.array(ChecklistSchema).max(1000),
  settings: ProjectSettingsSchema,
  threads: z.array(ProjectThreadSchema).max(5000),
});
export const RoundBodySchema = LegacyRoundBodySchema.extend({ canvasComments: CanvasCommentStateSchema });
const pinBase = {
  id,
  assetId: id,
  revisionId: id,
  revision: count,
  name: title,
  capturedAt: time,
  capturedBy: id,
};
export const AssetPinSchema = z
  .discriminatedUnion("kind", [
    z.strictObject({
      ...pinBase,
      kind: z.literal("prompt"),
      snapshot: PromptRevisionSchema,
    }),
    z.strictObject({
      ...pinBase,
      kind: z.literal("skill"),
      snapshot: SkillAssetRevisionSchema,
    }),
    z.strictObject({
      ...pinBase,
      kind: z.literal("template"),
      snapshot: TemplateAssetRevisionSchema,
      blobId: id,
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  ])
  .refine(
    (p) =>
      p.revisionId === p.snapshot.id &&
      p.revision === p.snapshot.revision &&
      p.assetId ===
        (p.kind === "prompt" ? p.snapshot.promptSetId : p.snapshot.assetId),
  );
const element = z.strictObject({
  key: id,
  objectId: id,
  shapeId: id,
  kind: z.enum(["text", "list", "table", "image"]),
});
export const ExportManifestSchema = z
  .strictObject({
    version: z.literal(1),
    projectId: id,
    round: count,
    inputRevision: count,
    exportId: id,
    slides: z
      .array(
        z.strictObject({
          id,
          sectionId: id,
          path: id,
          sourcePinId: id,
          sourcePath: id,
          elements: z.array(element).max(L.blocks + 2),
        }),
      )
      .min(1)
      .max(L.slides),
  })
  .refine(
    (v) =>
      new Set(v.slides.map((s) => s.id)).size === v.slides.length &&
      new Set(v.slides.map((s) => s.path)).size === v.slides.length,
  );
export const PptVersionSchema = z.strictObject({
  id,
  index: count,
  round: count,
  snapshotId: nullableId,
  kind: z.enum(["generated", "uploaded"]),
  pinIds: ids,
  blobId: id,
  filename: z.string().min(1).max(255),
  byteLength: count.max(250 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  createdAt: time,
  createdBy: id,
  inputRevision: count,
  baseVersionId: nullableId,
  manifest: ExportManifestSchema.nullable(),
});
const snapshot = z.strictObject({
  id,
  round: count,
  kind: z.enum(["complete", "unfinished"]),
  createdAt: time,
  createdBy: id,
  inputRevision: count,
  body: RoundBodySchema,
  fileEntries: z.array(FileRoundEntrySchema),
  fileRevision: count,
  pptVersionId: nullableId,
});
const undo = z.strictObject({
  id,
  actorId: id,
  expiresAt: time,
  afterRevision: count,
  round: count,
  label: title,
  previousBody: RoundBodySchema,
  sectionIds: ids,
  permission: z.enum([...PROJECT_PERMISSIONS, "content"]),
});

export function bodyReferenceErrors(
  body: LegacyRoundBody,
  pins: readonly AssetPin[],
): string[] {
  const errors: string[] = [],
    chapters = new Set(body.chapters.map((v) => v.id)),
    sections = new Map(body.sections.map((v) => [v.id, v])),
    slides = new Map(body.slides.map((v) => [v.id, v]));
  for (const rows of [
    body.chapters,
    body.sections,
    body.slides,
    body.requirements,
    body.checklist,
    body.threads,
  ])
    if (new Set(rows.map((v) => v.id)).size !== rows.length)
      errors.push("중복된 항목 ID입니다.");
  if (
    body.sections.some((s) => !chapters.has(s.chapterId)) ||
    body.slides.some((s) => !sections.has(s.sectionId)) ||
    body.requirements.some(
      (r) => r.sectionId !== null && !sections.has(r.sectionId),
    )
  )
    errors.push("존재하지 않는 상위 항목입니다.");
  if (
    body.threads.some((t) => slides.get(t.slideId)?.sectionId !== t.sectionId)
  )
    errors.push("의견의 슬라이드 연결이 다릅니다.");
  const pin = (value: string | null, kind: AssetPin["kind"]) =>
    value === null || pins.some((p) => p.id === value && p.kind === kind);
  if (
    !pin(body.settings.promptPinId, "prompt") ||
    !pin(body.settings.skillPinId, "skill") ||
    !pin(body.settings.templatePinId, "template")
  )
    errors.push("제작 설정의 적용 사본이 없습니다.");
  const promptItems = (pinId: string | null) => {
    const p = pins.find((p) => p.id === pinId);
    return p?.kind === "prompt" ? p.snapshot.items : [];
  };
  const items = promptItems(body.settings.promptPinId);
  if (
    new Set(body.settings.bindings.map((b) => b.sectionId)).size !==
      body.settings.bindings.length ||
    new Set(body.settings.overrides.map((b) => b.itemId)).size !==
      body.settings.overrides.length ||
    body.settings.bindings.some(
      (b) =>
        !sections.has(b.sectionId) ||
        (b.itemId !== null && !items.some((i) => i.id === b.itemId)),
    ) ||
    body.settings.overrides.some((o) => !items.some((i) => i.id === o.itemId))
  )
    errors.push("프롬프트 연결을 확인해 주세요.");
  for (const s of body.slides) {
    if (
      !pin(s.template?.pinId ?? null, "template") ||
      !pin(s.usedSettings.skillPinId, "skill") ||
      !pin(s.usedSettings.promptPinId, "prompt") ||
      (s.usedSettings.promptItemId !== null &&
        !promptItems(s.usedSettings.promptPinId).some(
          (i) => i.id === s.usedSettings.promptItemId,
        ))
    )
      errors.push("슬라이드 적용 사본을 확인해 주세요.");
    if (
      new Set(s.sources.map((v) => v.id)).size !== s.sources.length ||
      s.sources.some(
        (v) =>
          v.kind === "requirement" &&
          !body.requirements.some((r) => r.id === v.targetId),
      )
    )
      errors.push("출처 연결을 확인해 주세요.");
  }
  return errors;
}
const WorkspaceStateBase = z
  .strictObject({
    nextCommentNumber: count,
    schemaVersion: z.literal(2),
    projectId: id,
    revision: count,
    inputRevision: count,
    currentRound: count,
    phase: z.enum(["writing", "completed"]),
    grants: z.array(ProjectGrantSchema),
    body: RoundBodySchema,
    snapshots: z.array(snapshot),
    pins: z.array(AssetPinSchema),
    pptVersions: z.array(PptVersionSchema),
    reviews: z.array(ProjectThreadSchema),
    undo: undo.nullable(),
  });
function validateStateReferences(state: Omit<LegacyProjectWorkspaceState, "schemaVersion">, ctx: z.RefinementCtx) {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    for (const body of [
      state.body,
      ...state.snapshots.map((s) => s.body),
      ...(state.undo ? [state.undo.previousBody] : []),
    ])
      bodyReferenceErrors(body, state.pins).forEach(issue);
    for (const rows of [
      state.pins,
      state.snapshots,
      state.pptVersions,
      state.reviews,
    ])
      if (new Set(rows.map((v) => v.id)).size !== rows.length)
        issue("중복된 보관 식별자입니다.");
    if (
      new Set(state.grants.map((g) => g.userId)).size !== state.grants.length ||
      state.inputRevision > state.revision
    )
      issue("프로젝트 버전/권한 기록이 다릅니다.");
    if (
      new Set(state.snapshots.map((s) => s.round)).size !==
        state.snapshots.length ||
      state.snapshots.some(
        (s) =>
          s.round > state.currentRound || s.inputRevision > state.inputRevision,
      )
    )
      issue("보관 회차가 다릅니다.");
    if (
      state.phase === "completed" &&
      !state.snapshots.some(
        (s) => s.round === state.currentRound && s.kind === "complete",
      )
    )
      issue("완성본이 없습니다.");
    for (const t of state.body.threads)
      if (t.round !== state.currentRound) issue("현재 의견 회차가 다릅니다.");
    for (const s of state.snapshots)
      if (s.body.threads.some((t) => t.round !== s.round))
        issue("보관 의견 회차가 다릅니다.");
    for (const t of state.reviews) {
      const s = state.snapshots.find(
        (s) => s.round === t.round && s.kind === "complete",
      );
      if (
        !s?.body.slides.some(
          (v) => v.id === t.slideId && v.sectionId === t.sectionId,
        )
      )
        issue("리뷰의 보관 슬라이드가 없습니다.");
    }
    for (const v of state.pptVersions)
      if (
        v.round > state.currentRound ||
        v.pinIds.some((id) => !state.pins.some((p) => p.id === id)) ||
        (v.snapshotId !== null &&
          !state.snapshots.some(
            (s) => s.id === v.snapshotId && s.round === v.round,
          )) ||
        (v.manifest &&
          (v.manifest.projectId !== state.projectId ||
            v.manifest.round !== v.round ||
            v.manifest.inputRevision !== v.inputRevision))
      )
        issue("PPT 버전의 보관 연결이 다릅니다.");
}
export const WorkspaceStateSchema = WorkspaceStateBase.superRefine(validateStateReferences).superRefine((state, ctx) => {
  canvasReferenceErrors(state).forEach(message => ctx.addIssue({code:"custom",message}));
}) satisfies z.ZodType<ProjectWorkspaceState>;
export const LegacyWorkspaceStateSchema = z.strictObject({
  ...WorkspaceStateBase.shape,
  schemaVersion: z.literal(1),
  nextCommentNumber: count.default(1),
  body: LegacyRoundBodySchema,
  snapshots: z.array(snapshot.extend({body: LegacyRoundBodySchema})),
  undo: undo.extend({previousBody: LegacyRoundBodySchema}).nullable(),
}).superRefine(validateStateReferences) satisfies z.ZodType<LegacyProjectWorkspaceState>;

const op = <T extends string, S extends z.ZodRawShape>(type: T, fields: S) =>
  z.strictObject({ type: z.literal(type), ...fields });
const publicOperations = [
  op("canvas-command", {command:CanvasCommandSchema}),
  op("save-slide", {
    id,
    content: SlideContentSchema,
    template: SlideTemplateSchema.nullable(),
  }),
  op("add-chapter", { title, afterId: nullableId, beforeId: id.optional() }),
  op("rename-chapter", { id, title }),
  op("move-chapter", { id, beforeId: nullableId }),
  op("remove-chapter", { id }),
  op("add-section", {
    chapterId: id,
    title,
    afterId: nullableId,
    beforeId: id.optional(),
  }),
  op("rename-section", { id, title }),
  op("move-section", { id, chapterId: id, beforeId: nullableId }),
  op("remove-section", { id }),
  op("assign-section", {
    id,
    assigneeIds: ids.refine((a) => a.length > 0),
    reviewerIds: ids,
  }),
  op("set-grants", ProjectGrantSchema.shape),
  op("set-grants-batch", {grants:z.array(ProjectGrantSchema).min(1).max(1000).refine(rows=>new Set(rows.map(r=>r.userId)).size===rows.length)}),
  op("set-section-state", { id, state: z.enum(["writing", "done"]) }),
  op("apply-manufacturing-prompt", { sectionId: id, slideId: id, prompt: ManufacturingPromptSchema }),
  op("unlock-section", { id }),
  op("add-check", { title, source: z.string().max(2000) }),
  op("edit-check", { id, title, source: z.string().max(2000) }),
  op("assign-check", { id, assigneeIds: ids }),
  op("check", { id, done: z.boolean() }),
  op("remove-check", { id }),
  op("add-slide", {
    sectionId: id,
    afterId: nullableId,
    template: SlideTemplateSchema.nullable(),
  }),
  op("edit-slide", { id, content: SlideContentSchema }),
  op("bind-slide", { id, template: SlideTemplateSchema }),
  op("duplicate-slide", { id, targetSectionId: id, afterId: nullableId }),
  op("move-slide", { id, sectionId: id, beforeId: nullableId }),
  op("remove-slide", { id }),
  op("set-sources", { id, sources: z.array(SourceRefSchema).max(200) }),
  op("set-coverage", {
    requirementId: id,
    coverage: z.enum(["none", "partial", "full"]),
  }),
  op("map-prompt", { sectionId: id, itemId: nullableId }),
  op("override-prompt", {
    itemId: id,
    prompt: z.string().max(10000).nullable(),
    sources: sources.nullable(),
  }),
  op("comment-create", {
    sectionId: id,
    slideId: id,
    point: PointSchema.nullable(),
    draft: CommentDraftSchema,
    review: z.boolean(),
  }),
  op("comment-reply", {
    threadId: id,
    draft: CommentDraftSchema,
    review: z.boolean(),
  }),
  op("comment-edit", {
    threadId: id,
    messageId: id,
    draft: CommentDraftSchema,
    review: z.boolean(),
  }),
  op("comment-delete", {
    threadId: id,
    messageId: nullableId,
    review: z.boolean(),
  }),
  op("comment-move", {
    threadId: id,
    point: PointSchema.nullable(),
    review: z.boolean(),
  }),
  op("comment-status", {
    threadId: id,
    status: z.enum(["open", "resolved"]),
    review: z.boolean(),
  }),
  op("complete", { expectedFileRevision: count, acknowledged: z.boolean() }),
  op("start-round", { expectedFileRevision: count, acknowledged: z.boolean() }),
  op("undo", { id }),
] as const;
const scope = { projectId: id, expectedRevision: count, expectedRound: count };
export const WorkspaceMutationSchema = z.strictObject({
  ...scope,
  operation: z.discriminatedUnion("type", publicOperations),
}) satisfies z.ZodType<WorkspaceMutation>;
export const PreparedWorkspaceMutationSchema = z.strictObject({
  ...scope,
  operation: z.discriminatedUnion("type", [
    ...publicOperations,
    op("batch-slides", {
      operation: z.enum(["move", "remove"]),
      slideIds: ids.min(1).max(L.slides),
      sectionId: nullableId,
      beforeId: nullableId,
    }),
    op("pin-assets", {
      pins: z.array(AssetPinSchema),
      settings: ProjectSettingsSchema,
      slides: z.array(ProposalSlideSchema).max(L.slides),
    }),
    op("apply-proposal", {
      sectionIds: ids,
      chapters: z.array(ChapterSchema).max(L.chapters).nullable(),
      sections: z.array(SectionSchema).max(L.sections).nullable(),
      slides: z.array(ProposalSlideSchema).max(L.slides).nullable(),
      requirements: z
        .array(RequirementSchema)
        .max(1000)
        .nullable()
        .default(null),
      checklist: z.array(ChecklistSchema).max(1000).nullable().default(null),
    }),
    op("replace-content", {
      sectionIds: ids,
      slides: z.array(ProposalSlideSchema).max(L.slides),
      pins: z.array(AssetPinSchema),
    }),
    op("register-ppt", { version: PptVersionSchema }),
    op("complete-manufacturing-demo", { expectedFileRevision: count, acknowledged: z.boolean(), version: PptVersionSchema }),
    op("protect-ppt", { versionId: id, pinIds: ids }),
  ]),
}) satisfies z.ZodType<PreparedWorkspaceMutation>;

export const ProjectRequestSchema = z.strictObject(scope);
export const MockRequestSchema = ProjectRequestSchema.extend({
  kind: z.enum(["recommend-toc", "edit-toc", "draft", "polish", "check"]),
  sectionIds: ids,
  slideIds: ids,
  instruction: z.string().trim().min(1).max(4000),
});
