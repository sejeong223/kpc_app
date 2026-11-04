"use client";
import { Toast, Toaster, ToastTitle, makeStyles, useToastController } from "@fluentui/react-components";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { createAdminSeed } from "@/config/admin-seed";
import { useOptionalWorkspaceRuntime, useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import { useWorkspaceSelection } from "@/hooks/workspace/use-workspace-selection";
import { useProjectWorkspace } from "@/hooks/workspace/use-workspace-production";
import { getWorkspaceHeaderMetadata, selectWorkspaceHeader } from "@/lib/workspace/production/header-selectors";
import { workspaceHref } from "@/lib/workspace/production/routing";
import type { WorkspaceHeaderModel } from "@/types/workspace-header";
import type { ProjectView, WorkspaceSelection } from "@/types/workspace-production";
import type { WorkspaceProject } from "@/types/workspace-files";
export type HeaderState = {
    status: "idle" | "loading";
    view: null;
    model: null;
    error: null;
} | {
    status: "error";
    view: null;
    model: null;
    error: Error;
} | {
    status: "ready";
    view: ProjectView;
    model: WorkspaceHeaderModel;
    error: null;
};
export interface ProjectHeaderContextValue {
    state: HeaderState;
    projects: WorkspaceProject[];
    selection: WorkspaceSelection;
    pending: boolean;
    isPm: boolean;
    toasterId: string;
    selectProject(id: string): Promise<void>;
}
const ProjectHeaderContext = createContext<ProjectHeaderContextValue | null>(null);
const useStyles = makeStyles({
    toaster: {
        // Fluent가 left/transform을 inline으로 설정하므로 사이드바 보정은 margin으로 적용한다.
        position: "fixed", marginLeft: "calc(var(--nav-sidebar-width, 0px) / 2)",
        width: "max-content", maxWidth: "calc(100vw - var(--nav-sidebar-width, 0px) - 32px)", zIndex: 5000,
        "@media (max-width: 760px)": { marginLeft: 0, maxWidth: "calc(100vw - 32px)" },
    },
    toast: { width: "auto", maxWidth: "100%", boxSizing: "border-box", overflowWrap: "anywhere" },
});
function ActiveHeader({ children }: {
    children: React.ReactNode;
}) {
    const runtime = useWorkspaceRuntime(), choice = useWorkspaceSelection(), query = useProjectWorkspace(choice.selection.projectId);
    const [rfps] = useState(() => createAdminSeed().rfps);
    const pathname = usePathname(), router = useRouter(), toasterId = useId(), sequence = useRef(0);
    const { dispatchToast } = useToastController(toasterId);
    let state: HeaderState = { status: choice.pending || query.isFetching ? "loading" : "idle", view: null, model: null, error: null };
    const error = choice.error ?? query.error;
    if (error)
        state = { status: "error", view: null, model: null, error };
    else if (query.data && choice.selection.projectId)
        try {
            state = { status: "ready", view: query.data, model: selectWorkspaceHeader(query.data, choice.selection, getWorkspaceHeaderMetadata(query.data.project.id, rfps)), error: null };
        }
        catch (error) {
            state = { status: "error", view: null, model: null, error: error instanceof Error ? error : new Error("프로젝트 정보를 확인해 주세요.") };
        }
    const isPm = state.status === "ready" && state.model.canReview;
    useEffect(() => { if (pathname === "/workspace/review" && state.status === "ready" && !choice.pending && !isPm)
        router.replace(workspaceHref("write", choice.selection)); }, [pathname, state.status, choice.pending, isPm, choice.selection, router]);
    async function selectProject(id: string) {
        if (id === choice.selection.projectId)
            return;
        const ticket = ++sequence.current;
        await choice.choose({ projectId: id, sectionId: null, slideId: null, snapshotId: null });
        if (ticket !== sequence.current || !runtime.isActive() || runtime.selection.get()?.projectId !== id)
            return;
        const project = choice.projects.find(p => p.id === id);
        if (project)
            dispatchToast(<Toast><ToastTitle>현재 프로젝트: {project.name}</ToastTitle></Toast>, { intent: "success", timeout: 2200 });
    }
    return <ProjectHeaderContext.Provider value={{ state, projects: choice.projects, selection: choice.selection, pending: choice.pending, isPm, toasterId, selectProject }}>{children}</ProjectHeaderContext.Provider>;
}
export default function ProjectHeaderProvider({ children }: {
    children: React.ReactNode;
}) {
    const runtime = useOptionalWorkspaceRuntime(), toasterId = useId();
    if (runtime)
        return <ActiveHeader key={JSON.stringify(runtime.queryScope)}>{children}</ActiveHeader>;
    return <ProjectHeaderContext.Provider value={{ state: { status: "idle", view: null, model: null, error: null }, projects: [], selection: { projectId: null, sectionId: null, slideId: null, snapshotId: null }, pending: false, isPm: false, toasterId, selectProject: async () => { } }}>{children}</ProjectHeaderContext.Provider>;
}
export function useProjectHeader() { const value = useContext(ProjectHeaderContext); if (!value)
    throw new Error("프로젝트 상단바 공급자가 필요합니다."); return value; }
export function ProjectHeaderToaster() { const { toasterId } = useProjectHeader(), styles = useStyles(); return <Toaster toasterId={toasterId} inline position="bottom" offset={{ vertical: 64 }} timeout={2200} limit={1} className={styles.toaster}/>; }
