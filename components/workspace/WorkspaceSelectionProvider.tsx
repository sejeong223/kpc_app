"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptionalWorkspaceRuntime } from "./WorkspaceProjectProvider";
import type { WorkspaceRuntimeValue } from "@/services/workspace/createWorkspaceRuntime";
import type { WorkspaceSelection } from "@/types/workspace-production";
import type { WorkspaceProject } from "@/types/workspace-files";
import { isWorkspaceScreenId, parseWorkspaceSelection, resolveWorkspaceSelection, workspaceHref } from "@/lib/workspace/production/routing";
import { workspaceQueryKeys } from "@/lib/workspace/production/query-keys";
import { WorkspaceError, workspaceAssert as check } from "@/lib/workspace/production/errors";
import { activeWorkspaceRead, loadProjectView, useProjectWorkspace, workspaceQueryOptions } from "@/hooks/workspace/use-workspace-production";
export interface WorkspaceSelectionValue {
    selection: WorkspaceSelection;
    projects: WorkspaceProject[];
    pending: boolean;
    error: Error | null;
    notice: string | null;
    choose(next: WorkspaceSelection): Promise<void>;
    commitSelection(next: WorkspaceSelection): Promise<void>;
}
const empty: WorkspaceSelection = { projectId: null, sectionId: null, slideId: null, snapshotId: null };
const unavailable = async () => { throw new WorkspaceError("FORBIDDEN", "프로젝트 접근 정보를 확인해 주세요."); };
const Context = createContext<WorkspaceSelectionValue>({ selection: empty, projects: [], pending: false, error: null, notice: null, choose: unavailable, commitSelection: unavailable });
function ActiveSelection({ runtime, children }: {
    runtime: WorkspaceRuntimeValue;
    children: React.ReactNode;
}) {
    const router = useRouter(), pathname = usePathname(), params = useSearchParams(), client = useQueryClient();
    const keys = workspaceQueryKeys(runtime.queryScope), screen = pathname.startsWith("/workspace/") ? pathname.slice(11) : "";
    const location = pathname + "?" + params.toString();
    const [transition, setTransition] = useState<{
        location: string;
        selection: WorkspaceSelection;
    } | null>(null);
    // replace가 URL에 반영될 때까지 이전 URL이 새 선택을 되돌리지 않게 한다.
    if (transition && transition.location !== location)
        setTransition(null);
    const ticket = useRef(0), locationRef = useRef(location), committing = useRef(false);
    useEffect(() => { locationRef.current = location; }, [location]);
    useEffect(() => () => { ticket.current += 1; }, []);
    const memory = useSyncExternalStore(runtime.selection.subscribe, runtime.selection.get, () => null);
    const parsed = useMemo(() => {
        try {
            return { value: isWorkspaceScreenId(screen) ? parseWorkspaceSelection(new URLSearchParams(params.toString())) : empty, error: null };
        }
        catch (error) {
            return { value: empty, error: error instanceof Error ? error : new Error("이동 정보를 확인해 주세요.") };
        }
    }, [screen, params]);
    const projects = useQuery({ ...workspaceQueryOptions, queryKey: keys.projects, queryFn: ({ signal }) => activeWorkspaceRead(runtime, () => runtime.fileRuntime.service.listProjects(), signal) });
    const saved = useQuery({ ...workspaceQueryOptions, queryKey: keys.selection, queryFn: ({ signal }) => activeWorkspaceRead(runtime, () => runtime.fileRuntime.service.getSelection(), signal) });
    const ready = projects.isSuccess && saved.isSuccess;
    const accessible = (id: string | null) => id !== null && projects.data?.some(p => p.id === id);
    const fallback = ready ? (memory && accessible(memory.projectId) ? memory : { ...empty, projectId: accessible(saved.data ?? null) ? saved.data ?? null : projects.data[0]?.id ?? null }) : empty;
    const raw = transition?.location === location ? transition.selection : parsed.value.projectId ? parsed.value : fallback;
    const denied = ready && raw.projectId && !accessible(raw.projectId) ? new WorkspaceError("FORBIDDEN", "선택한 프로젝트에 접근할 수 없습니다. 다른 프로젝트를 선택해 주세요.") : null;
    const view = useProjectWorkspace(ready && !parsed.error && !denied ? raw.projectId : null);
    let selection = parsed.error || denied ? empty : raw, notice: string | null = null, resolutionError: Error | null = null;
    if (view.data && !parsed.error && !denied) {
        try {
            const result = resolveWorkspaceSelection(raw, view.data);
            selection = result.selection;
            notice = result.notice;
        }
        catch (error) {
            resolutionError = error instanceof Error ? error : new Error("선택 정보를 확인해 주세요.");
            selection = empty;
        }
    }
    const mutation = useMutation<WorkspaceSelection, WorkspaceError, WorkspaceSelection>({
        mutationKey: keys.mutation, retry: false, gcTime: 0,
        mutationFn: next => activeWorkspaceRead(runtime, async () => {
            check(!!next.projectId, "VALIDATION", "프로젝트를 선택해 주세요.");
            const result = await client.fetchQuery({ ...workspaceQueryOptions, queryKey: keys.project(next.projectId), queryFn: () => activeWorkspaceRead(runtime, () => loadProjectView(runtime, next.projectId!)) });
            const canonical = resolveWorkspaceSelection(next, result).selection;
            check(locationRef.current === location, "CANCELLED", "이동한 화면의 선택 요청을 취소했습니다.");
            await runtime.fileRuntime.service.selectProject(next.projectId);
            return canonical;
        }),
    });
    const error = parsed.error ?? denied ?? projects.error ?? saved.error ?? resolutionError ?? view.error ?? mutation.error;
    const serialized = JSON.stringify(selection), memoryValue = JSON.stringify(memory);
    useEffect(() => {
        if (ready && !error && view.isSuccess && selection.projectId && serialized !== memoryValue && !committing.current)
            runtime.selection.set(selection);
    }, [runtime, ready, error, view.isSuccess, selection, serialized, memoryValue]);
    const commitSelection = async (next: WorkspaceSelection) => {
        check(!committing.current, "CANCELLED", "프로젝트를 변경하고 있습니다.");
        committing.current = true;
        const epoch = ++ticket.current;
        try {
            const canonical = await mutation.mutateAsync(next);
            check(runtime.isActive() && epoch === ticket.current && locationRef.current === location, "CANCELLED", "종료된 선택 요청입니다.");
            setTransition({ location, selection: canonical });
            runtime.selection.set(canonical);
            client.setQueryData(keys.selection, canonical.projectId);
            if (isWorkspaceScreenId(screen))
                router.replace(workspaceHref(screen, canonical));
        }
        finally {
            committing.current = false;
        }
    };
    const value: WorkspaceSelectionValue = { selection, projects: projects.data ?? [], pending: projects.isPending || saved.isPending || mutation.isPending || (!!raw.projectId && view.isPending && !error), error, notice,
        commitSelection,
        choose: next => JSON.stringify(next) === serialized ? Promise.resolve() : runtime.navigate(() => commitSelection(next)),
    };
    return <Context.Provider value={value}>{children}</Context.Provider>;
}
export default function WorkspaceSelectionProvider({ children }: {
    children: React.ReactNode;
}) {
    const runtime = useOptionalWorkspaceRuntime();
    if (!runtime)
        return <Context.Provider value={{ selection: empty, projects: [], pending: false, error: null, notice: null, choose: unavailable, commitSelection: unavailable }}>{children}</Context.Provider>;
    return <ActiveSelection key={JSON.stringify(runtime.queryScope)} runtime={runtime}>{children}</ActiveSelection>;
}
export function useWorkspaceSelectionContext(): WorkspaceSelectionValue { return useContext(Context); }
