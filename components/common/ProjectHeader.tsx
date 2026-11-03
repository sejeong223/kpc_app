"use client";

import { Popover, PopoverSurface, PopoverTrigger, ProgressBar, makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { ArrowCounterclockwise16Regular, ArrowDownload16Regular, Checkmark16Regular, ChevronDown16Regular, Comment16Regular, Eye16Regular, History16Regular, LockClosed16Regular, Settings16Regular, Warning16Regular } from "@fluentui/react-icons";
import { usePathname } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";
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

function getDeadlineDays(dueDate: string, now: number | null): number | null {
  if (now === null) return null;
  const deadline = Date.parse(`${dueDate}T00:00:00Z`);
  if (!Number.isFinite(deadline)) return null;
  // 한국 날짜의 일수끼리 비교해 시각·브라우저 시간대에 따른 하루 오차를 피한다.
  const dayMs = 24 * 60 * 60 * 1000;
  const koreaOffsetMs = 9 * 60 * 60 * 1000;
  return Math.floor(deadline / dayMs) - Math.floor((now + koreaOffsetMs) / dayMs);
}

const useStyles = makeStyles({
  header: {
    fontFamily: tokens.fontFamilyBase,
    fontWeight: tokens.fontWeightRegular,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    boxSizing: "border-box", minHeight: "58px", justifyContent: "center",
    padding: "8px var(--layout-page-inset)",
    // 페이지와 제작 도구 영역의 바깥 여백까지 헤더 배경·구분선을 확장한다.
    marginTop: "calc(-1 * var(--layout-page-inset))",
    marginLeft: "calc(-1 * var(--layout-page-inset))",
    marginRight: "calc(-1 * var(--layout-page-inset))",
  },
  leading: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--layout-control-gap)", minWidth: 0, maxWidth: "100%" },
  selector: { height: "auto", minHeight: "40px", width: "360px", maxWidth: "100%", minWidth: 0, padding: "4px 10px", columnGap: "10px", textAlign: "left", whiteSpace: "normal" },
  summary: { display: "flex", flex: 1, flexDirection: "column", minWidth: 0, gap: "2px" },
  name: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 },
  meta: { fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightRegular },
  badge: { display: "inline-flex", flexShrink: 0, alignItems: "center", borderRadius: tokens.borderRadiusCircular, backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, whiteSpace: "nowrap" },
  roleBadge: { padding: "2px 7px" },
  roundBadge: { padding: "3px 9px" },
  action: { boxSizing: "border-box", height: "34px", minHeight: "34px", paddingLeft: "12px", paddingRight: "12px", columnGap: "6px" },
  iconAction: { width: "34px", minWidth: "34px", paddingLeft: 0, paddingRight: 0 },
  popup: { width: "360px", maxWidth: "calc(100vw - 32px)", maxHeight: "min(480px, calc(100svh - 100px))", boxSizing: "border-box", overflowY: "auto", padding: "8px", borderRadius: dadamUi.surfaceRadius, boxShadow: dadamUi.popoverShadow, fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight },
  popupTitle: { margin: "4px 8px 8px", fontSize: dadamUi.metaSize, color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightSemibold },
  projectOption: { position: "relative", display: "flex", alignItems: "center", height: "auto", width: "100%", padding: "10px", textAlign: "left", whiteSpace: "normal", columnGap: "12px" },
  optionBody: { display: "flex", flexDirection: "column", flex: 1, minWidth: 0, rowGap: "6px" },
  optionCheck: { position: "absolute", top: "10px", right: "10px", width: "16px", height: "16px", pointerEvents: "none" },
  optionName: { fontWeight: tokens.fontWeightSemibold, overflowWrap: "anywhere" },
  deadline: { flexShrink: 0, minWidth: "16px", textAlign: "right", whiteSpace: "nowrap", fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, fontWeight: 600, color: tokens.colorNeutralForeground3 },
  deadlineUrgent: { color: tokens.colorStatusDangerForeground1 },
  deadlineOverdue: { color: tokens.colorStatusWarningForeground1 },
  options: { display: "flex", flexDirection: "column", gap: "4px" },
  historyPopup: { width: "300px", padding: "6px", maxHeight: "70vh", fontWeight: tokens.fontWeightRegular },
  historyTitle: { margin: 0, padding: "8px 9px 4px" },
  historyActions: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px", marginTop: "6px" },
  smallButton: { height: "22px", minHeight: "22px", padding: "0 7px", columnGap: "6px", fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight },
  smallIcon: { width: "12px", height: "12px", flexShrink: 0 },
  emphasis: { fontWeight: tokens.fontWeightSemibold },
  modalHeader: { padding: "16px 18px 12px", gap: "10px" },
  modalBody: { padding: "14px 18px", gap: "12px" },
  modalFooter: { padding: "12px 18px", gap: "8px", justifyContent: "flex-end" },
  modalButton: { height: "32px", minHeight: "32px", padding: "0 12px", columnGap: "6px" },
  stats: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", margin: 0 },
  stat: { margin: 0, padding: "10px 12px", border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: dadamUi.cardRadius, backgroundColor: tokens.colorNeutralBackground1 },
  statValue: { margin: 0, fontSize: tokens.fontSizeBase500, lineHeight: tokens.lineHeightBase500, fontWeight: tokens.fontWeightSemibold },
  progress: { height: "6px", margin: "12px 0", borderRadius: "3px" },
  progressBar: { backgroundColor: tokens.colorStatusSuccessBackground3 },
  sections: { padding: 0, margin: 0, listStyleType: "none", border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: dadamUi.surfaceRadius, maxHeight: "260px", overflowY: "auto" },
  section: { display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px", borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  sectionTitle: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  status: { marginLeft: "auto", flexShrink: 0, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, whiteSpace: "nowrap" },
  done: { color: tokens.colorStatusSuccessForeground1 },
  doing: { color: tokens.colorStatusWarningForeground1 },
  groupTitle: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", margin: "16px 0 8px", fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, fontWeight: tokens.fontWeightSemibold },
  count: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "17px", height: "17px", padding: "0 5px", borderRadius: tokens.borderRadiusCircular, backgroundColor: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight },
  fixedCount: { backgroundColor: tokens.colorNeutralBackground3, color: tokens.colorNeutralForeground3 },
  reworkGroups: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px", "@media (max-width: 480px)": { gridTemplateColumns: "1fr" } },
  reworkGroup: { minWidth: 0 },
  reworkSections: { padding: 0, margin: 0, listStyleType: "none" },
  reworkSection: { padding: "3px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  warning: { display: "flex", alignItems: "flex-start", gap: "6px", padding: "8px 10px", margin: "0 0 10px", borderRadius: dadamUi.controlRadius, backgroundColor: tokens.colorStatusWarningBackground1, color: tokens.colorStatusWarningForeground1 },
  notice: { display: "flex", alignItems: "center", gap: "6px", padding: "10px 12px", margin: "0 0 12px", borderRadius: dadamUi.controlRadius, backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2 },
  version: { display: "flex", flexDirection: "column", gap: "2px", padding: "10px 12px", borderTop: `1px solid ${tokens.colorNeutralStroke2}` },
});

export default function ProjectHeader(props: ProjectHeaderProps): React.ReactElement {
  const { project } = useProjectHeader();
  const pathname = usePathname();
  const selectorRef = useRef<HTMLButtonElement>(null);
  return <ProjectHeaderContent key={`${pathname}:${project.id}`} {...props} selectorRef={selectorRef} />;
}

function ProjectHeaderContent({ selectorRef, className, ...props }: ProjectHeaderProps & { selectorRef: React.RefObject<HTMLButtonElement | null> }): React.ReactElement {
  const styles = useStyles();
  const { projects, project, selectProject } = useProjectHeader();
  const { controller } = useComments();
  const view = getProjectHeaderView(project);
  const [overlay, setOverlay] = useState<HeaderOverlay>(null);
  const [deadlineNow, setDeadlineNow] = useState<number | null>(null);
  const historyRef = useRef<HTMLButtonElement>(null);
  const completeRef = useRef<HTMLButtonElement>(null);
  const redoRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const openOverlay = useCallback((next: Exclude<HeaderOverlay, null>) => {
    if ((next === "redo" && !view.showRedo) || (next === "history" && !view.showHistory)
      || (next === "complete" && (!view.showComplete || view.completeDisabled))) return;
    controller?.suspendUi();
    if (next === "projects") setDeadlineNow(Date.now());
    setOverlay(next);
  }, [controller, view.showRedo, view.showHistory, view.showComplete, view.completeDisabled]);
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
  const modalSlots = { header: styles.modalHeader, body: styles.modalBody, footer: styles.modalFooter };

  return <><WorkspaceHeader {...props} className={mergeClasses(styles.header, className)} leading={<div className={styles.leading}>
    <Popover open={overlay === "projects"} positioning="below-start" onOpenChange={(_event, data) => data.open ? openOverlay("projects") : closeProjects()}>
      <PopoverTrigger disableButtonEnhancement>
        <Button ref={selectorRef} className={styles.selector} aria-label={`프로젝트 선택: ${project.name}`} aria-haspopup="dialog" aria-expanded={overlay === "projects"} aria-controls={`${id}-projects`}>
          <span className={styles.summary}>
            <span className={styles.name} title={project.name}>{project.name}</span>
            <span className={styles.meta}>{project.organization} · 마감 {project.dueDate.replaceAll("-", ".")}</span>
          </span>
          <span className={mergeClasses(styles.badge, styles.roleBadge)}>{view.roleLabel}</span>
          <ChevronDown16Regular aria-hidden={true} />
        </Button>
      </PopoverTrigger>
      <PopoverSurface id={`${id}-projects`} role="dialog" aria-label="프로젝트 선택" className={styles.popup} data-project-header-overlay={overlay === "projects" ? "" : undefined}
        onKeyDownCapture={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeProjects(); } }}>
        <h2 className={styles.popupTitle}>내가 참여 중</h2>
        <div className={styles.options}>{projects.map(item => {
          const days = getDeadlineDays(item.dueDate, deadlineNow);
          const deadlineLabel = days === null ? "—" : days < 0 ? `마감 경과 ${-days}일` : `D-${days}`;
          const deadlineDescription = days === null ? "마감일 확인 필요" : days < 0 ? deadlineLabel : days === 0 ? "마감 당일" : `마감까지 ${days}일`;
          return <Button key={item.id} className={mergeClasses(styles.projectOption, item.id === project.id ? "soft" : "ghost")}
            aria-pressed={item.id === project.id} onClick={() => { closeProjects(); selectProject(item.id); }}>
            <span className={styles.optionBody}>
              <span className={styles.optionName}>{item.name}</span>
              <span className={styles.meta}>{getProjectHeaderView(item).roleLabel}</span>
              <span className={styles.meta}>{item.organization} · 마감 {item.dueDate.replaceAll("-", ".")}</span>
            </span>
            <span className={mergeClasses(styles.deadline, days !== null && (days < 0 ? styles.deadlineOverdue : days <= 7 ? styles.deadlineUrgent : undefined))}
              title={deadlineDescription} aria-label={deadlineDescription}>{deadlineLabel}</span>
            {item.id === project.id && <Checkmark16Regular className={styles.optionCheck} aria-label="현재 선택" />}
          </Button>;
        })}</div>
      </PopoverSurface>
    </Popover>
    {view.showRound && <span className={mergeClasses(styles.badge, styles.roundBadge)}>{view.roundLabel}</span>}
  </div>} actions={<>
    {view.showRedo && <Button ref={redoRef} className={mergeClasses(styles.action, styles.iconAction)} aria-label={`${project.round + 1}차 재작업 시작`} title={`${project.round + 1}차 재작업 시작`}
      aria-haspopup="dialog" aria-expanded={overlay === "redo"} aria-controls={`${id}-redo`} onClick={() => openOverlay("redo")}><ArrowCounterclockwise16Regular aria-hidden={true} /></Button>}
    {view.showHistory && <Popover open={overlay === "history"} positioning="below-end" onOpenChange={(_event, data) => data.open ? openOverlay("history") : closeHistory()}>
      <PopoverTrigger disableButtonEnhancement><Button ref={historyRef} className={styles.action} aria-haspopup="dialog" aria-expanded={overlay === "history"} aria-controls={`${id}-history`}>
        <History16Regular aria-hidden={true} />완성본 {view.historyCount}
      </Button></PopoverTrigger>
      <PopoverSurface id={`${id}-history`} role="dialog" aria-label="완성본 이력" tabIndex={-1} className={mergeClasses(styles.popup, styles.historyPopup)} data-project-header-overlay={overlay === "history" ? "" : undefined}
        onKeyDownCapture={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeHistory(); } }}>
        <h2 className={mergeClasses(styles.popupTitle, styles.historyTitle)}>회차별 완성본</h2>
        {[...project.versions].sort((a, b) => b.round - a.round).map(version => <article className={styles.version} key={`${project.id}-${version.round}`}>
          <strong className={styles.emphasis}>{version.round}차 완성본</strong>
          <span className={styles.meta}>{version.at} · {version.by}</span>
          <span className={styles.meta}>작성 완료 {version.done} · 작성 중 {version.doing} · 슬라이드 {version.slides}장</span>
          <div className={styles.historyActions}>
            <Button className={styles.smallButton} disabled><Eye16Regular className={styles.smallIcon} aria-hidden={true} />보기</Button>
            <Button className={styles.smallButton} disabled><ArrowDownload16Regular className={styles.smallIcon} aria-hidden={true} />PPT</Button>
          </div>
        </article>)}
      </PopoverSurface>
    </Popover>}
    {view.showComplete && <Button ref={completeRef} className={mergeClasses(styles.action, "primary")} disabled={view.completeDisabled}
      aria-haspopup="dialog" aria-expanded={overlay === "complete"} aria-controls={`${id}-complete`} onClick={() => openOverlay("complete")}><Checkmark16Regular aria-hidden={true} />완성</Button>}
    <Button ref={settingsRef} className={styles.action} title="프로젝트 설정" aria-haspopup="dialog" aria-expanded={overlay === "settings"} aria-controls={`${id}-settings`} onClick={() => openOverlay("settings")}><Settings16Regular aria-hidden={true} />설정</Button>
  </>} />
    {overlay === "complete" && <ModalFrame open title={`${project.round}차 완성`} width={520} slotClassNames={modalSlots} contentKey={`${project.id}:complete:${project.round}`} onClose={closeOverlay}
      footer={<><Button className={styles.modalButton} onClick={closeOverlay}>취소</Button><Button className={mergeClasses(styles.modalButton, "primary")} disabled><Checkmark16Regular className={styles.smallIcon} aria-hidden={true} />{project.round}차 완성</Button></>}>
      <div id={`${id}-complete`}>
        <dl className={styles.stats}>{[["작성 완료", view.doneCount], ["작성 중", view.doingCount], ["미처리 의견", project.openCommentCount]].map(([label, count]) =>
          <div className={styles.stat} key={label}><dt className={styles.meta}>{label}</dt><dd className={mergeClasses(styles.statValue, label === "작성 중" && view.doingCount > 0 && styles.doing)}>{count}</dd></div>)}</dl>
        <ProgressBar className={styles.progress} bar={{ className: styles.progressBar }} thickness="large" max={1} value={project.sections.length ? view.doneCount / project.sections.length : 0} aria-label="섹션 작성 진행률" aria-valuetext={`작성 완료 ${view.doneCount} / 전체 ${project.sections.length}`} />
        <ul className={styles.sections}>{project.sections.map(section => <li key={section.id} className={styles.section}>
          <span className={styles.meta}>{section.no}</span><span className={styles.sectionTitle} title={section.title}>{section.title}</span>
          <span className={mergeClasses(styles.status, section.state === "done" ? styles.done : styles.doing)}>{section.state === "done" ? "작성 완료" : "작성 중"}</span>
        </li>)}</ul>
        {project.sections.length === 0 && <p className={styles.meta}>표시할 섹션이 없습니다.</p>}
      </div>
    </ModalFrame>}
    {overlay === "redo" && <ModalFrame open title={`${project.round + 1}차 재작업 시작`} width={520} slotClassNames={modalSlots} contentKey={`${project.id}:redo:${project.round + 1}`} onClose={closeOverlay}
      footer={<><Button className={styles.modalButton} onClick={closeOverlay}>취소</Button><Button className={mergeClasses(styles.modalButton, "primary")} disabled>{project.round + 1}차 재작업 시작</Button></>}>
      <div id={`${id}-redo`}>
        {project.reviewCommentCount > 0 && <p className={styles.notice}><Comment16Regular className={styles.smallIcon} aria-hidden={true} /><span><strong className={styles.emphasis}>리뷰 코멘트 {project.reviewCommentCount}건</strong>이 제작으로 전달됩니다</span></p>}
        {project.writeState !== "done" && <p className={styles.warning}><Warning16Regular className={styles.smallIcon} aria-hidden={true} /><span>{project.round}차를 완성하지 않고 재작업합니다. {project.round}차 완성본은 남지 않습니다.</span></p>}
        <div className={styles.reworkGroups}>{[{ title: "고정 (작성 완료)", fixed: true, sections: fixedSections }, { title: "다시 작업 (작성 중)", fixed: false, sections: reworkSections }].map(group => <section key={group.title} className={styles.reworkGroup}>
          <h3 className={styles.groupTitle}>{group.fixed && <LockClosed16Regular className={styles.smallIcon} aria-hidden={true} />}{group.title}<span className={mergeClasses(styles.count, group.fixed && styles.fixedCount)}>{group.sections.length}</span></h3>
          <ul className={styles.reworkSections}>{group.sections.map(section => <li className={styles.reworkSection} key={section.id} title={`${section.no} ${section.title}`}>
            <span className={styles.meta}>{section.no}</span> {section.title}
          </li>)}</ul>
          {group.sections.length === 0 && <div className={styles.meta}>없음</div>}
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
