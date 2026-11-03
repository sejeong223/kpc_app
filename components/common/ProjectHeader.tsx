"use client";

import { Popover, PopoverSurface, PopoverTrigger, makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { ArrowCounterclockwise16Regular, Checkmark16Regular, ChevronDown16Regular, History16Regular, Settings16Regular } from "@fluentui/react-icons";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";
import { useComments } from "@/components/comments/CommentsProvider";
import WorkspaceHeader, { type WorkspaceHeaderProps } from "@/components/layout/WorkspaceHeader";
import WorkspacePage from "@/components/layout/WorkspacePage";
import { getProjectHeaderView } from "@/config/project-header";
import { dadamUi } from "@/lib/ui/dadam-theme";
import Button from "./Button";
import { useProjectHeader } from "./ProjectHeaderProvider";

export type ProjectHeaderProps = Omit<WorkspaceHeaderProps, "leading" | "actions">;
type HeaderOverlay = null | "projects" | "history" | "complete" | "redo" | "settings";

const useStyles = makeStyles({
  leading: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--layout-control-gap)", minWidth: 0, maxWidth: "100%" },
  selector: { height: "auto", minHeight: "40px", width: "360px", maxWidth: "100%", minWidth: 0, padding: "4px 10px", columnGap: "10px", textAlign: "left", whiteSpace: "normal" },
  summary: { display: "flex", flex: 1, flexDirection: "column", minWidth: 0, gap: "2px" },
  name: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: tokens.fontWeightSemibold },
  meta: { fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightRegular },
  badge: { display: "inline-flex", flexShrink: 0, alignItems: "center", padding: "2px 8px", borderRadius: tokens.borderRadiusCircular, backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, whiteSpace: "nowrap" },
  action: { boxSizing: "border-box", height: "34px", minHeight: "34px", paddingLeft: "12px", paddingRight: "12px", columnGap: "6px" },
  iconAction: { width: "34px", minWidth: "34px", paddingLeft: 0, paddingRight: 0 },
  popup: { width: "360px", maxWidth: "calc(100vw - 32px)", maxHeight: "min(480px, calc(100svh - 100px))", boxSizing: "border-box", overflowY: "auto", padding: "8px", borderRadius: dadamUi.surfaceRadius, boxShadow: dadamUi.popoverShadow, fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight },
  popupTitle: { margin: "4px 8px 8px", fontSize: dadamUi.metaSize, color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightSemibold },
  projectOption: { display: "flex", flexDirection: "column", alignItems: "stretch", height: "auto", width: "100%", padding: "10px", textAlign: "left", whiteSpace: "normal", rowGap: "6px" },
  optionTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" },
  optionName: { fontWeight: tokens.fontWeightSemibold, overflowWrap: "anywhere" },
  options: { display: "flex", flexDirection: "column", gap: "4px" },
});

export default function ProjectHeader(props: ProjectHeaderProps): React.ReactElement {
  const { project } = useProjectHeader();
  const pathname = usePathname();
  const selectorRef = useRef<HTMLButtonElement>(null);
  return <ProjectHeaderContent key={`${pathname}:${project.id}`} {...props} selectorRef={selectorRef} />;
}

function ProjectHeaderContent({ selectorRef, ...props }: ProjectHeaderProps & { selectorRef: React.RefObject<HTMLButtonElement | null> }): React.ReactElement {
  const styles = useStyles();
  const { projects, project, selectProject } = useProjectHeader();
  const { controller } = useComments();
  const view = getProjectHeaderView(project);
  const [overlay, setOverlay] = useState<HeaderOverlay>(null);
  const id = useId();
  const openOverlay = (next: Exclude<HeaderOverlay, null>) => {
    controller?.suspendUi();
    setOverlay(next);
  };
  const closeProjects = () => {
    setOverlay(null);
    requestAnimationFrame(() => { if (selectorRef.current?.isConnected) selectorRef.current.focus({ preventScroll: true }); });
  };

  return <WorkspaceHeader {...props} leading={<div className={styles.leading}>
    <Popover open={overlay === "projects"} positioning="below-start" onOpenChange={(_event, data) => data.open ? openOverlay("projects") : closeProjects()}>
      <PopoverTrigger disableButtonEnhancement>
        <Button ref={selectorRef} className={styles.selector} aria-label={`프로젝트 선택: ${project.name}`} aria-haspopup="dialog" aria-expanded={overlay === "projects"} aria-controls={`${id}-projects`}>
          <span className={styles.summary}>
            <span className={styles.name} title={project.name}>{project.name}</span>
            <span className={styles.meta}>{project.organization} · 마감 {project.dueDate.replaceAll("-", ".")}</span>
          </span>
          <span className={styles.badge}>{view.roleLabel}</span>
          <ChevronDown16Regular aria-hidden={true} />
        </Button>
      </PopoverTrigger>
      <PopoverSurface id={`${id}-projects`} role="dialog" aria-label="프로젝트 선택" className={styles.popup}
        onKeyDownCapture={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeProjects(); } }}>
        <h2 className={styles.popupTitle}>내가 참여 중</h2>
        <div className={styles.options}>{projects.map(item => <Button key={item.id} className={mergeClasses(styles.projectOption, item.id === project.id ? "soft" : "ghost")}
          aria-pressed={item.id === project.id} onClick={() => { closeProjects(); selectProject(item.id); }}>
          <span className={styles.optionTop}><span className={styles.optionName}>{item.name}</span>{item.id === project.id && <Checkmark16Regular aria-label="현재 선택" />}</span>
          <span className={styles.meta}>{getProjectHeaderView(item).roleLabel}</span>
          <span className={styles.meta}>{item.organization} · 마감 {item.dueDate.replaceAll("-", ".")}</span>
        </Button>)}</div>
      </PopoverSurface>
    </Popover>
    {view.showRound && <span className={styles.badge}>{view.roundLabel}</span>}
  </div>} actions={<>
    {view.showRedo && <Button className={mergeClasses(styles.action, styles.iconAction)} aria-label={`${project.round + 1}차 재작업 시작`} title={`${project.round + 1}차 재작업 시작`}><ArrowCounterclockwise16Regular aria-hidden={true} /></Button>}
    {view.showHistory && <Button className={styles.action}><History16Regular aria-hidden={true} />완성본 {view.historyCount}</Button>}
    {view.showComplete && <Button className={mergeClasses(styles.action, "primary")} disabled={view.completeDisabled}><Checkmark16Regular aria-hidden={true} />완성</Button>}
    <Button className={styles.action} title="프로젝트 설정"><Settings16Regular aria-hidden={true} />설정</Button>
  </>} />;
}

export function ProjectHeaderPage({ title, headingId }: { title: string; headingId?: string }): React.ReactElement | null {
  const { isPm } = useProjectHeader();
  const pathname = usePathname();
  if (pathname === "/workspace/review" && !isPm) return null;
  return <WorkspacePage title={title} headingId={headingId} headerComponent={ProjectHeader}>{null}</WorkspacePage>;
}
