"use client";
import { useEffect, useState } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import { activeWorkspaceRead } from "./use-workspace-production";
import { productionPreviewFingerprint } from "@/lib/workspace/production/presentation";
import type { ProjectView, ProposalSlide } from "@/types/workspace-production";
import type { TemplatePreviewData } from "@/types/template-work";
import type { WorkspaceError } from "@/lib/workspace/production/errors";

const options = { staleTime: Infinity, gcTime: 5 * 60000, retry: false, refetchOnWindowFocus: false } as const;
export function useProductionPreview(view: ProjectView, slide: ProposalSlide, snapshotId: string | null, enabled: boolean): UseQueryResult<{ preview: TemplatePreviewData; warnings: string[] }, WorkspaceError> {
  const runtime = useWorkspaceRuntime();
  const accessible = !!slide.template && [slide.template.pinId, slide.usedSettings.skillPinId, slide.usedSettings.promptPinId].filter(Boolean).every(id => view.assetAccess.find(a => a.pinId === id)?.access.status === "available");
  return useQuery({ ...options,
    queryKey: [...runtime.queryScope, "production-preview", view.project.id, snapshotId, view.state.currentRound, slide.id, productionPreviewFingerprint(view, slide)],
    enabled: enabled && accessible,
    queryFn: ({ signal }) => activeWorkspaceRead(runtime, () => runtime.service.previewSlide({ projectId: view.project.id, slideId: slide.id, snapshotId,
      expected: { round: view.state.currentRound, slideRevision: slide.revision } }, signal), signal),
  });
}
export function useSlideImageUrl(view: ProjectView, slide: ProposalSlide, blockId: string, snapshotId: string | null, enabled: boolean): { url: string | null; loading: boolean; error: WorkspaceError | null } {
  const runtime = useWorkspaceRuntime(), block = slide.content.blocks.find(b => b.id === blockId && b.kind === "image");
  const key = JSON.stringify([...runtime.queryScope, view.project.id, snapshotId, view.state.currentRound, slide.id, blockId, block?.kind === "image" ? block.blobId : null]);
  const query = useQuery<{ blob: Blob; alt: string; width: number; height: number }, WorkspaceError>({ ...options,
    queryKey: [...runtime.queryScope, "production-image", key], enabled: enabled && !!block,
    queryFn: ({ signal }) => activeWorkspaceRead(runtime, () => runtime.service.loadSlideImage({ projectId: view.project.id, slideId: slide.id, blockId, snapshotId,
      expected: { round: view.state.currentRound, slideRevision: slide.revision } }, signal), signal),
  });
  const [object, setObject] = useState<{ key: string; blob: Blob; url: string } | null>(null);
  useEffect(() => {
    if (!enabled || !query.data || query.error) return;
    const blob = query.data.blob, url = URL.createObjectURL(blob);
    const frame = requestAnimationFrame(() => setObject({ key, blob, url }));
    return () => { cancelAnimationFrame(frame); URL.revokeObjectURL(url); setObject(previous => previous?.url === url ? null : previous); };
  }, [enabled, query.data, query.error, key]);
  return { url: enabled && !query.error && object?.key === key && object.blob === query.data?.blob ? object.url : null,
    loading: enabled && query.isPending, error: query.error };
}
