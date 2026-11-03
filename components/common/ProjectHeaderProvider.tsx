"use client";

import { Toast, Toaster, ToastTitle, makeStyles, useToastController } from "@fluentui/react-components";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { PROJECT_HEADER_PROJECTS, getProjectHeaderData, isProjectPm, type ProjectHeaderData, type ProjectHeaderId } from "@/config/project-header";

export interface ProjectHeaderContextValue {
  projects: readonly ProjectHeaderData[];
  project: ProjectHeaderData;
  isPm: boolean;
  toasterId: string;
  selectProject: (id: string) => void;
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

export default function ProjectHeaderProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [selectedProjectId, setSelectedProjectId] = useState<ProjectHeaderId>("mois");
  const project = getProjectHeaderData(selectedProjectId);
  const isPm = isProjectPm(project);
  const pathname = usePathname();
  const router = useRouter();
  const toasterId = useId();
  const activeToast = useRef<string | null>(null);
  const sequence = useRef(0);
  const { dispatchToast, updateToast } = useToastController(toasterId);
  const styles = useStyles();

  useEffect(() => {
    if (pathname === "/workspace/review" && !isPm) router.replace("/workspace/write");
  }, [pathname, isPm, router]);

  const selectProject = useCallback((id: string) => {
    const next = getProjectHeaderData(id);
    if (next.id === selectedProjectId) return;
    setSelectedProjectId(next.id);
    const content = <Toast className={styles.toast}><ToastTitle>현재 프로젝트: {next.name}</ToastTitle></Toast>;
    if (activeToast.current) {
      updateToast({ toastId: activeToast.current, content, timeout: 2200 });
    } else {
      const toastId = `${toasterId}-${++sequence.current}`;
      activeToast.current = toastId;
      dispatchToast(content, {
        toastId, timeout: 2200, politeness: "polite",
        onStatusChange: (_event, data) => {
          if ((data.status === "dismissed" || data.status === "unmounted") && activeToast.current === toastId) activeToast.current = null;
        },
      });
    }
  }, [selectedProjectId, styles.toast, toasterId, dispatchToast, updateToast]);

  const value = useMemo(() => ({ projects: PROJECT_HEADER_PROJECTS, project, isPm, toasterId, selectProject }), [project, isPm, toasterId, selectProject]);
  return <ProjectHeaderContext.Provider value={value}>{children}</ProjectHeaderContext.Provider>;
}

export function useProjectHeader(): ProjectHeaderContextValue {
  const value = useContext(ProjectHeaderContext);
  if (!value) throw new Error("useProjectHeader must be used within ProjectHeaderProvider");
  return value;
}

export function ProjectHeaderToaster(): React.ReactElement {
  const { toasterId } = useProjectHeader();
  const styles = useStyles();
  return <Toaster toasterId={toasterId} inline position="bottom" offset={{ vertical: 64 }} timeout={2200} limit={1} className={styles.toaster} />;
}
