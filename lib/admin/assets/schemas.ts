import { z } from "zod";
import { AdminRecordSchema, IdSchema, IsoSchema, NameSchema } from "@/lib/admin/record-schema";
import { ObjectRoleSchema, PageTypeSchema, SkillRulesSchema } from "@/lib/skills/schema";

const Counter = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const Index = z.number().int().min(0).max(199);
const Short = z.string().trim().min(1).max(20);
const Description = z.string().trim().max(1000);
const Target = z.strictObject({ id: IdSchema, version: Counter });
const Named = z.strictObject({ name: NameSchema, short: Short, description: Description });
const ObjectId = z.string().min(1).max(400);
const PageTypes = z.record(z.string().regex(/^(0|[1-9]\d?)$|^1\d\d$/), PageTypeSchema);
const Mapping = z.strictObject({ pageTypes: PageTypes, roles: z.record(ObjectId, ObjectRoleSchema), excluded: z.array(ObjectId).max(200_000).refine(ids => new Set(ids).size === ids.length, "중복된 요소입니다.") });

export const AssetKindSchema = z.enum(["skill", "template"]);
export const AssetStatusSchema = z.enum(["active", "inactive"]);
export const AssetAudienceTargetSchema = z.strictObject({ type: z.enum(["department", "user", "group"]), id: IdSchema });
export const AssetVisibilitySchema = z.strictObject({ all: z.boolean(), targets: z.array(AssetAudienceTargetSchema).max(100) })
  .transform(value => ({ all: value.all, targets: value.all ? [] : value.targets.filter((target, i, rows) => rows.findIndex(other => other.type === target.type && other.id === target.id) === i) }));
export const AssetRecordSchema = AdminRecordSchema.extend({ kind: AssetKindSchema, ownerDepartmentId: IdSchema.nullable(), createdBy: IdSchema,
  status: AssetStatusSchema, visibility: AssetVisibilitySchema, currentRevision: Counter, deletedAt: IsoSchema.nullable() });
export const AssetRevisionBaseSchema = Named.extend({ id: IdSchema, assetId: IdSchema, revision: Counter, createdAt: IsoSchema, createdBy: IdSchema });
export const TemplateExtractionSchema = z.strictObject({
  filename: z.string().min(1).max(255), byteLength: z.number().int().positive().max(250 * 1024 * 1024), sha256: z.string().regex(/^[a-f0-9]{64}$/),
  widthCm: z.number().finite().min(3).max(200), heightCm: z.number().finite().min(3).max(200), slideCount: z.number().int().min(1).max(200),
  fonts: z.array(z.string()), themes: z.array(z.strictObject({ path: z.string(), name: z.string(), colors: z.array(z.strictObject({ slot: z.string(), color: z.string().regex(/^#[a-f0-9]{6}$/i) })), majorFont: z.string().nullable(), minorFont: z.string().nullable() })),
  layouts: z.array(z.strictObject({ path: z.string(), name: z.string(), masterPath: z.string().nullable(), slideIndices: z.array(Index), placeholderCount: z.number().int().nonnegative() })),
  logoCandidates: z.array(z.strictObject({ objectId: ObjectId, sourcePart: z.string(), slideIndices: z.array(Index) })),
  slides: z.array(z.strictObject({ index: Index, name: z.string(), type: PageTypeSchema, objectCount: z.number().int().nonnegative() })).min(1).max(200), warnings: z.array(z.string()),
});
export const TemplateDefinitionSchema = Mapping.extend({ fileRefId: IdSchema, extraction: TemplateExtractionSchema });
export const SkillAssetRevisionSchema = AssetRevisionBaseSchema.extend({ kind: z.literal("skill"), rules: SkillRulesSchema });
export const TemplateAssetRevisionSchema = AssetRevisionBaseSchema.extend({ kind: z.literal("template"), definition: TemplateDefinitionSchema });
export const AssetRevisionSchema = z.discriminatedUnion("kind", [SkillAssetRevisionSchema, TemplateAssetRevisionSchema]);
export const AssetStoreSchema = z.strictObject({ records: z.array(AssetRecordSchema), skillRevisions: z.array(SkillAssetRevisionSchema), templateRevisions: z.array(TemplateAssetRevisionSchema) });
export const AssetCapabilitiesSchema = z.strictObject({ read: z.boolean(), update: z.boolean(), delete: z.boolean(), duplicate: z.boolean(), apply: z.boolean() });
export const AssetRowSchema = AssetRecordSchema.extend({ ...Named.shape, ownerDepartmentName: z.string(), capabilities: AssetCapabilitiesSchema });
export const AssetDetailSchema = z.strictObject({ asset: AssetRowSchema, revision: AssetRevisionSchema, history: z.array(AssetRevisionBaseSchema.pick({ id: true, revision: true, createdAt: true, createdBy: true })) });
export const AssetQuerySchema = z.strictObject({ kind: AssetKindSchema, search: z.string().trim().max(254), visibility: z.enum(["all", "organization", "department", "group", "user"]), status: z.enum(["all", "active", "inactive"]), page: Counter, pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]), sort: z.enum(["updatedAt", "name"]), direction: z.enum(["asc", "desc"]) });
export const AssetListSchema = z.strictObject({ rows: z.strictObject({ items: z.array(AssetRowSchema), total: z.number().int().nonnegative(), page: Counter, pageSize: Counter, totalPages: Counter }), activeCount: z.number().int().nonnegative(), inactiveCount: z.number().int().nonnegative() });
const Candidate = z.strictObject({ id: IdSchema, name: NameSchema });
export const AssetAudienceOptionsSchema = z.strictObject({ departments: z.array(Candidate), users: z.array(Candidate), groups: z.array(Candidate) });
export const SkillDraftSchema = Named.extend({ rules: SkillRulesSchema });
export const TemplateDraftSchema = Named.extend({ fileRefId: IdSchema, ...Mapping.shape });
const Management = { status: AssetStatusSchema, visibility: AssetVisibilitySchema };
export const AssetCommandSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("create-skill"), ownerDepartmentId: IdSchema.nullable(), ...Management, value: SkillDraftSchema }),
  z.strictObject({ type: z.literal("create-template"), ownerDepartmentId: IdSchema.nullable(), ...Management, value: TemplateDraftSchema }),
  z.strictObject({ type: z.literal("update-skill"), target: Target, ...Management, value: SkillDraftSchema }),
  z.strictObject({ type: z.literal("update-template"), target: Target, ...Management, value: TemplateDraftSchema }),
  z.strictObject({ type: z.literal("set-asset-visibility"), target: Target, visibility: AssetVisibilitySchema }),
  z.strictObject({ type: z.literal("set-asset-status"), target: Target, status: AssetStatusSchema }),
  z.strictObject({ type: z.literal("delete-asset"), target: Target }), z.strictObject({ type: z.literal("duplicate-asset"), target: Target }),
]);
export const AssetReceiptSchema = z.strictObject({ revision: Counter, assetId: IdSchema, assetVersion: Counter, contentRevision: Counter });
export const AppliedAssetRefSchema = z.strictObject({ assetId: IdSchema, revisionId: IdSchema, revision: Counter });
export const ResolvedAssetSchema = z.strictObject({ asset: AssetRecordSchema, revision: AssetRevisionSchema });
export type AssetKind = z.infer<typeof AssetKindSchema>;
export type AssetStatus = z.infer<typeof AssetStatusSchema>;
export type AssetAudienceTarget = z.infer<typeof AssetAudienceTargetSchema>;
export type AssetVisibility = z.infer<typeof AssetVisibilitySchema>;
export type AssetRecord = z.infer<typeof AssetRecordSchema>;
export type AssetRevisionBase = z.infer<typeof AssetRevisionBaseSchema>;
export type TemplateExtraction = z.infer<typeof TemplateExtractionSchema>;
export type TemplateDefinition = z.infer<typeof TemplateDefinitionSchema>;
export type SkillAssetRevision = z.infer<typeof SkillAssetRevisionSchema>;
export type TemplateAssetRevision = z.infer<typeof TemplateAssetRevisionSchema>;
export type AssetRevision = z.infer<typeof AssetRevisionSchema>;
export type AssetStore = z.infer<typeof AssetStoreSchema>;
export type AssetCapabilities = z.infer<typeof AssetCapabilitiesSchema>;
export type AssetRow = z.infer<typeof AssetRowSchema>;
export type AssetDetail = z.infer<typeof AssetDetailSchema>;
export type AssetQuery = z.infer<typeof AssetQuerySchema>;
export type AssetList = z.infer<typeof AssetListSchema>;
export type AssetAudienceOptions = z.infer<typeof AssetAudienceOptionsSchema>;
export type AssetNamedDraft = Pick<AssetRevisionBase, "name" | "short" | "description">;
export type SkillDraft = z.infer<typeof SkillDraftSchema>;
export type TemplateDraft = z.infer<typeof TemplateDraftSchema>;
export type AssetCommand = z.infer<typeof AssetCommandSchema>;
export type AssetReceipt = z.infer<typeof AssetReceiptSchema>;
export type AppliedAssetRef = z.infer<typeof AppliedAssetRefSchema>;
export type ResolvedAsset = z.infer<typeof ResolvedAssetSchema>;
