import { z } from "zod";
import { AdminRecordSchema, IdSchema, IsoSchema, NameSchema } from "@/lib/admin/record-schema";
import { AssetVisibilitySchema } from "@/lib/admin/assets/schemas";

const Counter = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
export const PromptSourceSchema = z.enum(["proposal", "related", "web"]);
export const PromptStatusSchema = z.enum(["draft", "active"]);
export const PromptItemSchema = z.strictObject({
  id: IdSchema, level: z.union([z.literal(1), z.literal(2)]), title: z.string().trim().min(1, "목차명을 입력하세요.").max(120),
  prompt: z.string().trim().max(10000), sources: z.array(PromptSourceSchema).max(3).refine(values => new Set(values).size === values.length, "소스가 중복되었습니다.").nullable(),
});
export const PromptItemsSchema = z.array(PromptItemSchema).min(1, "대목차를 하나 이상 입력하세요.").max(100).superRefine((items, ctx) => {
  if (items[0]?.level !== 1) ctx.addIssue({ code: "custom", path: [0, "level"], message: "첫 항목은 대목차여야 합니다." });
  if (new Set(items.map(item => item.id)).size !== items.length) ctx.addIssue({ code: "custom", message: "목차 ID가 중복되었습니다." });
});
export const PromptValueSchema = z.strictObject({ name: NameSchema, description: z.string().trim().max(1000), items: PromptItemsSchema });
export const PromptRecordSchema = AdminRecordSchema.extend({
  ownerDepartmentId: IdSchema.nullable(), createdBy: IdSchema, status: PromptStatusSchema, visibility: AssetVisibilitySchema,
  currentRevision: Counter, deletedAt: IsoSchema.nullable(),
});
export const PromptRevisionSchema = PromptValueSchema.extend({ id: IdSchema, promptSetId: IdSchema, revision: Counter, createdAt: IsoSchema, createdBy: IdSchema });
export const PromptUsageSchema = z.strictObject({ id: IdSchema, promptSetId: IdSchema, projectId: IdSchema, revision: Counter, mode: z.enum(["project", "section"]) });
export const PromptStoreSchema = z.strictObject({ records: z.array(PromptRecordSchema), revisions: z.array(PromptRevisionSchema), usages: z.array(PromptUsageSchema) });
export const PromptQuerySchema = z.strictObject({
  search: z.string().trim().max(254), departmentId: IdSchema.nullable(),
  visibility: z.enum(["all", "organization", "department", "group", "user", "private"]), status: z.enum(["all", "draft", "active"]),
  page: Counter, pageSize: z.literal(10), sort: z.enum(["name", "updatedAt"]), direction: z.enum(["asc", "desc"]),
});
const Target = z.strictObject({ id: IdSchema, version: Counter });
const Management = { status: PromptStatusSchema, visibility: AssetVisibilitySchema };
export const PromptCommandSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("create-prompt-set"), ownerDepartmentId: IdSchema.nullable(), ...Management, value: PromptValueSchema }),
  z.strictObject({ type: z.literal("update-prompt-set"), target: Target, ...Management, value: PromptValueSchema }),
  z.strictObject({ type: z.literal("duplicate-prompt-set"), target: Target }),
  z.strictObject({ type: z.literal("set-prompt-status"), target: Target, status: PromptStatusSchema }),
  z.strictObject({ type: z.literal("set-prompt-visibility"), target: Target, visibility: AssetVisibilitySchema }),
  z.strictObject({ type: z.literal("delete-prompt-set"), target: Target }),
]);
export type PromptSource = z.infer<typeof PromptSourceSchema>;
export type PromptStatus = z.infer<typeof PromptStatusSchema>;
export type PromptItem = z.infer<typeof PromptItemSchema>;
export type PromptValue = z.infer<typeof PromptValueSchema>;
export type PromptRecord = z.infer<typeof PromptRecordSchema>;
export type PromptRevision = z.infer<typeof PromptRevisionSchema>;
export type PromptStore = z.infer<typeof PromptStoreSchema>;
export type PromptUsage = z.infer<typeof PromptUsageSchema>;
export type PromptQuery = z.infer<typeof PromptQuerySchema>;
export type PromptCommand = z.infer<typeof PromptCommandSchema>;
