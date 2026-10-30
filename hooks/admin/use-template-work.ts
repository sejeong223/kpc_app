"use client";
import { useSyncExternalStore } from "react";
import { useMutation,useQuery } from "@tanstack/react-query";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { adminQueryKey } from "@/lib/admin/query-keys";
import type { TemplateWorkListItem,WorkCommand,WorkDownload,WorkView } from "@/types/template-work";

export function useTemplateWorks(){
  const {actor,works,revision,access}=useAdminRuntime(),workRevision=useSyncExternalStore(works.subscribe,works.getRevision,()=>0);
  return useQuery<TemplateWorkListItem[],Error>({queryKey:adminQueryKey({actor,revision,kind:"works",filter:{workId:"*",workRevision}}),queryFn:()=>works.getWorks(actor),enabled:typeof window!=="undefined"&&Boolean(access?.grants.skills.read&&access.grants.templates.read),gcTime:0});
}
export function useTemplateWork(id:string|null){
  const {actor,works,revision,access}=useAdminRuntime(),workRevision=useSyncExternalStore(works.subscribe,works.getRevision,()=>0);
  return useQuery<WorkView,Error>({queryKey:adminQueryKey({actor,revision,kind:"work",filter:{workId:id??"",workRevision}}),queryFn:()=>works.getWork(actor,id!),enabled:typeof window!=="undefined"&&Boolean(id&&access?.grants.skills.read&&access.grants.templates.read&&works.canAccess(actor,id)),gcTime:0});
}
export function useTemplateWorkCommand(){const {actor,works}=useAdminRuntime();return useMutation<WorkView|null,Error,WorkCommand>({mutationFn:command=>works.execute(actor,command),gcTime:0});}
export function useTemplateDownload(){const {actor,works}=useAdminRuntime();return useMutation<WorkDownload,Error,{workId:string;resultId:string}>({mutationFn:input=>works.download(actor,input.workId,input.resultId),gcTime:0});}
