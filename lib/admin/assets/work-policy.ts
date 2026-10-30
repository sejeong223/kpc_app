import type { AdminActor } from "@/types/admin";
import type { AppliedAssetRef,AssetRuntimeHost,ResolvedAsset,TemplateAssetRevision } from "@/types/admin-assets";
import type { TemplateOptions } from "@/types/pptx-template";
import type { TemplateWork } from "@/types/template-work";

export function assetRef(value:ResolvedAsset):AppliedAssetRef { return {assetId:value.asset.id,revisionId:value.revision.id,revision:value.revision.revision}; }
export function buildDefaultOptions(revision:TemplateAssetRevision):TemplateOptions {
  return {layout:false,images:false,selectedSlides:revision.definition.extraction.slides.map(s=>s.index),pageTypes:structuredClone(revision.definition.pageTypes),roles:structuredClone(revision.definition.roles),excluded:[...revision.definition.excluded],sharedEdits:[]};
}
export function canDownloadWork(work:TemplateWork,currentlyAllowed:boolean):boolean { return currentlyAllowed&&work.status!=="running"&&work.result!==null&&work.result.inputRevision===work.inputRevision; }
export function resolveLatestCandidates(host:AssetRuntimeHost,actor:AdminActor,work:TemplateWork) {
  return {template:host.resolveAsset(actor,{assetId:work.template.assetId},"new"),skill:host.resolveAsset(actor,{assetId:work.skill.assetId},"new")};
}
