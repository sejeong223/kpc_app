"use client";
import { useWorkspaceCommand } from "./use-workspace-production";
import { selectProjectComments } from "@/lib/workspace/production/comment-selectors";
import type { ProjectView } from "@/types/workspace-production";
export function useProjectComments(
  view: ProjectView,
  slideId: string,
  snapshotId: string | null,
) {
  return {
    ...selectProjectComments(view, slideId, snapshotId),
    mutation: useWorkspaceCommand(),
    users: view.members.map((m) => ({
      id: m.id,
      name: m.name,
      isMock: m.id.startsWith("mock:"),
    })),
  };
}
