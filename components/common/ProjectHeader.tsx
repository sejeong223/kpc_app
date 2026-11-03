"use client";

import { Popover, PopoverSurface, PopoverTrigger, ProgressBar, makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { ArrowCounterclockwise16Regular, Checkmark16Regular, ChevronDown16Regular, History16Regular, Settings16Regular } from "@fluentui/react-icons";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";
import { useComments } from "@/components/comments/CommentsProvider";
import WorkspaceHeader, { type WorkspaceHeaderProps } from "@/components/layout/WorkspaceHeader";
import WorkspacePage from "@/components/layout/WorkspacePage";
import ModalFrame from "@/components/ui/ModalFrame";
import { getProjectHeaderView } from "@/config/project-header";
import { dadamUi } from "@/lib/ui/dadam-theme";
import Button from "./Button";
import { useProjectHeader } from "./ProjectHeaderProvider";
import ProjectSettingsDrawer from "./ProjectSettingsDrawer";

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
  stack: { display: "flex", flexDirection: "column", gap: "16px" },
  row: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" },
  stats: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", margin: 0 },
  stat: { margin: 0, padding: "12px", borderRadius: dadamUi.cardRadius, backgroundColor: tokens.colorNeutralBackground2 },
  statValue: { margin: "4px 0 0", fontSize: tokens.fontSizeBase500, lineHeight: tokens.lineHeightBase500, fontWeight: tokens.fontWeightSemibold },
  sections: { display: "flex", flexDirection: "column", gap: "8px", padding: 0, margin: 0, listStyleType: "none" },
  section: { display: "flex", alignItems: "baseline", gap: "8px", padding: "8px 0", borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  sectionTitle: { flex: 1, minWidth: 0, overflowWrap: "anywhere" },
  status: { flexShrink: 0, fontSize: dadamUi.metaSize, color: tokens.colorNeutralForeground3, whiteSpace: "nowrap" },
  done: { color: tokens.colorStatusSuccessForeground1 },
  groupTitle: { margin: "0 0 8px", fontSize: dadamUi.bodySize, fontWeight: tokens.fontWeightSemibold },
  reworkGroups: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px", "@media (max-width: 480px)": { gridTemplateColumns: "1fr" } },
  warning: { padding: "12px", margin: 0, borderRadius: dadamUi.controlRadius, backgroundColor: tokens.colorStatusWarningBackground1, color: tokens.colorStatusWarningForeground1 },
  notice: { padding: "12px", margin: 0, borderRadius: dadamUi.controlRadius, backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2 },
  version: { display: "flex", flexDirection: "column", gap: "6px", padding: "12px 8px", borderTop: `1px solid ${tokens.colorNeutralStroke2}` },
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
  const historyRef = useRef<HTMLButtonElement>(null);
  const completeRef = useRef<HTMLButtonElement>(null);
  const redoRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const openOverlay = (next: Exclude<HeaderOverlay, null>) => {
    if ((next === "redo" && !view.showRedo) || (next === "history" && !view.showHistory)
      || (next === "complete" && (!view.showComplete || view.completeDisabled))) return;
    controller?.suspendUi();
    setOverlay(next);
  };
  const closeOverlay = () => setOverlay(null);
  const closeProjects = () => {
    if (overlay !== "projects") return;
    setOverlay(null);
    requestAnimationFrame(() => { if (selectorRef.current?.isConnected && !document.querySelector("[data-modal-frame], [data-project-header-overlay]")) selectorRef.current.focus({ preventScroll: true }); });
  };
  const closeHistory = () => {
    if (overlay !== "history") return;
    setOverlay(null);
    requestAnimationFrame(() => { if (historyRef.current?.isConnected && !document.querySelector("[data-modal-frame], [data-project-header-overlay]")) historyRef.current.focus({ preventScroll: true }); });
  };
  const fixedSections = project.sections.filter(section => section.state === "done");
  const reworkSections = project.sections.filter(section => section.state === "doing");

  return <><WorkspaceHeader {...props} leading={<div className={styles.leading}>
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
      <PopoverSurface id={`${id}-projects`} role="dialog" aria-label="프로젝트 선택" className={styles.popup} data-project-header-overlay={overlay === "projects" ? "" : undefined}
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
    {view.showRedo && <Button ref={redoRef} className={mergeClasses(styles.action, styles.iconAction)} aria-label={`${project.round + 1}차 재작업 시작`} title={`${project.round + 1}차 재작업 시작`}
      aria-haspopup="dialog" aria-expanded={overlay === "redo"} aria-controls={`${id}-redo`} onClick={() => openOverlay("redo")}><ArrowCounterclockwise16Regular aria-hidden={true} /></Button>}
    {view.showHistory && <Popover open={overlay === "history"} positioning="below-end" onOpenChange={(_event, data) => data.open ? openOverlay("history") : closeHistory()}>
      <PopoverTrigger disableButtonEnhancement><Button ref={historyRef} className={styles.action} aria-haspopup="dialog" aria-expanded={overlay === "history"} aria-controls={`${id}-history`}>
        <History16Regular aria-hidden={true} />완성본 {view.historyCount}
      </Button></PopoverTrigger>
      <PopoverSurface id={`${id}-history`} role="dialog" aria-label="완성본 이력" tabIndex={-1} className={styles.popup} data-project-header-overlay={overlay === "history" ? "" : undefined}
        onKeyDownCapture={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeHistory(); } }}>
        <h2 className={styles.popupTitle}>회차별 완성본</h2>
        {[...project.versions].sort((a, b) => b.round - a.round).map(version => <article className={styles.version} key={`${project.id}-${version.round}`}>
          <strong>{version.round}차 완성본</strong>
          <span className={styles.meta}>{version.at} · {version.by}</span>
          <span className={styles.meta}>작성 완료 {version.done} · 작성 중 {version.doing} · 슬라이드 {version.slides}장</span>
          <div className={styles.row}><Button disabled>보기</Button><Button disabled>PPT</Button></div>
        </article>)}
      </PopoverSurface>
    </Popover>}
    {view.showComplete && <Button ref={completeRef} className={mergeClasses(styles.action, "primary")} disabled={view.completeDisabled}
      aria-haspopup="dialog" aria-expanded={overlay === "complete"} aria-controls={`${id}-complete`} onClick={() => openOverlay("complete")}><Checkmark16Regular aria-hidden={true} />완성</Button>}
    <Button ref={settingsRef} className={styles.action} title="프로젝트 설정" aria-haspopup="dialog" aria-expanded={overlay === "settings"} aria-controls={`${id}-settings`} onClick={() => openOverlay("settings")}><Settings16Regular aria-hidden={true} />설정</Button>
  </>} />
    {overlay === "complete" && <ModalFrame open title={`${project.round}차 완성`} subtitle={project.name} contentKey={`${project.id}:complete:${project.round}`} onClose={closeOverlay}
      footer={<><Button onClick={closeOverlay}>취소</Button><Button className="primary" disabled>{project.round}차 완성</Button></>}>
      <div id={`${id}-complete`} className={styles.stack}>
        <dl className={styles.stats}>{[["작성 완료", view.doneCount], ["작성 중", view.doingCount], ["미처리 의견", project.openCommentCount]].map(([label, count]) =>
          <div className={styles.stat} key={label}><dt className={styles.meta}>{label}</dt><dd className={styles.statValue}>{count}</dd></div>)}</dl>
        <div className={styles.stack}>
          <ProgressBar max={1} value={project.sections.length ? view.doneCount / project.sections.length : 0} aria-label="섹션 작성 진행률" aria-valuetext={`작성 완료 ${view.doneCount} / 전체 ${project.sections.length}`} />
          <span className={styles.meta}>작성 완료 {view.doneCount} / 전체 {project.sections.length}</span>
        </div>
        <ul className={styles.sections}>{project.sections.map(section => <li key={section.id} className={styles.section}>
          <span className={styles.meta}>{section.no}</span><span className={styles.sectionTitle}>{section.title}</span>
          <span className={mergeClasses(styles.status, section.state === "done" && styles.done)}>{section.state === "done" ? "작성 완료" : "작성 중"}</span>
        </li>)}</ul>
        {project.sections.length === 0 && <p className={styles.meta}>표시할 섹션이 없습니다.</p>}
      </div>
    </ModalFrame>}
    {overlay === "redo" && <ModalFrame open title={`${project.round + 1}차 재작업 시작`} subtitle={project.name} contentKey={`${project.id}:redo:${project.round + 1}`} onClose={closeOverlay}
      footer={<><Button onClick={closeOverlay}>취소</Button><Button className="primary" disabled>{project.round + 1}차 재작업 시작</Button></>}>
      <div id={`${id}-redo`} className={styles.stack}>
        {project.reviewCommentCount > 0 && <p className={styles.notice}>리뷰 코멘트 {project.reviewCommentCount}건이 제작으로 전달됩니다.</p>}
        {project.writeState !== "done" && <p className={styles.warning}>{project.round}차를 완성하지 않고 재작업합니다. {project.round}차 완성본은 남지 않습니다.</p>}
        <div className={styles.reworkGroups}>{[{ title: "작성 완료로 고정", sections: fixedSections }, { title: "다시 작업", sections: reworkSections }].map(group => <section key={group.title}>
          <h3 className={styles.groupTitle}>{group.title} <span className={styles.meta}>{group.sections.length}</span></h3>
          <ul className={styles.sections}>{group.sections.map(section => <li className={styles.section} key={section.id}>
            <span className={styles.meta}>{section.no}</span><span className={styles.sectionTitle}>{section.title}</span>
          </li>)}</ul>
          {group.sections.length === 0 && <p className={styles.meta}>해당 섹션 없음</p>}
        </section>)}</div>
      </div>
    </ModalFrame>}
    {overlay === "settings" && <ProjectSettingsDrawer id={`${id}-settings`} project={project} onClose={closeOverlay} returnFocusRef={settingsRef} />}
  </>;
}

export function ProjectHeaderPage({ title, headingId }: { title: string; headingId?: string }): React.ReactElement | null {
  const { isPm } = useProjectHeader();
  const pathname = usePathname();
  if (pathname === "/workspace/review" && !isPm) return null;
  return <WorkspacePage title={title} headingId={headingId} headerComponent={ProjectHeader}>{null}</WorkspacePage>;
}
