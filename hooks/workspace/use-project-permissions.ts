"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import { createGrantDraft, changedGrantRows } from "@/lib/workspace/production/grant-drafts";
import { workspaceQueryKeys } from "@/lib/workspace/production/query-keys";
import { workspaceAssert as check } from "@/lib/workspace/production/errors";
import type { ProjectView, ProjectPermission } from "@/types/workspace-production";
import { activeWorkspaceRead, loadProjectView, useWorkspaceCommand, workspaceQueryOptions } from "./use-workspace-production";
export function useProjectPermissions(view: ProjectView, readOnly: boolean) {
    const runtime = useWorkspaceRuntime(), client = useQueryClient(), mutation = useWorkspaceCommand();
    const [baseline, setBaseline] = useState(() => createGrantDraft(view)), [rows, setRows] = useState(baseline.rows), [localError, setError] = useState<string | null>(null), [reloading, setReloading] = useState(false);
    const mounted = useRef(true), running = useRef(false);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    const changes = changedGrantRows(baseline.rows, rows), canEdit = !readOnly && view.capabilities.managePermissions;
    const stale = view.state.revision !== baseline.baseRevision || JSON.stringify(createGrantDraft(view).rows.map(r => r.userId)) !== JSON.stringify(baseline.rows.map(r => r.userId));
    const save = async () => {
        check(canEdit, "FORBIDDEN", "권한을 변경할 수 없습니다.");
        check(!stale, "CONFLICT", "프로젝트가 변경되었습니다. 다시 불러온 뒤 검토해 주세요.");
        if (!changes.length || running.current)
            return;
        running.current = true;
        setError(null);
        try {
            const receipt = await mutation.mutateAsync({ projectId: baseline.projectId, expectedRevision: baseline.baseRevision, expectedRound: baseline.baseRound, operation: { type: "set-grants-batch", grants: changes } });
            if (!mounted.current || !runtime.isActive())
                return;
            const next = createGrantDraft({ ...view, state: receipt.state });
            setBaseline(next);
            setRows(next.rows);
        }
        finally {
            running.current = false;
        }
    };
    const reload = async () => {
        if (running.current)
            return;
        running.current = true;
        setReloading(true);
        setError(null);
        try {
            const fresh = await client.fetchQuery({ ...workspaceQueryOptions, staleTime: 0, queryKey: workspaceQueryKeys(runtime.queryScope).project(view.project.id), queryFn: () => activeWorkspaceRead(runtime, () => loadProjectView(runtime, view.project.id)) });
            if (mounted.current) {
                const next = createGrantDraft(fresh);
                setBaseline(next);
                setRows(next.rows);
                mutation.reset();
            }
        }
        catch (e) {
            if (mounted.current)
                setError(e instanceof Error ? e.message : "권한을 불러오지 못했습니다.");
        }
        finally {
            running.current = false;
            if (mounted.current)
                setReloading(false);
        }
    };
    return { rows, canEdit, dirty: changes.length > 0, busy: mutation.isPending || reloading, stale, save, reload,
        error: localError ?? mutation.error?.message ?? (stale ? "프로젝트가 변경되었습니다. 다시 불러온 뒤 검토해 주세요." : null),
        discard: () => setRows(baseline.rows),
        change: (id: string, permission: ProjectPermission, checked: boolean) => { if (!canEdit || running.current)
            return; setRows(current => current.map(row => row.userId === id ? { ...row, permissions: checked ? [...new Set([...row.permissions, permission])] : row.permissions.filter(p => p !== permission) } : row)); },
    };
}
