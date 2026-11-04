import { StoredWorkspaceStateSchema } from "./state-compatibility";
import { z } from "zod";
import { WorkspaceIdSchema, WorkspaceStateSchema } from "./schemas";
import { FileProjectStateSchema } from "@/lib/workspace/files/schemas";
import type { StoredWorkspaceBlob } from "@/types/workspace-production";
export const WorkspaceRecordSchema = z.strictObject({
  namespace: z.string().min(1),
  projectId: WorkspaceIdSchema,
  state: WorkspaceStateSchema,
});
export const StoredWorkspaceRecordSchema = WorkspaceRecordSchema.extend({ state: StoredWorkspaceStateSchema });
export const FileProjectRecordSchema = z.strictObject({
  namespace: z.string().min(1),
  projectId: WorkspaceIdSchema,
  state: FileProjectStateSchema,
});
export const WorkspaceBlobRecordSchema = z
  .strictObject({
    namespace: z.string().min(1),
    projectId: WorkspaceIdSchema,
    id: WorkspaceIdSchema,
    kind: z.enum(["template", "ppt", "image"]),
    blob: z.custom<Blob>(
      (value) => typeof Blob !== "undefined" && value instanceof Blob,
    ),
    filename: z.string().min(1).max(255),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    byteLength: z
      .number()
      .int()
      .positive()
      .max(250 * 1024 * 1024),
    createdAt: z.iso.datetime(),
  })
  .refine(
    (v) => v.blob.size === v.byteLength,
  ) satisfies z.ZodType<StoredWorkspaceBlob>;
export const WorkspacePreferenceSchema = z.strictObject({
  namespace: z.string().min(1),
  key: z.literal("selected-project"),
  projectId: WorkspaceIdSchema,
});
