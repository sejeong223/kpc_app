"use client";
import { useMutation } from "@tanstack/react-query";
import { useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import {
  activeWorkspaceRead,
  useWorkspaceAction,
} from "./use-workspace-production";
import { workspaceQueryKeys } from "@/lib/workspace/production/query-keys";
import type {
  ProjectRequest,
  WorkspaceReceipt,
} from "@/types/workspace-production";
import type { WorkspaceError } from "@/lib/workspace/production/errors";
export function useSlideClipboard() {
  const runtime = useWorkspaceRuntime();
  const copy = useMutation<
    { token: string; count: number },
    WorkspaceError,
    { projectId: string; slideIds: string[] }
  >({
    mutationKey: workspaceQueryKeys(runtime.queryScope).mutation,
    retry: false,
    gcTime: 0,
    mutationFn: (i) =>
      activeWorkspaceRead(runtime, () =>
        runtime.service.copySlides(i.projectId, i.slideIds),
      ),
    onSuccess: (r) => {
      if (runtime.isActive()) runtime.clipboard.set(r.token);
    },
  });
  const paste = useWorkspaceAction<
    WorkspaceReceipt,
    ProjectRequest & {
      sectionId: string;
      afterId: string | null;
      token: string;
    }
  >((r, i) => r.service.pasteSlides(i));
  const image = useWorkspaceAction<
    WorkspaceReceipt,
    ProjectRequest & {
      slideId: string;
      file: File;
      afterBlockId: string | null;
    }
  >((r, i) => r.service.insertImage(i));
  return { copy, paste, image, getToken: runtime.clipboard.get };
}
