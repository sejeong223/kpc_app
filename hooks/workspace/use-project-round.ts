"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import { useWorkspaceDraftGuard } from "./use-workspace-draft-guard";
import { loadProjectView, activeWorkspaceRead, workspaceQueryOptions, useWorkspaceCommand } from "./use-workspace-production";
import { workspaceQueryKeys } from "@/lib/workspace/production/query-keys";
import { workspaceAssert as check } from "@/lib/workspace/production/errors";
import type { ProjectView } from "@/types/workspace-production";
export function useProjectRound(projectId: string, onChanged: () => Promise<void>, onOpened?: () => void) {
    const runtime = useWorkspaceRuntime(), client = useQueryClient(), mutation = useWorkspaceCommand();
    const [dialog, setDialog] = useState<{
        mode: "complete" | "start-round";
        view: ProjectView;
    } | null>(null), [error, setError] = useState<string | null>(null), [loading, setLoading] = useState(false);
    const mounted = useRef(true), running = useRef(false), sequence = useRef(0);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useWorkspaceDraftGuard({ dirty: false, busy: loading || mutation.isPending, onDiscard: () => { } });
    const open = (mode: "complete" | "start-round") => {
        void runtime.navigate(async () => {
            if (running.current)
                return;
            running.current = true;
            setLoading(true);
            setError(null);
            mutation.reset();
            const ticket = ++sequence.current;
            try {
                const view = await client.fetchQuery({ ...workspaceQueryOptions, staleTime: 0, queryKey: workspaceQueryKeys(runtime.queryScope).project(projectId), queryFn: () => activeWorkspaceRead(runtime, () => loadProjectView(runtime, projectId)) });
                check(mode === "complete" ? view.capabilities.actions.complete : view.capabilities.actions.rework, "FORBIDDEN", "이 회차 작업의 권한이 없습니다.");
                if (mounted.current && ticket === sequence.current) {
                    onOpened?.();
                    setDialog({ mode, view });
                }
            }
            finally {
                running.current = false;
                if (mounted.current)
                    setLoading(false);
            }
        }).catch(e => { if (mounted.current)
            setError(e instanceof Error ? e.message : "회차 정보를 확인할 수 없습니다."); });
    };
    return { dialog, error: error ?? mutation.error?.message ?? null, busy: loading || mutation.isPending, open,
        close: () => { if (!running.current)
            setDialog(null); },
        confirm: async (input: {
            revision: number;
            fileRevision: number;
            round: number;
            acknowledged: true;
        }) => {
            if (!dialog || running.current)
                return;
            running.current = true;
            try {
                check(input.revision === dialog.view.state.revision && input.round === dialog.view.state.currentRound && input.fileRevision === dialog.view.fileRevision, "CONFLICT", "확인한 회차 정보가 변경되었습니다.");
                await mutation.mutateAsync({ projectId, expectedRevision: input.revision, expectedRound: input.round, operation: { type: dialog.mode, expectedFileRevision: input.fileRevision, acknowledged: input.acknowledged } });
                if (!runtime.isActive())
                    return;
                runtime.clipboard.clear();
                runtime.service.clearProjectSessions(projectId);
                if (mounted.current) setDialog(null);
                if (runtime.selection.get()?.projectId === projectId) await onChanged();
            }
            finally {
                running.current = false;
            }
        },
    };
}
