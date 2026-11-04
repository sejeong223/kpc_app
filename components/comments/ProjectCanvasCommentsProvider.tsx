"use client";
import { useState } from "react";
import { useWorkspaceSelection } from "@/hooks/workspace/use-workspace-selection";
import { useProjectWorkspace } from "@/hooks/workspace/use-workspace-production";
import { useCanvasComments } from "@/hooks/workspace/use-canvas-comments";
import { useWorkspaceDraftGuard } from "@/hooks/workspace/use-workspace-draft-guard";
import { useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import type { ProjectView } from "@/types/workspace-production";
import type { CommentIdentity } from "@/config/comments";
import type { CanvasCommentBinding } from "@/lib/comments/workspace-repository";
import FileDiscardDialog from "@/components/workspace/files/FileDiscardDialog";
import DadamThemeScope from "@/components/providers/DadamThemeScope";
import { CommentsContext, inactiveComments } from "./comments-context";
function ScopedComments({ binding, identity, view, failure, children }: {
    failure: Error | null;
    binding: CanvasCommentBinding;
    identity: CommentIdentity;
    view: ProjectView;
    children: React.ReactNode;
}) {
    // 외부 회차 갱신은 앱 전체를 다시 마운트하지 않는다. 작성 중인 의견은
    // 원래 회차에 남겨 두고, 사용자가 확인한 뒤 새 회차로 전환한다.
    const [scope, setScope] = useState({ binding, identity, roundCreatedAt: view.roundCreatedAt });
    const value = useCanvasComments(scope.binding, scope.identity, { ...view, roundCreatedAt: scope.roundCreatedAt });
    const roundChanged = scope.binding.round !== binding.round;
    const dirty = Object.entries(value.state.drafts).some(([key, draft]) => {
        if (!key.startsWith("edit:"))
            return !!draft.text.trim();
        const original = value.state.snapshot?.messages.find(m => m.id === key.slice(5));
        return !original || draft.text !== original.text || JSON.stringify(draft.mentions) !== JSON.stringify(original.mentions);
    });
    const guard = useWorkspaceDraftGuard({ dirty, busy: value.state.busy, onDiscard: () => value.controller.discardDrafts() });
    const switchRound = () => setScope({ binding, identity, roundCreatedAt: view.roundCreatedAt });
    if (roundChanged && !dirty && !value.state.busy)
        switchRound();
    const context = failure ? { ...inactiveComments, state: { ...inactiveComments.state, status: "error" as const, error: { code: "storage" as const, message: failure.message } } }
        : roundChanged ? { ...value, capabilities: inactiveComments.capabilities,
            roundConflict: { from: scope.binding.round, to: binding.round, reload: () => guard.request(switchRound) } } : value;
    return <CommentsContext.Provider value={context}>{children}<DadamThemeScope>
      <FileDiscardDialog open={guard.confirmOpen} onKeep={guard.keepEditing} onDiscard={guard.discardAndContinue} busy={guard.saving} error={guard.error}/>
    </DadamThemeScope></CommentsContext.Provider>;
}
export default function ProjectCanvasCommentsProvider({ children }: {
    children: React.ReactNode;
}) {
    const runtime = useWorkspaceRuntime(), choice = useWorkspaceSelection();
    const query = useProjectWorkspace(choice.selection.projectId), view = query.data;
    const snapshot = choice.selection.snapshotId ? view?.state.snapshots.find(s => s.id === choice.selection.snapshotId) : null;
    const failure = choice.error ?? query.error;
    if (!view || (choice.selection.snapshotId && !snapshot)) {
        const state = { ...inactiveComments.state, status: failure ? "error" as const : "loading" as const, error: failure ? { code: "storage" as const, message: failure.message } : null };
        return <CommentsContext.Provider value={{ ...inactiveComments, state }}>{children}</CommentsContext.Provider>;
    }
    const binding = { projectId: view.project.id, round: snapshot?.round ?? view.state.currentRound, snapshotId: choice.selection.snapshotId };
    const { id, name, isMock } = runtime.identity.actor;
    const identity: CommentIdentity = { actor: { id, name, isMock }, scope: { surfaceId: "production-preview", namespace: JSON.stringify([runtime.identity.namespace, binding.projectId, binding.round]) } };
    return <ScopedComments key={JSON.stringify([runtime.queryScope, identity.actor.id, binding.projectId, binding.snapshotId])} binding={binding} identity={identity} view={view} failure={failure}>{children}</ScopedComments>;
}
