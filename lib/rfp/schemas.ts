import { z } from "zod";

import {
  RFP_FILE_KINDS, RFP_FILE_MAX_BYTES, RFP_FILE_MAX_COUNT, RFP_PERIOD_OPTIONS,
  RFP_REVIEWER_MAX, RFP_SCHEMA_VERSION, RFP_TEXT_FIELDS,
} from "@/config/rfp-register";

// 사용자 id는 Entra 식별자(entra:oid:...)까지 담아야 해서 관리자 IdSchema(120자)보다 길게 둔다.
const UserIdSchema = z.string().trim().min(1).max(200);
const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const RfpPersonSchema = z.strictObject({ id: UserIdSchema, name: z.string().trim().min(1).max(80) });
export const RfpFileMetaSchema = z.strictObject({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(255),
  sizeBytes: z.number().int().nonnegative().max(RFP_FILE_MAX_BYTES),
  kind: z.enum(RFP_FILE_KINDS),
  isMain: z.boolean(),
});
export const RfpRecordSchema = z.strictObject({
  schemaVersion: z.literal(RFP_SCHEMA_VERSION),
  id: z.string().min(1).max(80),
  namespace: UserIdSchema,
  name: z.string().trim().min(1).max(200),
  org: z.string().trim().min(1).max(120),
  dueDate: DateOnlySchema,
  budgetKrw: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
  summary: z.string().trim().min(1).max(4000),
  officialName: z.string().trim().max(300),
  period: z.enum(RFP_PERIOD_OPTIONS).nullable(),
  memo: z.string().trim().max(4000),
  reviewers: z.array(RfpPersonSchema).min(1).max(RFP_REVIEWER_MAX)
    .refine((list) => new Set(list.map((p) => p.id)).size === list.length, "중복된 검토자입니다."),
  files: z.array(RfpFileMetaSchema).max(RFP_FILE_MAX_COUNT)
    .refine((list) => list.length === 0 || list.filter((f) => f.isMain).length === 1, "대표 RFP는 하나여야 합니다."),
  // 등록 시점까지 AI 값이 유지된 칸
  aiExtractedFields: z.array(z.enum(RFP_TEXT_FIELDS)),
  registeredBy: RfpPersonSchema,
  pmId: UserIdSchema, // 등록자 id (D04)
  departmentName: z.string().trim().max(80).nullable(), // 등록자 부서 (D04)
  status: z.literal("review"),
  createdAt: z.iso.datetime(),
});

export type RfpPerson = z.infer<typeof RfpPersonSchema>;
export type RfpFileMeta = z.infer<typeof RfpFileMetaSchema>;
export type RfpRecord = z.infer<typeof RfpRecordSchema>;
