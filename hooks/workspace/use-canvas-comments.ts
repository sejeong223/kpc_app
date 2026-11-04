"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
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
    const { projectId, round, snapshotId } = binding;
    const { id, name, isMock } = identity.actor;
    const { namespace, surfaceId } = identity.scope;
    const { mutateAsync } = mutation;
    const roundCreatedAt = view.roundCreatedAt;
    const bridge = useMemo(() => {
        const binding: CanvasCommentBinding = { projectId, round, snapshotId };
        const identity: CommentIdentity = { actor: { id, name, isMock }, scope: { namespace, surfaceId } };
        const read = async (): Promise<CanvasCommentRead> => {
            const raw = await client.fetchQuery({ ...workspaceQueryOptions, queryKey: workspaceQueryKeys(runtime.queryScope).project(binding.projectId), queryFn: () => activeWorkspaceRead(runtime, () => loadProjectView(runtime, binding.projectId)) });
            const selected = selectSnapshotView(raw, binding.snapshotId);
            check(selected.state.currentRound === binding.round, "CONFLICT", "의견 회차가 변경되었습니다.");
            const context = { identity: runtime.identity, project: raw.project, members: raw.members, now: new Date().toISOString(), newId: () => crypto.randomUUID() };
            return { snapshot: projectCanvasSnapshot(selected.state, context, selected.roundCreatedAt), request: { projectId: raw.project.id, expectedRevision: raw.state.revision, expectedRound: raw.state.currentRound }, capabilities: canvasCapabilities(selected.state, context, binding.snapshotId !== null) };
        };
        const repository = new WorkspaceCommentRepository({ binding, identity, read, execute: async (request, command) => {
                const project = runtime.catalog.get(binding.projectId);
                check(!!project, "FORBIDDEN", "프로젝트 접근 권한이 없습니다.");
                const context = { identity: runtime.identity, project, members: runtime.catalog.members(binding.projectId), now: new Date().toISOString(), newId: () => crypto.randomUUID() };
                const receipt = await mutateAsync({ ...request, operation: { type: "canvas-command", command } });
                // 확정된 저장 결과로 응답한다. 후속 재조회 실패가 초안을 남겨
                // 이미 저장한 의견을 다시 제출하게 만들지 않는다.
                return { snapshot: projectCanvasSnapshot(receipt.state, context, roundCreatedAt),
                    request: { projectId: project.id, expectedRevision: receipt.state.revision, expectedRound: receipt.state.currentRound },
                    capabilities: canvasCapabilities(receipt.state, context, false) };
            } });
        const controller = new CommentController({ identity, repositoryFactory: () => repository });
        return { repository, controller, retain: createDisposalLease(() => controller.dispose()) };
    }, [runtime, client, projectId, round, snapshotId, id, name, isMock, namespace, surfaceId, mutateAsync, roundCreatedAt]);
    const state = useSyncExternalStore(bridge.controller.subscribe, bridge.controller.getSnapshot, bridge.controller.getSnapshot);
    useEffect(() => bridge.retain(), [bridge]);
    useEffect(() => { void bridge.controller.load(); }, [bridge]);
    useEffect(() => {
        if (!state.busy && state.status === "ready" && (binding.snapshotId !== null || binding.round === view.state.currentRound) && bridge.repository.getRevision() !== view.state.revision)
            void bridge.controller.load();
    }, [bridge, state.busy, state.status, view.state.revision, view.state.currentRound, binding.round, binding.snapshotId]);
    const selected = selectSnapshotView(view, binding.snapshotId);
    const context = { identity: runtime.identity, project: view.project, members: view.members, now: new Date().toISOString(), newId: () => crypto.randomUUID() };
    return { identity, state, controller: bridge.controller,
        capabilities: canvasCapabilities(selected.state, context, binding.snapshotId !== null),
        mentionUsers: view.members.map(m => ({ id: m.id, name: m.name, isMock: runtime.identity.actor.isMock })),
    };
}
