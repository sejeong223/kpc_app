export type { AssetKind, AssetStatus, AssetAudienceTarget, AssetVisibility, AssetRecord, AssetRevisionBase, TemplateExtraction, TemplateDefinition, SkillAssetRevision, TemplateAssetRevision, AssetRevision, AssetStore, AssetCapabilities, AssetRow, AssetDetail, AssetQuery, AssetList, AssetAudienceOptions, AssetNamedDraft, SkillDraft, TemplateDraft, AssetCommand, AssetReceipt, AppliedAssetRef, ResolvedAsset } from "@/lib/admin/assets/schemas";

import type { TemplateExtraction } from "@/lib/admin/assets/schemas";
import type { TemplatePreviewData } from "@/types/template-work";
export interface StagedTemplateSource { id: string; filename: string; byteLength: number; sha256: string; extraction: TemplateExtraction }

import type { AdminActor, AdminAccessView } from "@/types/admin";
import type { AssetKind, AssetQuery, AssetList, AssetDetail, AssetAudienceOptions, AssetCommand, AssetReceipt, AppliedAssetRef, ResolvedAsset } from "@/lib/admin/assets/schemas";
export interface AssetDataService {
  getAssets(actor:AdminActor, query:AssetQuery):Promise<AssetList>;
  getAsset(actor:AdminActor,id:string):Promise<AssetDetail>;
  getAssetAudience(actor:AdminActor,kind:AssetKind):Promise<AssetAudienceOptions>;
  executeAsset(actor:AdminActor,command:AssetCommand):Promise<AssetReceipt>;
  importTemplate(actor:AdminActor,file:File,signal?:AbortSignal,onProgress?:(message:string)=>void):Promise<StagedTemplateSource>;
  discardTemplateImport(actor:AdminActor,fileRefId:string):void;
  getTemplatePreview(actor:AdminActor,fileRefId:string,assetId?:string):Promise<TemplatePreviewData>;
}
export interface AssetRuntimeHost extends AssetDataService {
  getAccess(actor:AdminActor):Promise<AdminAccessView>;
  resolveAsset(actor:AdminActor,ref:AppliedAssetRef|{assetId:string},mode:"new"|"existing"):ResolvedAsset;
  recordWorkActivity(actor:AdminActor,refs:{template:AppliedAssetRef;skill:AppliedAssetRef},action:"apply"|"export",workId:string):void;
  subscribe(listener:()=>void):()=>void;
  getRevision():number;
}
