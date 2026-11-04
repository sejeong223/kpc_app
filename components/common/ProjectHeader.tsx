"use client";
import { Popover, PopoverSurface, PopoverTrigger, makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { ChevronDown16Regular, History16Regular, Settings16Regular } from "@fluentui/react-icons";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { useComments } from "@/components/comments/CommentsProvider";
import WorkspaceHeader, { type WorkspaceHeaderProps } from "@/components/layout/WorkspaceHeader";
import WorkspacePage from "@/components/layout/WorkspacePage";
import { useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import { useWorkspaceSelection } from "@/hooks/workspace/use-workspace-selection";
import { useWorkspacePpt } from "@/hooks/workspace/use-workspace-ppt";
import { useProjectRound } from "@/hooks/workspace/use-project-round";
import ProjectRoundDialog from "@/components/workspace/shared/ProjectRoundDialog";
import { dadamUi } from "@/lib/ui/dadam-theme";
import Button from "./Button";
import { DadamSelect } from "@/components/ui/DadamControls";
import { useProjectHeader, type HeaderState } from "./ProjectHeaderProvider";
import ProjectSettingsDrawer from "./ProjectSettingsDrawer";
export type ProjectHeaderProps = WorkspaceHeaderProps;
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
    meta: { fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightRegular },
    badge: { display: "inline-flex", flexShrink: 0, alignItems: "center", borderRadius: tokens.borderRadiusCircular, backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, whiteSpace: "nowrap" },
    roleBadge: { padding: "2px 7px" },
    roundBadge: { padding: "3px 9px" },
    action: { boxSizing: "border-box", height: "34px", minHeight: "34px", paddingLeft: "12px", paddingRight: "12px", columnGap: "6px" },
    popup: { width: "360px", maxWidth: "calc(100vw - 32px)", maxHeight: "min(480px, calc(100svh - 100px))", boxSizing: "border-box", overflowY: "auto", padding: "8px", borderRadius: dadamUi.surfaceRadius, boxShadow: dadamUi.popoverShadow, fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight },
    popupTitle: { margin: "4px 8px 8px", fontSize: dadamUi.metaSize, color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightSemibold },
    historyActions: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px", marginTop: "6px" },
    version: { display: "flex", flexDirection: "column", gap: "2px", padding: "10px 12px", borderTop: `1px solid ${tokens.colorNeutralStroke2}` }
});
export default function ProjectHeader(props: ProjectHeaderProps) {
    const { state, selection } = useProjectHeader();
    const [last, setLast] = useState<Extract<HeaderState, {
        status: "ready";
    }> | null>(null);
    if (state.status === "ready" && state !== last)
        setLast(state);
    const ready = state.status === "ready" ? state : last?.view.project.id === selection.projectId && last.model.snapshotId === selection.snapshotId ? last : null;
    return ready ? <ProjectHeaderContent key={JSON.stringify([selection.projectId, ready.model.currentRound, selection.snapshotId])} {...props} header={ready} unavailable={state.status !== "ready"}/> : <HeaderLoading {...props}/>;
}
function ProjectPicker() {
    const { state, projects, selection, pending, selectProject } = useProjectHeader(), styles = useStyles();
    const [error, setError] = useState<string | null>(null);
    return <label className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1"><span className="tw:sr-only">프로젝트 선택</span><DadamSelect className={styles.selector} aria-label="프로젝트 선택" value={selection.projectId ?? ""} disabled={pending} onChange={e => { setError(null); void selectProject(e.target.value).catch(e => setError(e instanceof Error ? e.message : "선택하지 못했습니다.")); }}><option value="" disabled>{state.status === "loading" ? "프로젝트 조회 중…" : "프로젝트 선택"}</option>{projects.map(p => <option key={p.id} value={p.id}>{p.number} · {p.name}</option>)}</DadamSelect>{error && <span role="alert">{error}</span>}</label>;
}
function HeaderLoading(props: ProjectHeaderProps) { const { state } = useProjectHeader(); return <><WorkspaceHeader {...props} leading={<><ProjectPicker />{props.leading}</>} actions={props.actions}/>{state.status === "error" && <p role="alert">{state.error.message}</p>}</>; }
function ProjectHeaderContent({ leading, actions, className, header, unavailable, ...props }: ProjectHeaderProps & {
    header: Extract<HeaderState, {
        status: "ready";
    }>;
    unavailable: boolean;
}) {
    const styles = useStyles(), { state } = useProjectHeader(), runtime = useWorkspaceRuntime(), choice = useWorkspaceSelection(), { controller } = useComments();
    const [overlay, setOverlay] = useState<"settings" | "history" | null>(null), [error, setError] = useState<string | null>(null);
    const settingsRef = useRef<HTMLButtonElement>(null);
    const ppt = useWorkspacePpt();
    const round = useProjectRound(choice.selection.projectId ?? "", () => choice.commitSelection({ ...choice.selection, sectionId: null, slideId: null, snapshotId: null }), () => { controller?.suspendUi(); setOverlay(null); });
    const view = header.view, model = unavailable ? { ...header.model, canManagePermissions: false } : header.model;
    const open = (next: "settings" | "history") => { void runtime.navigate(async () => { controller?.suspendUi(); setOverlay(next); }).catch(e => setError(e instanceof Error ? e.message : "설정을 열지 못했습니다.")); };
    return <><WorkspaceHeader {...props} className={mergeClasses(styles.header, className)} leading={<div className={styles.leading}><ProjectPicker /><span className={mergeClasses(styles.badge, styles.roleBadge)}>{view.actor.role === "super_admin" ? "슈퍼 관리자" : view.actor.id === model.pmId ? "PM" : "참여자"}</span><span className={mergeClasses(styles.badge, styles.roundBadge)}>{model.displayedRound}차 {model.snapshotKind === "unfinished" ? "미완성 이력" : model.readOnly ? "보관본 · 읽기 전용" : "작업 중"}</span><span className={styles.meta}>PM {model.pmName} · 참여자 {model.members.length}명<br />{model.organization ?? "—"} · 마감 {model.dueDate ?? "—"} · 예산 {model.budgetKrw === null ? "—" : model.budgetKrw.toLocaleString() + "원"}<br />작성 완료 {model.doneSections}/{model.totalSections} · 미처리 의견 {model.openComments}</span>{leading}</div>} actions={<>{actions}
 {!unavailable && model.history.length > 0 && <Popover open={overlay === "history"} onOpenChange={(_, d) => d.open ? open("history") : setOverlay(null)}><PopoverTrigger disableButtonEnhancement><Button className={styles.action}><History16Regular />완성본 {model.completedVersions}<ChevronDown16Regular /></Button></PopoverTrigger><PopoverSurface className={styles.popup}><h2 className={styles.popupTitle}>회차 이력</h2><Button disabled={round.busy} onClick={() => { void choice.choose({ ...choice.selection, snapshotId: null, sectionId: null, slideId: null }).then(() => { if (runtime.selection.get()?.snapshotId === null)
            setOverlay(null); }).catch(e => setError(e.message)); }}>현재 작업으로</Button>{model.history.map(h => { const version = view.state.pptVersions.find(v => v.id === h.pptVersionId && v.round === h.round); return <article key={h.id} className={styles.version}><strong>{h.round}차 {h.kind === "complete" ? "완성본" : "미완성 이력"}</strong><span>{new Date(h.createdAt).toLocaleString("ko-KR")}</span><div className={styles.historyActions}><Button disabled={round.busy} onClick={() => { void choice.choose({ ...choice.selection, snapshotId: h.id, sectionId: null, slideId: null }).then(() => { if (runtime.selection.get()?.snapshotId === h.id)
            setOverlay(null); }).catch(e => setError(e.message)); }}>보기</Button>{version ? <Button disabled={ppt.task.isPending} onClick={() => ppt.task.mutate({ kind: "download", projectId: model.projectId, versionId: version.id })}>PPT</Button> : <span>보관된 PPT 없음</span>}</div></article>; })}</PopoverSurface></Popover>}
 {model.snapshotId && <Button disabled={round.busy} onClick={() => { void choice.choose({ ...choice.selection, snapshotId: null, sectionId: null, slideId: null }).catch(e => setError(e.message)); }}>현재 작업으로</Button>}
 {!unavailable && !model.snapshotId && model.actions.complete && <Button className="primary" disabled={round.busy} onClick={() => round.open("complete")}>완성</Button>}
 {!unavailable && !model.snapshotId && model.actions.rework && <Button disabled={round.busy} onClick={() => round.open("start-round")}>재작업</Button>}
 <Button ref={settingsRef} disabled={unavailable} className={styles.action} onClick={() => open("settings")}><Settings16Regular />설정</Button></>}/>
 {ppt.task.error && <p role="alert">{ppt.task.error.message}</p>}
 {state.status === "error" && <p role="alert">{state.error.message}</p>}
 {(error || (!round.dialog && round.error)) && <p role="alert">{error ?? round.error}</p>}
 {overlay === "settings" && <ProjectSettingsDrawer id="project-settings" project={model} view={view} onClose={() => setOverlay(null)} returnFocusRef={settingsRef}/>}
 {round.dialog && <ProjectRoundDialog key={round.dialog.mode + ":" + round.dialog.view.state.revision} open mode={round.dialog.mode} view={round.dialog.view} busy={round.busy} error={round.error} onConfirm={input => { void round.confirm(input).catch(() => { }); }} onClose={round.close} onReload={() => { if (round.dialog)
        round.open(round.dialog.mode); }}/>}
 </>;
}
export function ProjectHeaderPage({ title, headingId }: {
    title: string;
    headingId?: string;
}) { const { state, isPm } = useProjectHeader(), path = usePathname(); return <WorkspacePage title={title} headingId={headingId} headerComponent={ProjectHeader}>{path === "/workspace/review" && state.status === "ready" && !isPm ? <p>제작 화면으로 이동합니다.</p> : null}</WorkspacePage>; }
