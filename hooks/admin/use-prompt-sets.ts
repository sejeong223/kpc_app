"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { adminQueryKey } from "@/lib/admin/query-keys";
import type { AdminDataError } from "@/lib/admin/errors";
import type { AssetAudienceOptions } from "@/types/admin-assets";
import type { PromptCommand, PromptDetail, PromptList, PromptQuery, PromptReceipt } from "@/types/admin-prompts";
export function usePromptSets(query: PromptQuery) {
  const { actor, service, revision, access } = useAdminRuntime();
  return useQuery<PromptList, AdminDataError>({ queryKey: adminQueryKey({ actor, revision, kind: "prompt-sets", filter: query }), queryFn: () => service.getPromptSets(actor, query), enabled: typeof window !== "undefined" && Boolean(access?.grants.promptSets.read) });
}
export function usePromptSet(id: string | null) {
  const { actor, service, revision, access } = useAdminRuntime();
  return useQuery<PromptDetail, AdminDataError>({ queryKey: adminQueryKey({ actor, revision, kind: "prompt-set", filter: { promptSetId: id } }), queryFn: () => service.getPromptSet(actor, id!), enabled: typeof window !== "undefined" && Boolean(id && access?.grants.promptSets.read) });
}
export function usePromptAudience() {
  const { actor, service, revision, access } = useAdminRuntime();
  return useQuery<AssetAudienceOptions, AdminDataError>({ queryKey: adminQueryKey({ actor, revision, kind: "prompt-audience" }), queryFn: () => service.getPromptAudience(actor), enabled: typeof window !== "undefined" && Boolean(access?.grants.promptSets.read) });
}
export function usePromptCommand() {
  const { actor, service } = useAdminRuntime();
  return useMutation<PromptReceipt, AdminDataError, PromptCommand>({ mutationFn: command => service.executePrompt(actor, command) });
}
