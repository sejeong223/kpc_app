"use client";
import { DrawerBody, DrawerHeader, OverlayDrawer, Tab, TabList } from "@fluentui/react-components";
import { useState } from "react";
import { DadamButton, DadamCheckbox } from "@/components/ui/DadamControls";
import { PROJECT_PERMISSIONS, PROJECT_PERMISSION_LABELS } from "@/config/workspace-production";
import { useProjectPermissions } from "@/hooks/workspace/use-project-permissions";
import { useWorkspaceDraftGuard } from "@/hooks/workspace/use-workspace-draft-guard";
import FileDiscardDialog from "@/components/workspace/files/FileDiscardDialog";
import { workspaceTable } from "@/components/workspace/shared/WorkspaceUi";
import type { WorkspaceHeaderModel } from "@/types/workspace-header";
import type { ProjectView } from "@/types/workspace-production";
export interface ProjectSettingsDrawerProps {
    id: string;
    project: WorkspaceHeaderModel;
    view: ProjectView;
    onClose(): void;
    returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}
export default function ProjectSettingsDrawer({ id, project, view, onClose, returnFocusRef }: ProjectSettingsDrawerProps) {
    const [tab, setTab] = useState("info"), permissions = useProjectPermissions(view, project.snapshotId !== null || !project.canManagePermissions);
    const guard = useWorkspaceDraftGuard({ dirty: permissions.dirty, busy: permissions.busy, onDiscard: permissions.discard, onSave: permissions.canEdit ? permissions.save : undefined });
    const close = () => guard.request(() => { onClose(); requestAnimationFrame(() => returnFocusRef.current?.focus()); });
    return <><OverlayDrawer id={id} open position="end" size="large" data-modal-frame="" aria-label="프로젝트 설정" onOpenChange={(_, d) => { if (!d.open)
        close(); }} onKeyDownCapture={e => { if (e.key === "Escape" && !guard.confirmOpen) {
        e.preventDefault();
        e.stopPropagation();
        close();
    } }}><DrawerHeader><strong>프로젝트 설정</strong><DadamButton disabled={permissions.busy} onClick={close}>닫기</DadamButton></DrawerHeader><DrawerBody>
 <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(String(d.value))}>{[["info", "기본정보"], ["permissions", "권한"], ["notifications", "알림"], ["log", "활동 로그"]].map(([value, label]) => <Tab key={value} value={value}>{label}</Tab>)}</TabList>
 {tab === "info" && <><dl className="tw:grid tw:grid-cols-[auto_1fr] tw:gap-(--layout-section-gap)">{[["프로젝트", project.name], ["번호", project.number], ["발주처", project.organization ?? "—"], ["마감", project.dueDate ?? "—"], ["예산", project.budgetKrw === null ? "—" : project.budgetKrw.toLocaleString() + "원"], ["PM", project.pmName]].map(([label, value]) => <div key={label} className="tw:contents"><dt>{label}</dt><dd className="tw:m-0">{value}</dd></div>)}</dl><h3>참여자</h3><ul>{view.members.map(m => <li key={m.id}>{m.name} · {m.departmentName}</li>)}</ul></>}
 {tab === "permissions" && <><p>PM과 슈퍼 관리자는 전체 권한이 고정됩니다. 본문 편집은 담당자 지정에 따릅니다.</p><div className="tw:overflow-x-auto"><table className={workspaceTable}><thead><tr><th>참여자</th>{PROJECT_PERMISSIONS.map(p => <th key={p}>{PROJECT_PERMISSION_LABELS[p]}</th>)}</tr></thead><tbody>{view.members.map(m => { const fixed = m.id === project.pmId || m.role === "super_admin" || (m.id === view.actor.id && view.actor.role === "super_admin"), values = permissions.rows.find(r => r.userId === m.id)?.permissions ?? []; return <tr key={m.id}><td>{m.name}{fixed && <small> · 전체 권한 · 고정</small>}</td>{PROJECT_PERMISSIONS.map(p => <td key={p}>{fixed ? "전체" : permissions.canEdit ? <DadamCheckbox aria-label={m.name + " " + PROJECT_PERMISSION_LABELS[p]} checked={values.includes(p)} disabled={permissions.busy} onChange={(_, d) => permissions.change(m.id, p, d.checked === true)}/> : values.includes(p) ? "허용" : "—"}</td>)}</tr>; })}</tbody></table></div>
 <div className="tw:flex tw:justify-end tw:gap-(--layout-control-gap)"><DadamButton disabled={permissions.busy} onClick={() => guard.request(() => { void permissions.reload(); })}>다시 불러오기</DadamButton>{permissions.canEdit && <DadamButton appearance="primary" disabled={!permissions.dirty || permissions.busy || permissions.stale} onClick={() => { void permissions.save().catch(() => { }); }}>변경 저장</DadamButton>}</div></>}
 {(tab === "notifications" || tab === "log") && <p>아직 연결되지 않았습니다.</p>}
 {permissions.error && <p role="alert">{permissions.error}</p>}
 </DrawerBody></OverlayDrawer><FileDiscardDialog open={guard.confirmOpen} onKeep={guard.keepEditing} onDiscard={guard.discardAndContinue} onSave={guard.canSave ? () => { void guard.saveAndContinue(); } : undefined} busy={guard.saving} error={guard.error}/></>;
}
