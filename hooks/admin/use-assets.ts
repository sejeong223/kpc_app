"use client";
import { useMutation,useQuery } from "@tanstack/react-query";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { adminQueryKey } from "@/lib/admin/query-keys";
import type { AdminDataError } from "@/lib/admin/errors";
import type { AssetAudienceOptions,AssetCommand,AssetDetail,AssetKind,AssetList,AssetQuery,AssetReceipt,StagedTemplateSource } from "@/types/admin-assets";
import type { TemplateProgress } from "@/types/pptx-template";
import type { TemplatePreviewData } from "@/types/template-work";

export function useAssets(query:AssetQuery){
  const {actor,service,revision,access}=useAdminRuntime();
  return useQuery<AssetList,AdminDataError>({queryKey:adminQueryKey({actor,revision,kind:"assets",filter:query}),queryFn:()=>service.getAssets(actor,query),enabled:typeof window!=="undefined"&&Boolean(access?.grants[query.kind==="skill"?"skills":"templates"].read)});
}
export function useAsset(id:string|null,kind?:AssetKind){
  const {actor,service,revision,access}=useAdminRuntime();
  const allowed=kind?access?.grants[kind==="skill"?"skills":"templates"].read:access?.grants.skills.read&&access.grants.templates.read;
  return useQuery<AssetDetail,AdminDataError>({queryKey:adminQueryKey({actor,revision,kind:"asset",filter:{assetId:id??""}}),queryFn:()=>service.getAsset(actor,id!),enabled:typeof window!=="undefined"&&Boolean(id&&allowed)});
}
export function useAssetAudience(kind:AssetKind){
  const {actor,service,revision,access}=useAdminRuntime();
  return useQuery<AssetAudienceOptions,AdminDataError>({queryKey:adminQueryKey({actor,revision,kind:"asset-audience-"+kind}),queryFn:()=>service.getAssetAudience(actor,kind),enabled:typeof window!=="undefined"&&Boolean(access?.grants[kind==="skill"?"skills":"templates"].read)});
}
export function useAssetCommand(){const {actor,service}=useAdminRuntime();return useMutation<AssetReceipt,AdminDataError,AssetCommand>({mutationFn:command=>service.executeAsset(actor,command)});}
export function useTemplateImport(){const {actor,service}=useAdminRuntime();return useMutation<StagedTemplateSource,Error,{file:File;signal?:AbortSignal;onProgress?:TemplateProgress}>({mutationFn:input=>service.importTemplate(actor,input.file,input.signal,input.onProgress),gcTime:0});}
export function useTemplatePreview(fileRefId:string|null,assetId?:string){
  const {actor,service,revision,access}=useAdminRuntime();
  return useQuery<TemplatePreviewData,AdminDataError>({queryKey:adminQueryKey({actor,revision,kind:"template-preview",filter:{fileRefId:fileRefId??"",assetId:assetId??null}}),queryFn:()=>service.getTemplatePreview(actor,fileRefId!,assetId),enabled:typeof window!=="undefined"&&Boolean(fileRefId&&access?.grants.templates.read),gcTime:0});
}
