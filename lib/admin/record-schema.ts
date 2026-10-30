import { z } from "zod";
export const IdSchema = z.string().trim().min(1).max(120);
export const NameSchema = z.string().trim().min(1).max(80);
export const IsoSchema = z.iso.datetime();
export const AdminRecordSchema = z.strictObject({
  id: IdSchema,
  version: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  createdAt: IsoSchema,
  updatedAt: IsoSchema,
});
