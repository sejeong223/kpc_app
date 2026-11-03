"use client";
import { useWorkspaceDraftGuard } from "@/hooks/workspace/use-workspace-draft-guard";
import FileDiscardDialog from "../files/FileDiscardDialog";
import type { ProjectView, ProjectRequest } from "@/types/workspace-production";
export const workspaceCard =
  "tw:min-w-0 tw:rounded-xl tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:p-(--layout-card-inset)";
export const workspaceTable =
  "tw:w-full tw:border-collapse tw:text-left tw:text-xs tw:[&_th]:bg-(--kpc-bg) tw:[&_th]:p-3 tw:[&_td]:border-b tw:[&_td]:border-(--kpc-line) tw:[&_td]:p-3";
export function requestFor(view: ProjectView): ProjectRequest {
  return {
    projectId: view.project.id,
    expectedRevision: view.state.revision,
    expectedRound: view.state.currentRound,
  };
}
export function WorkspaceErrorText({
  error,
}: {
  error: Error | string | null;
}) {
  return error ? (
    <p role="alert" className="tw:my-2 tw:text-sm tw:text-red-700">
      {typeof error === "string" ? error : error.message} 입력 내용은
      유지됩니다. 최신 내용을 확인한 뒤 다시 편집해 주세요.
    </p>
  ) : null;
}
export function DraftProtection({
  dirty,
  busy,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  busy: boolean;
  onSave?(): Promise<void>;
  onDiscard(): void;
}) {
  const guard = useWorkspaceDraftGuard({ dirty, busy, onSave, onDiscard });
  return (
    <FileDiscardDialog
      open={guard.confirmOpen}
      onKeep={guard.keepEditing}
      onDiscard={guard.discardAndContinue}
      onSave={
        onSave
          ? () => {
              void guard.saveAndContinue();
            }
          : undefined
      }
      busy={guard.saving}
      error={guard.error}
    />
  );
}
