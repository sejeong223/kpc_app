"use client";
import { Popover, PopoverSurface, PopoverTrigger, makeStyles, mergeClasses, shorthands, tokens } from "@fluentui/react-components";
import { ArrowCounterclockwise16Regular, Checkmark16Regular, ChevronDown16Regular, History16Regular, Settings16Regular, Eye12Regular, ArrowDownload16Regular, LockClosed16Regular } from "@fluentui/react-icons";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useComments } from "@/components/comments/CommentsProvider";
import WorkspaceHeader, { type WorkspaceHeaderProps } from "@/components/layout/WorkspaceHeader";
import WorkspacePage from "@/components/layout/WorkspacePage";
import { useOptionalWorkspaceRuntime, useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import { useWorkspaceSelection } from "@/hooks/workspace/use-workspace-selection";
import { useWorkspacePpt } from "@/hooks/workspace/use-workspace-ppt";
import { useProjectRound } from "@/hooks/workspace/use-project-round";
import ProjectRoundDialog from "@/components/workspace/shared/ProjectRoundDialog";
import { getHeaderDeadline, getHeaderRoundLabel } from "@/lib/workspace/production/header-selectors";
import { dadamUi } from "@/lib/ui/dadam-theme";
import { workspaceHref } from "@/lib/workspace/production/routing";
import Button from "./Button";
import { useProjectHeader, type HeaderState } from "./ProjectHeaderProvider";
import ProjectSettingsDrawer from "./ProjectSettingsDrawer";
export type ProjectHeaderProps = WorkspaceHeaderProps;
const useStyles = makeStyles({
    header: {
        fontFamily: tokens.fontFamilyBase, fontWeight: tokens.fontWeightRegular,
        backgroundColor: tokens.colorNeutralBackground1, borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        boxSizing: "border-box", minHeight: "58px", justifyContent: "center", padding: "8px 12px", "--layout-control-gap": "8px",
        marginTop: "calc(-1 * var(--layout-page-inset))", marginLeft: "calc(-1 * var(--layout-page-inset))", marginRight: "calc(-1 * var(--layout-page-inset))",
    },
    leading: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", minWidth: 0, maxWidth: "100%", "@media (max-width: 760px)": { width: "100%" } },
    selector: { height: "auto", minHeight: "40px", width: "560px", maxWidth: "100%", minWidth: 0, padding: "4px 10px", columnGap: "10px", textAlign: "left", whiteSpace: "normal", "@media (max-width: 760px)": { width: "100%" } },
    summary: { display: "flex", flex: 1, minWidth: 0, flexDirection: "column", gap: "2px" },
    name: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "14px", lineHeight: "20px", fontWeight: 500 },
    meta: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "12px", lineHeight: "16px", color: tokens.colorNeutralForeground3, fontWeight: 400 },
    badge: { display: "inline-flex", flexShrink: 0, alignItems: "center", borderRadius: "999px", padding: "2px 8px", backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2, fontSize: "12px", lineHeight: "16px", whiteSpace: "nowrap" },
    roundBadge: { padding: "2px 8px" },
    action: { boxSizing: "border-box", height: "34px", minHeight: "34px", paddingLeft: "12px", paddingRight: "12px", columnGap: "6px" },
    iconAction: { width: "34px", minWidth: "34px", padding: 0 },
    popup: { width: "360px", maxWidth: "calc(100vw - 32px)", maxHeight: "min(480px, calc(100svh - 100px))", boxSizing: "border-box", overflowY: "auto", padding: "8px", borderRadius: "8px", boxShadow: dadamUi.popoverShadow, fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight },
    picker: { width: "640px" },
    popupTitle: { margin: "4px 8px 8px", fontSize: "12px", color: tokens.colorNeutralForeground3, fontWeight: 500 },
    option: { display: "flex", width: "100%", height: "auto", padding: "10px", gap: "16px", marginBottom: "4px", textAlign: "left", ...shorthands.borderColor("transparent"), "&[aria-pressed='true']": { backgroundColor: tokens.colorBrandBackground2 } },
    optionBody: { rowGap: "6px" },
    optionName: { fontWeight: 600 },
    optionStatus: { display: "flex", flexShrink: 0, alignItems: "center", gap: "8px" },
    check: { display: "inline-flex", width: "16px", color: tokens.colorBrandForeground1 },
    deadline: { fontSize: "12px", lineHeight: "16px", fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: tokens.colorNeutralForeground3 },
    urgent: { color: tokens.colorStatusDangerForeground1 },
    overdue: { color: tokens.colorStatusWarningForeground1 },
    historyActions: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px", marginTop: "6px", "& button": { height: "22px", minHeight: "22px", padding: "0 7px", gap: "6px", fontSize: "12px", lineHeight: "16px" } },
    history: { width: "300px", padding: "6px", maxHeight: "70vh", "& h2": { margin: 0, padding: "8px 9px 4px", fontSize: "12px", lineHeight: "16px", fontWeight: 600 } },
    readOnly: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", padding: "8px 12px", backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2, fontSize: "12px", lineHeight: "16px", "& button": { marginLeft: "auto", height: "28px", fontSize: "12px" } },
    version: { display: "flex", flexDirection: "column", gap: "2px", padding: "10px 12px", borderTop: `1px solid ${tokens.colorNeutralStroke2}` },
});
export default function ProjectHeader(props: ProjectHeaderProps) {
    const { state, selection } = useProjectHeader();
    const [last, setLast] = useState<Extract<HeaderState, { status: "ready" }> | null>(null);
    if (state.status === "ready" && state !== last) setLast(state);
    const ready = state.status === "ready" ? state : last?.view.project.id === selection.projectId && last.model.snapshotId === selection.snapshotId ? last : null;
    return ready ? <ProjectHeaderContent key={JSON.stringify([selection.projectId, selection.snapshotId])} {...props} header={ready} unavailable={state.status !== "ready"} /> : <HeaderLoading {...props} />;
}
function ProjectPicker({ open: controlledOpen, onOpenChange, disabled = false }: { open?: boolean; onOpenChange?(open: boolean): void; disabled?: boolean } = {}) {
    const { state, pickerItems, selection, pending, selectProject } = useProjectHeader(), styles = useStyles();
    const runtime = useOptionalWorkspaceRuntime(), { controller } = useComments(), id = useId();
    const trigger = useRef<HTMLButtonElement>(null), running = useRef(false), mounted = useRef(true);
    const [picker, setPicker] = useState({ open: false, openedAt: 0, error: null as string | null });
    const [selecting, setSelecting] = useState(false);
    const isOpen = controlledOpen ?? picker.open;
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    const selected = pickerItems.find(p => p.id === selection.projectId);
    const close = () => { setPicker(p => ({ ...p, open: false })); onOpenChange?.(false); requestAnimationFrame(() => { if (!document.querySelector("[data-modal-frame], [role='dialog']")) trigger.current?.focus(); }); };
    const choose = async (projectId: string) => {
        if (running.current || pending) return;
        running.current = true; setSelecting(true); setPicker(p => ({ ...p, error: null }));
        try {
            await selectProject(projectId);
            if (runtime?.isActive() && runtime.selection.get()?.projectId === projectId) {
                if (mounted.current) close();
                // 프로젝트 변경 시 헤더가 새로 마운트되어도 새 선택 버튼으로 복귀한다.
                requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("[data-project-picker]")?.focus());
            }
        } catch (error) {
            if (mounted.current) setPicker(p => ({ ...p, error: error instanceof Error ? error.message : "선택하지 못했습니다." }));
        } finally { running.current = false; if (mounted.current) setSelecting(false); }
    };
    return <Popover open={isOpen} onOpenChange={(_, data) => {
        if (!data.open) { close(); return; }
        if (disabled) return;
        controller?.suspendUi(); onOpenChange?.(true); setPicker({ open: true, openedAt: Date.now(), error: null });
    }} positioning={{ position: "below", align: "start" }}>
        <PopoverTrigger disableButtonEnhancement><Button ref={trigger} data-project-picker className={styles.selector} disabled={disabled || pending || selecting || !pickerItems.length}
            aria-label={selected ? `프로젝트 선택: ${selected.name}` : "프로젝트 선택"} aria-haspopup="dialog" aria-expanded={isOpen} aria-controls={id} aria-disabled={disabled}>
            <span className={styles.summary}><span className={styles.name} title={selected?.name}>{selected?.name ?? (state.status === "loading" ? "프로젝트 조회 중…" : "프로젝트 선택")}</span>
                <span className={styles.meta} title={selected ? `${selected.organization ?? "—"} · ${selected.departmentName ?? "—"} · 마감 ${selected.dueDate?.replaceAll("-", ".") ?? "—"}` : undefined}>{selected ? `${selected.organization ?? "—"} · ${selected.departmentName ?? "—"} · 마감 ${selected.dueDate?.replaceAll("-", ".") ?? "—"}` : "참여 중인 프로젝트"}</span></span>
            {selected && <span className={styles.badge} title={selected.roleLabels.join(" · ")}>{selected.roleLabels.join(" · ")}</span>}<ChevronDown16Regular />
        </Button></PopoverTrigger>
        <PopoverSurface id={id} role="dialog" aria-labelledby={id + "-title"} className={mergeClasses(styles.popup, styles.picker)}>
            <h2 id={id + "-title"} className={styles.popupTitle}>내가 참여 중</h2>
            {pickerItems.map(project => {
                const deadline = getHeaderDeadline(project.dueDate, picker.openedAt), summary = `${project.roleLabels.join(" · ")} · ${project.organization ?? "—"} · ${project.departmentName ?? "—"}`;
                return <Button key={project.id} className={styles.option} aria-pressed={project.id === selection.projectId} disabled={pending || selecting} onClick={() => { void choose(project.id); }}>
                    <span className={mergeClasses(styles.summary, styles.optionBody)}><span className={mergeClasses(styles.name, styles.optionName)} title={project.name}>{project.name}</span><span className={styles.meta} title={summary}>{summary}</span></span>
                    <span className={styles.optionStatus}><span className={styles.check} aria-hidden="true">{project.id === selection.projectId && <Checkmark16Regular />}</span>
                        <span className={mergeClasses(styles.deadline, deadline.tone === "urgent" && styles.urgent, deadline.tone === "overdue" && styles.overdue)} aria-label={deadline.description}
                            title={`${project.dueDate?.replaceAll("-", ".") ?? "—"} · ${deadline.description}`}>{deadline.label}</span></span>
                </Button>;
            })}
            {picker.error && <p role="alert">{picker.error}</p>}
        </PopoverSurface>
    </Popover>;
}
function HeaderLoading({ className, ...props }: ProjectHeaderProps) {
    const { state } = useProjectHeader(), styles = useStyles();
    return <><WorkspaceHeader {...props} className={mergeClasses(styles.header, className)} leading={<div className={styles.leading}><ProjectPicker />{props.leading}</div>} />{state.status === "error" && <p role="alert">{state.error.message}</p>}</>;
}
function ProjectHeaderContent({ leading, actions, className, header, unavailable, ...props }: ProjectHeaderProps & { header: Extract<HeaderState, { status: "ready" }>; unavailable: boolean }) {
    const styles = useStyles(), { state, notify } = useProjectHeader(), runtime = useWorkspaceRuntime(), choice = useWorkspaceSelection(), { controller } = useComments();
    const pathname = usePathname(), router = useRouter();
    const [overlay, setOverlay] = useState<"picker" | "settings" | "history" | null>(null), [error, setError] = useState<string | null>(null);
    const settingsRef = useRef<HTMLButtonElement>(null), ppt = useWorkspacePpt();
    const round = useProjectRound(choice.selection.projectId ?? "", async result => {
        const next = { ...choice.selection, sectionId: result.mode === "start-round" && pathname === "/workspace/review" ? result.firstReviewSectionId : null, slideId: null, snapshotId: null };
        await choice.commitSelection(next);
        if (!runtime.isActive() || runtime.selection.get()?.projectId !== next.projectId) return;
        if (result.mode === "start-round") router.replace(workspaceHref(pathname === "/workspace/review" ? "write" : "files", runtime.selection.get() ?? next));
        notify(result.mode === "complete" ? `${result.currentRound}차 완성본을 저장했습니다` : `${result.currentRound}차 재작업을 시작했습니다${result.carriedReviews ? ` · 리뷰 코멘트 ${result.carriedReviews}건을 제작으로 전달했습니다` : ""}`);
    }, () => { controller?.suspendUi(); setOverlay(null); });
    const view = header.view, model = unavailable ? { ...header.model, canManagePermissions: false } : header.model;
    const open = (next: "settings" | "history") => { if (round.busy) return; void runtime.navigate(async () => { round.close(); controller?.suspendUi(); setOverlay(next); }).catch(e => setError(e instanceof Error ? e.message : "설정을 열지 못했습니다.")); };
    const chooseSnapshot = (snapshotId: string | null) => { void choice.choose({ ...choice.selection, snapshotId, sectionId: null, slideId: null }).then(() => {
        if (runtime.isActive() && runtime.selection.get()?.projectId === model.projectId && runtime.selection.get()?.snapshotId === snapshotId) {
            setOverlay(null);
            requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("[data-project-picker]")?.focus());
        }
    }).catch(e => setError(e.message)); };
    const versionRow = (h: typeof model.history[number]) => {
        const version = view.state.pptVersions.find(v => v.id === h.pptVersionId && v.round === h.round && v.inputRevision === h.inputRevision && (v.snapshotId === null || v.snapshotId === h.id));
        return <article key={h.id} className={styles.version}><strong>{h.round}차 완성본</strong><span className={styles.meta}>{new Date(h.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · {h.createdByName}</span>
            <span className={styles.meta}>작성 완료 {h.doneSections} · 작성 중 {h.writingSections} · 슬라이드 {h.slides}장</span>
            <div className={styles.historyActions}><Button disabled={round.busy || choice.pending} onClick={() => chooseSnapshot(h.id)}><Eye12Regular />보기</Button>
                <Button disabled={!version || ppt.task.isPending} title={!version ? "보관된 PPT 없음" : undefined} onClick={() => { if (version) ppt.task.mutate({ kind: "download", projectId: model.projectId, versionId: version.id }); }}><ArrowDownload16Regular style={{width:12,height:12}} />PPT</Button>
                {!version && <span className={styles.meta}>보관된 PPT 없음</span>}</div></article>;
    };
    const completed = model.history.find(h => h.round === model.currentRound && h.kind === "complete");
    return <><WorkspaceHeader {...props} className={mergeClasses(styles.header, className)} leading={<div className={styles.leading}><ProjectPicker open={overlay === "picker"} disabled={round.busy} onOpenChange={value => { if (value) round.close(); setOverlay(current => value ? "picker" : current === "picker" ? null : current); }} /><span className={mergeClasses(styles.badge, styles.roundBadge)}>{getHeaderRoundLabel(model)}</span>{leading}</div>} actions={<>{actions}
        {!unavailable && !model.snapshotId && model.actions.rework && <Button className={mergeClasses(styles.action, styles.iconAction)} disabled={round.busy} aria-label={`${model.currentRound + 1}차 재작업 시작`} title={`${model.currentRound + 1}차 재작업 시작`} onClick={() => round.open("start-round")}><ArrowCounterclockwise16Regular /></Button>}
        {!unavailable && model.history.length > 0 && <Popover positioning={{ position: "below", align: "end" }} open={overlay === "history"} onOpenChange={(_, d) => d.open ? open("history") : setOverlay(current => current === "history" ? null : current)}><PopoverTrigger disableButtonEnhancement><Button disabled={round.busy} className={styles.action} aria-haspopup="dialog"><History16Regular />완성본 {model.completedVersions}</Button></PopoverTrigger>
            <PopoverSurface className={mergeClasses(styles.popup, styles.history)} aria-label="완성본 이력"><h2 className={styles.popupTitle}>회차별 완성본</h2>
                {model.history.filter(h => h.kind === "complete").map(versionRow)}{!model.completedVersions && <p className={styles.meta}>완성본이 없습니다.</p>}
            </PopoverSurface></Popover>}
        {!unavailable && !model.snapshotId && model.canComplete && <Button className={mergeClasses(styles.action, "primary")} disabled={round.busy || model.phase === "completed"} title={model.phase === "completed" ? "완성됨 · 왼쪽 재작업 버튼으로 다시 진행" : undefined} onClick={() => round.open("complete")}><Checkmark16Regular />완성</Button>}
        <Button ref={settingsRef} disabled={unavailable || round.busy} className={styles.action} onClick={() => open("settings")}><Settings16Regular />설정</Button>
    </>} />
        {model.snapshotId ? <div className={styles.readOnly}><LockClosed16Regular /><span>{model.displayedRound}차 보관본을 보고 있습니다. 내용을 바꾸려면 현재 작업으로 돌아가세요.</span><Button disabled={round.busy || choice.pending} onClick={() => chooseSnapshot(null)}>현재 작업으로</Button></div>
            : model.phase === "completed" && <div className={styles.readOnly}><LockClosed16Regular /><strong>{model.currentRound}차 완성본</strong><span>읽기 전용{completed ? ` · ${new Date(completed.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · ${completed.createdByName} · 작성 완료 ${completed.doneSections}개 · 작성 중 ${completed.writingSections}개` : ""}</span></div>}
        {ppt.task.error && <p role="alert">{ppt.task.error.message}</p>}{state.status === "error" && <p role="alert">{state.error.message}</p>}
        {(error || (!round.dialog && round.error)) && <p role="alert">{error ?? round.error}</p>}
        {overlay === "settings" && <ProjectSettingsDrawer id="project-settings" project={model} view={view} onClose={() => setOverlay(null)} returnFocusRef={settingsRef} />}
        {round.dialog && <ProjectRoundDialog key={round.dialog.mode + ":" + round.dialog.view.state.revision} open mode={round.dialog.mode} view={round.dialog.view} busy={round.busy} error={round.error} onConfirm={input => { void round.confirm(input).catch(() => {}); }} onClose={round.close} onReload={() => { if (round.dialog) round.open(round.dialog.mode); }} />}
    </>;
}
export function ProjectHeaderPage({ title, headingId }: { title: string; headingId?: string }) {
    const { state, isPm } = useProjectHeader(), path = usePathname();
    return <WorkspacePage title={title} headingId={headingId} headerComponent={ProjectHeader}>{path === "/workspace/review" && state.status === "ready" && !isPm ? <p>제작 화면으로 이동합니다.</p> : null}</WorkspacePage>;
}
