"use client";
import { useState } from "react";
import { useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import {
  loadProjectView,
  useWorkspaceCommand,
} from "./use-workspace-production";
import type { ProjectView } from "@/types/workspace-production";
export function useProjectRound(
  projectId: string,
  onChanged: () => Promise<void>,
) {
  const runtime = useWorkspaceRuntime(),
    mutation = useWorkspaceCommand(),
    [dialog, setDialog] = useState<{
      mode: "complete" | "start-round";
      view: ProjectView;
    } | null>(null),
    [error, setError] = useState<string | null>(null);
  return {
    dialog,
    error: error ?? mutation.error?.message ?? null,
    busy: mutation.isPending,
    close: () => {
      if (!mutation.isPending) setDialog(null);
    },
    open: (mode: "complete" | "start-round") => {
      void runtime
        .navigate(async () => {
          mutation.reset();
          setError(null);
          const view = await loadProjectView(runtime, projectId);
          setDialog({ mode, view });
        })
        .catch((e) =>
          setError(
            e instanceof Error ? e.message : "회차 정보를 확인할 수 없습니다.",
          ),
        );
    },
    confirm: async (input: {
      revision: number;
      fileRevision: number;
      round: number;
      acknowledged: true;
    }) => {
      if (!dialog) return;
      await mutation.mutateAsync({
        projectId,
        expectedRevision: input.revision,
        expectedRound: input.round,
        operation: {
          type: dialog.mode,
          expectedFileRevision: input.fileRevision,
          acknowledged: input.acknowledged,
        },
      });
      runtime.clipboard.clear();
      runtime.service.clearProjectSessions(projectId);
      setDialog(null);
      await onChanged();
    },
  };
}
