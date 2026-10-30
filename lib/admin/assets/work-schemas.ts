import { z } from "zod";
import { IdSchema, IsoSchema } from "@/lib/admin/record-schema";
import { VersionedRefSchema } from "@/lib/admin/schemas";
import { AppliedAssetRefSchema } from "./schemas";
import { TemplateOptionsSchema } from "@/lib/pptx/options-schema";

const counter = z.number().int().positive().safe();
export const WorkResultSummarySchema = z.strictObject({ id:IdSchema,inputRevision:counter,template:AppliedAssetRefSchema,skill:AppliedAssetRefSchema,createdAt:IsoSchema,filename:z.string().min(1),changed:z.number().int().nonnegative(),kept:z.number().int().nonnegative(),skipped:z.number().int().nonnegative(),warnings:z.array(z.string()) });
export const TemplateWorkSchema = z.strictObject({ id:IdSchema,ownerId:IdSchema,createdAt:IsoSchema,updatedAt:IsoSchema,version:counter,template:AppliedAssetRefSchema,skill:AppliedAssetRefSchema,options:TemplateOptionsSchema,inputRevision:counter,status:z.enum(["ready","running","succeeded","failed","cancelled"]),progress:z.string(),error:z.strictObject({code:z.enum(["FORBIDDEN","CONFLICT","FILE","CANCELLED"]),message:z.string()}).nullable(),result:WorkResultSummarySchema.nullable() });
export const WorkCommandSchema = z.discriminatedUnion("type",[
  z.strictObject({type:z.literal("create-work"),templateId:IdSchema,skillId:IdSchema}),
  z.strictObject({type:z.literal("update-work-options"),target:VersionedRefSchema,options:TemplateOptionsSchema}),
  z.strictObject({type:z.literal("apply-work"),target:VersionedRefSchema,mode:z.enum(["pinned","latest"])}),
  z.strictObject({type:z.literal("cancel-work"),id:IdSchema}),
  z.strictObject({type:z.literal("discard-work"),id:IdSchema}),
]);
