"use client";

import { DrawerBody, DrawerHeader, DrawerHeaderTitle, OverlayDrawer, Tab, TabList, makeStyles, tokens } from "@fluentui/react-components";
import { Dismiss16Regular } from "@fluentui/react-icons";
import { useState } from "react";
import { DadamCheckbox, DadamInput } from "@/components/ui/DadamControls";
import { canProjectAction, type ProjectHeaderData, type ProjectPermission } from "@/config/project-header";
import { dadamUi } from "@/lib/ui/dadam-theme";
import Button from "./Button";

export interface ProjectSettingsDrawerProps {
  id: string;
  project: ProjectHeaderData;
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}
type SettingsTab = "info" | "perm" | "noti" | "log";
interface ProjectSettingsDraft {
  name: string;
  organization: string;
  budgetEok: string;
  dueDate: string;
  permissionsByMember: Record<string, ProjectPermission[]>;
  notifications: {
    deadline: boolean; complete: boolean; rework: boolean;
    comment: boolean; inApp: boolean; email: boolean;
  };
}
type InformationField = "name" | "organization" | "budgetEok" | "dueDate";
type NotificationField = keyof ProjectSettingsDraft["notifications"];

const tabs: readonly { value: SettingsTab; label: string }[] = [
  { value: "info", label: "기본정보" }, { value: "perm", label: "권한" },
  { value: "noti", label: "알림" }, { value: "log", label: "로그" },
];
const permissionColumns: readonly { value: ProjectPermission; label: string }[] = [
  { value: "done", label: "완성" }, { value: "redo", label: "재작업" }, { value: "setup", label: "제작 설정" },
  { value: "assign", label: "담당 지정" }, { value: "grant", label: "권한 부여" },
];
const notificationFields: readonly { value: NotificationField; label: string }[] = [
  { value: "deadline", label: "제출 마감 리마인더" }, { value: "complete", label: "완성" },
  { value: "rework", label: "재작업 시작" }, { value: "comment", label: "의견 등록" },
];
const deliveryFields: readonly { value: NotificationField; label: string }[] = [
  { value: "inApp", label: "앱 내 알림" }, { value: "email", label: "이메일" },
];
const stageLabels = { review: "진행 검토 중", active: "진행 중", done: "완료", drop: "진행안함" };

function createSettingsDraft(project: ProjectHeaderData): ProjectSettingsDraft {
  return {
    name: project.name, organization: project.organization, budgetEok: String(project.budgetEok), dueDate: project.dueDate,
    permissionsByMember: Object.fromEntries(project.members.map(member => [member.id, member.isPm ? permissionColumns.map(column => column.value) : [...member.permissions]])),
    notifications: { ...project.notifications },
  };
}

const useStyles = makeStyles({
  surface: {
    maxWidth: "100vw", zIndex: 4300, backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1, fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize,
    lineHeight: dadamUi.bodyLineHeight, boxShadow: dadamUi.dialogShadow,
  },
  backdrop: { zIndex: 4000, backgroundColor: "rgba(17,18,22,.28)" },
  heading: { fontSize: dadamUi.titleSize, lineHeight: dadamUi.titleLineHeight, fontWeight: tokens.fontWeightSemibold },
  subtitle: { margin: 0, overflowWrap: "anywhere", color: tokens.colorNeutralForeground3, fontSize: dadamUi.metaSize },
  close: { width: "34px", height: "34px", padding: 0, flexShrink: 0 },
  body: { minWidth: 0, overflowY: "auto", paddingBottom: "24px" },
  tabs: { flexWrap: "wrap", borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  panel: { paddingTop: "20px", minWidth: 0, ":focus-visible": { outline: dadamUi.focusRing, outlineOffset: "-2px" } },
  fields: { display: "flex", flexDirection: "column", gap: "16px" },
  field: { display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 },
  label: { fontWeight: tokens.fontWeightSemibold },
  input: { width: "100%", minWidth: 0, boxSizing: "border-box" },
  state: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" },
  badge: { padding: "4px 8px", borderRadius: tokens.borderRadiusCircular, backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2 },
  tableScroll: { width: "100%", overflowX: "auto" },
  table: { borderCollapse: "collapse", width: "100%", fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight },
  cell: { borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, padding: "10px 8px", textAlign: "left", verticalAlign: "middle" },
  column: { borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, padding: "10px 8px", textAlign: "left", fontWeight: tokens.fontWeightSemibold, whiteSpace: "nowrap", backgroundColor: tokens.colorNeutralBackground2 },
  person: { display: "flex", flexDirection: "column", gap: "4px", whiteSpace: "nowrap", fontWeight: tokens.fontWeightRegular },
  meta: { fontSize: dadamUi.metaSize, color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightRegular },
  logDetail: { minWidth: "160px", overflowWrap: "anywhere" },
  fieldset: { display: "flex", flexDirection: "column", gap: "8px", margin: 0, padding: "12px", minWidth: 0, border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: dadamUi.cardRadius },
});

export default function ProjectSettingsDrawer({ id, project, onClose, returnFocusRef }: ProjectSettingsDrawerProps): React.ReactElement {
  const styles = useStyles();
  const [tab, setTab] = useState<SettingsTab>("info");
  // 원본 fixture와 분리된 draft. 부모가 패널을 unmount할 때 폐기한다.
  const [draft, setDraft] = useState(() => createSettingsDraft(project));
  const canEditPermissions = canProjectAction(project, "grant");
  const close = () => {
    onClose();
    requestAnimationFrame(() => { if (returnFocusRef.current?.isConnected && !document.querySelector("[data-modal-frame]")) returnFocusRef.current.focus({ preventScroll: true }); });
  };
  const changeInformation = (field: InformationField, value: string) => setDraft(current => ({ ...current, [field]: value }));
  const changePermission = (memberId: string, permission: ProjectPermission, checked: boolean) => {
    const member = project.members.find(item => item.id === memberId);
    if (!member || member.isPm || !canEditPermissions) return;
    setDraft(current => {
      const permissions = current.permissionsByMember[memberId] ?? [];
      const next = checked ? Array.from(new Set([...permissions, permission])) : permissions.filter(value => value !== permission);
      return { ...current, permissionsByMember: { ...current.permissionsByMember, [memberId]: next } };
    });
  };
  const changeNotification = (field: NotificationField, checked: boolean) => setDraft(current => ({ ...current, notifications: { ...current.notifications, [field]: checked } }));

  return <OverlayDrawer id={id} open position="end" size="medium" modalType="modal" unmountOnClose
    className={styles.surface} backdrop={{ className: styles.backdrop }} data-modal-frame=""
    aria-labelledby={`${id}-title`} aria-describedby={`${id}-project`}
    onOpenChange={(_event, data) => { if (!data.open) close(); }}
    onKeyDownCapture={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } }}>
    <DrawerHeader>
      <DrawerHeaderTitle heading={{ id: `${id}-title`, className: styles.heading }} action={<Button className={styles.close} aria-label="프로젝트 설정 닫기" onClick={close}><Dismiss16Regular aria-hidden={true} /></Button>}>프로젝트 설정</DrawerHeaderTitle>
      <p id={`${id}-project`} className={styles.subtitle}>{project.name}</p>
    </DrawerHeader>
    <DrawerBody className={styles.body}>
      <TabList aria-label="프로젝트 설정 탭" selectedValue={tab} className={styles.tabs} onTabSelect={(_event, data) => {
        const next = tabs.find(item => item.value === data.value);
        if (next) setTab(next.value);
      }}>{tabs.map(item => <Tab key={item.value} id={`${id}-tab-${item.value}`} value={item.value} aria-controls={`${id}-panel-${item.value}`}>{item.label}</Tab>)}</TabList>
      <div id={`${id}-panel-${tab}`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`} tabIndex={0} className={styles.panel}>
        {tab === "info" && <div className={styles.fields}>
          <div className={styles.field}><label className={styles.label} htmlFor={`${id}-name`}>제안 프로젝트명</label><DadamInput id={`${id}-name`} className={styles.input} value={draft.name} onChange={(_event, data) => changeInformation("name", data.value)} /></div>
          <div className={styles.field}><label className={styles.label} htmlFor={`${id}-organization`}>발주기관</label><DadamInput id={`${id}-organization`} className={styles.input} value={draft.organization} onChange={(_event, data) => changeInformation("organization", data.value)} /></div>
          <div className={styles.field}><label className={styles.label} htmlFor={`${id}-budget`}>사업 예산 (억원)</label><DadamInput id={`${id}-budget`} type="number" min={0} step={0.1} className={styles.input} value={draft.budgetEok} contentAfter="억원" onChange={(_event, data) => changeInformation("budgetEok", data.value)} /></div>
          <div className={styles.field}><label className={styles.label} htmlFor={`${id}-due`}>제출 마감일</label><DadamInput id={`${id}-due`} type="date" className={styles.input} value={draft.dueDate} onChange={(_event, data) => changeInformation("dueDate", data.value)} /></div>
          <div className={styles.field}><span className={styles.label}>진행 상태</span><div className={styles.state}>
            <span className={styles.badge}>{stageLabels[project.stage]}</span>
            {project.stage === "active" && <Button disabled>진행안함으로 전환</Button>}
            {project.stage === "drop" && <Button disabled>진행으로 되돌리기</Button>}
          </div></div>
        </div>}
        {tab === "perm" && <div className={styles.tableScroll}>
          <table className={styles.table} aria-label="참여자별 프로젝트 권한"><thead><tr><th className={styles.column} scope="col">참여자</th>{permissionColumns.map(column => <th key={column.value} className={styles.column} scope="col">{column.label}</th>)}</tr></thead>
            <tbody>{project.members.map(member => <tr key={member.id}>
              <th className={styles.cell} scope="row"><span className={styles.person}><span>{member.name}{member.isPm ? " · PM" : ""}</span><span className={styles.meta}>{member.department}</span></span></th>
              {permissionColumns.map(column => <td key={column.value} className={styles.cell}><DadamCheckbox aria-label={`${member.name} ${column.label}`}
                checked={member.isPm || (draft.permissionsByMember[member.id] ?? []).includes(column.value)} disabled={member.isPm || !canEditPermissions}
                onChange={(_event, data) => changePermission(member.id, column.value, data.checked === true)} /></td>)}
            </tr>)}</tbody>
          </table>
          {project.members.length === 0 && <p className={styles.meta}>참여자가 없습니다.</p>}
        </div>}
        {tab === "noti" && <div className={styles.fields}>
          {[{ label: "알림 항목", fields: notificationFields }, { label: "수신 방식", fields: deliveryFields }].map(group => <fieldset key={group.label} className={styles.fieldset}>
            <legend className={styles.label}>{group.label}</legend>
            {group.fields.map(field => <DadamCheckbox key={field.value} label={field.label} checked={draft.notifications[field.value]} onChange={(_event, data) => changeNotification(field.value, data.checked === true)} />)}
          </fieldset>)}
        </div>}
        {tab === "log" && <div className={styles.tableScroll}>
          <table className={styles.table} aria-label="프로젝트 변경 로그"><thead><tr>{["이름", "부서·직급", "권한", "변경 내역", "일시"].map(label => <th key={label} scope="col" className={styles.column}>{label}</th>)}</tr></thead>
            <tbody>{project.logs.map(log => <tr key={log.id}><td className={styles.cell}>{log.name}</td><td className={styles.cell}>{log.department}</td><td className={styles.cell}>{log.role}</td><td className={styles.cell}><div className={styles.logDetail}>{log.detail}</div></td><td className={styles.cell}>{log.at}</td></tr>)}</tbody>
          </table>
          {project.logs.length === 0 && <p className={styles.meta}>변경 내역이 없습니다.</p>}
        </div>}
      </div>
    </DrawerBody>
  </OverlayDrawer>;
}
