"use client";
import { useEffect, useState } from "react";
import { DadamButton } from "@/components/ui/DadamControls";
import { useWorkspaceCommand } from "@/hooks/workspace/use-workspace-production";
import { useWorkspaceRuntime } from "../WorkspaceProjectProvider";
import type { ProjectView } from "@/types/workspace-production";
import { requestFor, WorkspaceErrorText } from "./WorkspaceUi";
export default function WorkspaceUndoNotice({ view }: { view: ProjectView }) {
  const runtime = useWorkspaceRuntime(),
    mutation = useWorkspaceCommand(),
    [now, setNow] = useState(() => Date.now()),
    undo = view.state.undo;
  useEffect(() => {
    if (!undo) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [undo]);
  if (
    !undo ||
    undo.actorId !== runtime.identity.actor.id ||
    undo.afterRevision !== view.state.revision ||
    Date.parse(undo.expiresAt) <= now
  )
    return null;
  return (
    <div
      role="status"
      className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:rounded-lg tw:bg-(--dadam-accent-soft) tw:p-3"
    >
      <span>
        {undo.label} · {Math.ceil((Date.parse(undo.expiresAt) - now) / 1000)}초
      </span>
      <DadamButton
        disabled={mutation.isPending}
        onClick={() =>
          mutation.mutate({
            ...requestFor(view),
            operation: { type: "undo", id: undo.id },
          })
        }
      >
        되돌리기
      </DadamButton>
      <WorkspaceErrorText error={mutation.error} />
    </div>
  );
}
