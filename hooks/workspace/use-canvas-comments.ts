"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { CommentIdentity } from "@/config/comments";
import type { ProjectView } from "@/types/workspace-production";
import { CommentController } from "@/lib/comments/controller";
import { WorkspaceCommentRepository, type CanvasCommentBinding, type CanvasCommentRead } from "@/lib/comments/workspace-repository";
import { canvasCapabilities, projectCanvasSnapshot } from "@/lib/workspace/production/canvas-comments";
import { workspaceQueryKeys } from "@/lib/workspace/production/query-keys";
import { selectSnapshotView } from "@/lib/workspace/production/selectors";
import { workspaceAssert as check } from "@/lib/workspace/production/errors";
import { createDisposalLease } from "@/lib/admin/runtime-lifetime";
import { useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import { activeWorkspaceRead, loadProjectView, useWorkspaceCommand, workspaceQueryOptions } from "./use-workspace-production";
export function useCanvasComments(binding: CanvasCommentBinding, identity: CommentIdentity, view: ProjectView) {
    const runtime = useWorkspaceRuntime(), client = useQueryClient(), mutation = useWorkspaceCommand();
    const [bridge] = useState(() => {
        const read = async (): Promise<CanvasCommentRead> => {
            const raw = await client.fetchQuery({ ...workspaceQueryOptions, queryKey: workspaceQueryKeys(runtime.queryScope).project(binding.projectId), queryFn: () => activeWorkspaceRead(runtime, () => loadProjectView(runtime, binding.projectId)) });
            const selected = selectSnapshotView(raw, binding.snapshotId);
            check(selected.state.currentRound === binding.round, "CONFLICT", "의견 회차가 변경되었습니다.");
            const context = { identity: runtime.identity, project: raw.project, members: raw.members, now: new Date().toISOString(), newId: () => crypto.randomUUID() };
            return { snapshot: projectCanvasSnapshot(selected.state, context, selected.roundCreatedAt), request: { projectId: raw.project.id, expectedRevision: raw.state.revision, expectedRound: raw.state.currentRound }, capabilities: canvasCapabilities(selected.state, context, binding.snapshotId !== null) };
        };
        const repository = new WorkspaceCommentRepository({ binding, identity, read, execute: async (request, command) => {
                await mutation.mutateAsync({ ...request, operation: { type: "canvas-command", command } });
                return read();
            } });
        const controller = new CommentController({ identity, repositoryFactory: () => repository });
        return { repository, controller, retain: createDisposalLease(() => controller.dispose()) };
    });
    const state = useSyncExternalStore(bridge.controller.subscribe, bridge.controller.getSnapshot, bridge.controller.getSnapshot);
    useEffect(() => bridge.retain(), [bridge]);
    useEffect(() => { void bridge.controller.load(); }, [bridge]);
    useEffect(() => {
        if (!state.busy && state.status === "ready" && bridge.repository.getRevision() !== view.state.revision)
            void bridge.controller.load();
    }, [bridge, state.busy, state.status, view.state.revision]);
    const selected = selectSnapshotView(view, binding.snapshotId);
    const context = { identity: runtime.identity, project: view.project, members: view.members, now: new Date().toISOString(), newId: () => crypto.randomUUID() };
    return { identity, state, controller: bridge.controller,
        capabilities: canvasCapabilities(selected.state, context, binding.snapshotId !== null),
        mentionUsers: view.members.map(m => ({ id: m.id, name: m.name, isMock: runtime.identity.actor.isMock })),
    };
}
