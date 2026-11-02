import type { PromptRecord, PromptRevision, PromptQuery, PromptCommand, PromptUsage } from "@/lib/admin/prompts/schemas";
import type { AdminActor, PageResult, RfpStatus } from "@/types/admin";
import type { AssetAudienceOptions, AssetCapabilities } from "@/types/admin-assets";
export type { PromptSource, PromptStatus, PromptItem, PromptValue, PromptRecord, PromptRevision, PromptStore, PromptQuery, PromptCommand } from "@/lib/admin/prompts/schemas";
export interface PromptRow extends PromptRecord, Pick<PromptRevision, "name" | "description"> {
  ownerDepartmentName: string; authorName: string; majorCount: number; minorCount: number; usageCount: number; capabilities: Omit<AssetCapabilities, "apply">;
}
export interface PromptUsageRow extends PromptUsage { projectName: string; departmentName: string; status: RfpStatus }
export interface PromptDetail { row: PromptRow; revision: PromptRevision; usages: PromptUsageRow[]; history: { id: string; occurredAt: string; actorName: string; detail: string }[] }
export interface PromptList { rows: PageResult<PromptRow>; counts: Record<"all" | "active" | "draft", number>; departments: { id: string; name: string }[] }
export interface PromptReceipt { id: string; version: number; contentRevision: number }
export interface PromptDataService {
  getPromptSets(actor: AdminActor, query: PromptQuery): Promise<PromptList>;
  getPromptSet(actor: AdminActor, id: string): Promise<PromptDetail>;
  getPromptAudience(actor: AdminActor): Promise<AssetAudienceOptions>;
  executePrompt(actor: AdminActor, command: PromptCommand): Promise<PromptReceipt>;
}
