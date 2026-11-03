"use client";
import { useQuery } from "@tanstack/react-query";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import {
  useWorkspaceAction,
  activeWorkspaceRead,
  workspaceQueryOptions,
} from "./use-workspace-production";
import type {
  AssetSelection,
  ProjectRequest,
  WorkspaceReceipt,
} from "@/types/workspace-production";
import type { TemplatePreviewData } from "@/types/template-work";
import type { WorkspaceError } from "@/lib/workspace/production/errors";
export { useWorkspaceAssets } from "./use-workspace-production";
export function useApplyWorkspaceAssets() {
  return useWorkspaceAction<
    WorkspaceReceipt,
    ProjectRequest & { selections: AssetSelection[]; replaceSlideIds: string[] }
  >((r, input) => r.assets.apply(input));
}
export function useWorkspaceAssetPreview(
  projectId: string,
  pinId: string | null,
  enabled = true,
) {
  const runtime = useWorkspaceRuntime(),
    { revision } = useAdminRuntime();
  return useQuery<TemplatePreviewData, WorkspaceError>({
    ...workspaceQueryOptions,
    queryKey: [
      ...runtime.queryScope,
      "asset-preview",
      projectId,
      pinId,
      revision,
    ],
    enabled: enabled && !!pinId,
    queryFn: ({ signal }) =>
      activeWorkspaceRead(
        runtime,
        () => runtime.assets.preview(projectId, pinId!, signal),
        signal,
      ),
  });
}
