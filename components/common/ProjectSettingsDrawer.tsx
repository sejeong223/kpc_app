"use client";

import { DrawerBody, DrawerHeader, OverlayDrawer, Tab, TabList, checkboxClassNames, inputClassNames, makeStyles, mergeClasses, tabClassNames, tokens } from "@fluentui/react-components";
import { Dismiss16Regular, Settings16Regular } from "@fluentui/react-icons";
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
type NotificationEvent = "deadline" | "complete" | "rework" | "comment";
type DeliveryField = "inApp" | "email";

const tabs: readonly { value: SettingsTab; label: string }[] = [
  { value: "info", label: "기본정보" }, { value: "perm", label: "권한" },
  { value: "noti", label: "알림" }, { value: "log", label: "로그" },
];
const permissionColumns: readonly { value: ProjectPermission; label: string; description: string }[] = [
  { value: "done", label: "완성", description: "작성이 끝났다고 보고 완성 처리" },
  { value: "redo", label: "재작업", description: "파일 업로드부터 다시 진행 (작성 완료 섹션은 고정)" },
  { value: "setup", label: "제작 설정", description: "제작 설정의 프롬프트 세트 · Skill · Template 선택과 프로젝트 프롬프트 수정" },
  { value: "assign", label: "담당 지정", description: "목차 담당자 · 리뷰자 지정" },
  { value: "grant", label: "권한 부여", description: "이 화면에서 다른 사람에게 권한 부여" },
];
const notificationFields: readonly { value: NotificationEvent; label: string; description: string }[] = [
  { value: "deadline", label: "제출 마감 리마인더", description: "7일 전 · 3일 전 · 1일 전 · 당일" },
  { value: "complete", label: "완성 알림", description: "PM 및 프로젝트 참여자에게" },
  { value: "rework", label: "재작업 시작 알림", description: "작성 중 섹션 담당자에게" },
  { value: "comment", label: "의견 등록 알림", description: "담당 작성자에게" },
];
const deliveryFields: readonly { value: DeliveryField; label: string }[] = [
  { value: "inApp", label: "앱 내 알림" }, { value: "email", label: "이메일" },
];
const stageLabels = { review: "진행 검토 중", active: "진행 중", done: "완료", drop: "진행안함" };

function createSettingsDraft(project: ProjectHeaderData): ProjectSettingsDraft {
  return {
    name: project.name, organization: project.organization, budgetEok: `${project.budgetEok}억원`, dueDate: project.dueDate,
    permissionsByMember: Object.fromEntries(project.members.map(member => [member.id, member.isPm ? permissionColumns.map(column => column.value) : [...member.permissions]])),
    notifications: { ...project.notifications },
  };
}

const useStyles = makeStyles({
  surface: {
    width: "560px", maxWidth: "96vw", zIndex: 4300, backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1, fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize,
    lineHeight: dadamUi.bodyLineHeight, fontWeight: tokens.fontWeightRegular, boxShadow: dadamUi.dialogShadow,
  },
  backdrop: { zIndex: 4000, backgroundColor: "rgba(17,18,22,.28)" },
  header: { flexDirection: "row", alignItems: "center", padding: "14px 16px", gap: "8px", borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, flexShrink: 0, minWidth: 0 },
  heading: { margin: 0, flexShrink: 0, whiteSpace: "nowrap", fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, fontWeight: 600 },
  subtitle: { flex: 1, minWidth: 0, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "anywhere", color: tokens.colorNeutralForeground3, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight },
  settingsIcon: { width: "18px", height: "18px", flexShrink: 0 },
  headerIcon: { width: "14px", height: "14px", flexShrink: 0 },
  close: { width: "32px", height: "32px", padding: 0, flexShrink: 0, marginLeft: "auto" },
  body: { minWidth: 0, minHeight: 0, flex: 1, overflow: "auto", padding: "16px", ":first-child": { paddingTop: "16px" }, ":last-child": { paddingBottom: "16px" } },
  tabs: { flexShrink: 0, flexWrap: "wrap", padding: "0 10px", gap: "2px", borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  tab: {
    height: "38px", padding: "0 10px", columnGap: "6px", fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight,
    [`& .${tabClassNames.content}, & .fui-Tab__content--reserved-space`]: { fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, fontWeight: tokens.fontWeightSemibold },
  },
  panel: { padding: 0, minWidth: 0, ":focus-visible": { outline: dadamUi.focusRing, outlineOffset: "-2px" } },
  fields: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px 14px" },
  field: { display: "flex", flexDirection: "column", gap: "5px", minWidth: 0 },
  fullField: { gridColumn: "1 / -1" },
  label: { fontWeight: tokens.fontWeightSemibold },
  input: {
    width: "100%", minWidth: 0, height: "32px", minHeight: "32px", boxSizing: "border-box", padding: "0 10px",
    // 설정 입력의 여백은 root 한 곳에만 둔다. 공용 래퍼/Fluent 내부 여백을 중첩하지 않는다.
    [`& .${inputClassNames.input}`]: { paddingLeft: 0, paddingRight: 0, margin: 0, minWidth: 0 },
  },
  state: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" },
  badge: { display: "inline-flex", alignItems: "center", flexShrink: 0, height: "20px", padding: "0 7px", borderRadius: dadamUi.controlRadius, backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, fontWeight: tokens.fontWeightSemibold, whiteSpace: "nowrap" },
  stateBadge: { height: "auto", padding: "4px 10px" },
  stateButton: { height: "26px", minHeight: "26px", padding: "0 9px", columnGap: "6px", marginLeft: "auto", fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight },
  smallIcon: { width: "12px", height: "12px", flexShrink: 0 },
  tableScroll: { width: "100%", maxWidth: "100%", overflowX: "auto" },
  table: { borderCollapse: "collapse", width: "100%", fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight },
  cell: { borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, padding: "11px 12px", textAlign: "left", verticalAlign: "middle", fontWeight: tokens.fontWeightRegular },
  column: { position: "sticky", top: 0, zIndex: 1, borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, padding: "9px 12px", textAlign: "left", fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, fontWeight: tokens.fontWeightSemibold, whiteSpace: "nowrap", backgroundColor: tokens.colorNeutralBackground2 },
  permissionTable: { minWidth: 0, tableLayout: "fixed" },
  permissionColumn: { paddingLeft: "4px", paddingRight: "4px", whiteSpace: "normal", textAlign: "center" },
  nameColumn: { width: "34%", textAlign: "left" },
  permissionCell: { textAlign: "center" },
  person: { display: "flex", alignItems: "center", minWidth: 0, gap: "8px", whiteSpace: "nowrap" },
  avatar: { display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: "22px", height: "22px", borderRadius: tokens.borderRadiusCircular, border: `2px solid ${tokens.colorNeutralBackground1}`, backgroundColor: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand, fontSize: dadamUi.metaSize, fontWeight: tokens.fontWeightSemibold },
  personName: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", fontWeight: tokens.fontWeightSemibold },
  permissionCheckbox: {
    width: "16px", minHeight: "16px", padding: 0, justifyContent: "center", verticalAlign: "middle",
    [`& .${checkboxClassNames.indicator}`]: { width: "16px", height: "16px", margin: 0 },
    [`& .${checkboxClassNames.input}`]: { width: "16px", height: "16px", top: 0, left: 0 },
  },
  meta: { fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightRegular },
  notification: {
    display: "flex", width: "100%", maxWidth: "none", minHeight: 0, alignItems: "flex-start", padding: "9px 2px", gap: "9px", borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: 0,
    [`& .${checkboxClassNames.indicator}`]: { width: "16px", height: "16px", margin: "2px 0 0", alignSelf: "flex-start" },
    [`& .${checkboxClassNames.input}`]: { width: "16px", height: "16px", top: "11px", left: "2px" },
    [`& .${checkboxClassNames.label}`]: { minWidth: 0, margin: 0, padding: 0, alignSelf: "flex-start" },
  },
  notificationText: { display: "flex", flexDirection: "column" },
  deliveryTitle: { margin: "16px 0 8px", fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, fontWeight: tokens.fontWeightSemibold },
  delivery: { display: "inline-flex", padding: "3px", gap: "2px", borderRadius: dadamUi.surfaceRadius, backgroundColor: tokens.colorNeutralBackground3 },
  deliveryButton: {
    height: "26px", minHeight: "26px", padding: "0 10px", border: "0 solid transparent", fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight,
    "--_button-bg": "transparent", "--_button-fg": tokens.colorNeutralForeground3,
    "--_button-selected-bg": tokens.colorNeutralBackground1, "--_button-selected-fg": tokens.colorNeutralForeground1,
    "&.active:enabled": { boxShadow: tokens.shadow2 },
    "@media (forced-colors: active)": { "&.active:enabled": { boxShadow: "none" } },
  },
  logTable: { minWidth: "880px" },
  nowrap: { whiteSpace: "nowrap" },
  logDetail: { minWidth: "160px", overflowWrap: "anywhere" },
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
    <DrawerHeader className={styles.header}>
      <Settings16Regular className={styles.settingsIcon} aria-hidden={true} />
      <h2 id={`${id}-title`} className={styles.heading}>프로젝트 설정</h2>
      <span id={`${id}-project`} className={styles.subtitle} title={project.name}>{project.name}</span>
      <Button className={mergeClasses(styles.close, "ghost")} aria-label="프로젝트 설정 닫기" onClick={close}><Dismiss16Regular className={styles.headerIcon} aria-hidden={true} /></Button>
    </DrawerHeader>
    <TabList aria-label="프로젝트 설정 탭" selectedValue={tab} className={styles.tabs} onTabSelect={(_event, data) => {
      const next = tabs.find(item => item.value === data.value);
      if (next) setTab(next.value);
    }}>{tabs.map(item => <Tab key={item.value} id={`${id}-tab-${item.value}`} className={styles.tab} value={item.value} aria-controls={`${id}-panel-${item.value}`}>{item.label}</Tab>)}</TabList>
    <DrawerBody className={styles.body}>
      <div id={`${id}-panel-${tab}`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`} tabIndex={0} className={styles.panel}>
        {tab === "info" && <div className={styles.fields}>
          <div className={styles.field}><label className={styles.label} htmlFor={`${id}-name`}>제안 프로젝트명</label><DadamInput id={`${id}-name`} className={styles.input} value={draft.name} onChange={(_event, data) => changeInformation("name", data.value)} /></div>
          <div className={styles.field}><label className={styles.label} htmlFor={`${id}-organization`}>발주 기관</label><DadamInput id={`${id}-organization`} className={styles.input} value={draft.organization} onChange={(_event, data) => changeInformation("organization", data.value)} /></div>
          <div className={styles.field}><label className={styles.label} htmlFor={`${id}-budget`}>사업 예산</label><DadamInput id={`${id}-budget`} className={styles.input} value={draft.budgetEok} onChange={(_event, data) => changeInformation("budgetEok", data.value)} /></div>
          <div className={styles.field}><label className={styles.label} htmlFor={`${id}-due`}>제출 마감일</label><DadamInput id={`${id}-due`} className={styles.input} value={draft.dueDate} onChange={(_event, data) => changeInformation("dueDate", data.value)} /></div>
          <div className={mergeClasses(styles.field, styles.fullField)}><span className={styles.label}>진행 상태</span><div className={styles.state}>
            <span className={mergeClasses(styles.badge, styles.stateBadge)}>{stageLabels[project.stage]}</span>
            {project.stage === "active" && <Button className={styles.stateButton} disabled><Dismiss16Regular className={styles.smallIcon} aria-hidden={true} />진행안함으로 전환</Button>}
            {project.stage === "drop" && <Button className={mergeClasses(styles.stateButton, "primary")} disabled>진행 중으로 되돌리기</Button>}
          </div></div>
        </div>}
        {tab === "perm" && <div className={styles.tableScroll}>
          <table className={mergeClasses(styles.table, styles.permissionTable)} aria-label="참여자별 프로젝트 권한"><thead><tr><th className={mergeClasses(styles.column, styles.permissionColumn, styles.nameColumn)} scope="col">이름</th>{permissionColumns.map(column => <th key={column.value} className={mergeClasses(styles.column, styles.permissionColumn)} scope="col" title={column.description} aria-label={`${column.label}: ${column.description}`}>{column.label}</th>)}</tr></thead>
            <tbody>{project.members.map(member => <tr key={member.id}>
              <th className={styles.cell} scope="row"><span className={styles.person}><span className={styles.avatar} title={member.name} aria-hidden={true}>{member.name[0] || "?"}</span><strong className={styles.personName} title={member.name}>{member.name}</strong>{member.isPm && <span className={styles.badge}>PM</span>}</span></th>
              {permissionColumns.map(column => <td key={column.value} className={mergeClasses(styles.cell, styles.permissionCell)}><DadamCheckbox className={styles.permissionCheckbox} aria-label={`${member.name} ${column.label}`}
                checked={member.isPm || (draft.permissionsByMember[member.id] ?? []).includes(column.value)} disabled={member.isPm || !canEditPermissions}
                onChange={(_event, data) => changePermission(member.id, column.value, data.checked === true)} /></td>)}
            </tr>)}</tbody>
          </table>
          {project.members.length === 0 && <p className={styles.meta}>참여자가 없습니다.</p>}
        </div>}
        {tab === "noti" && <div>
          {notificationFields.map(field => <DadamCheckbox key={field.value} className={styles.notification}
            aria-describedby={`${id}-notification-${field.value}-description`}
            label={<span className={styles.notificationText}><span className={styles.label}>{field.label}</span><span id={`${id}-notification-${field.value}-description`} className={styles.meta}>{field.description}</span></span>}
            checked={draft.notifications[field.value]} onChange={(_event, data) => changeNotification(field.value, data.checked === true)} />)}
          <h3 id={`${id}-delivery-title`} className={styles.deliveryTitle}>수신 방식</h3>
          <div className={styles.delivery} role="group" aria-labelledby={`${id}-delivery-title`}>
            {deliveryFields.map(field => <Button key={field.value} className={mergeClasses(styles.deliveryButton, draft.notifications[field.value] && "active")}
              aria-pressed={draft.notifications[field.value]} onClick={() => setDraft(current => ({ ...current, notifications: { ...current.notifications, [field.value]: !current.notifications[field.value] } }))}>{field.label}</Button>)}
          </div>
        </div>}
        {tab === "log" && <div className={styles.tableScroll}>
          <table className={mergeClasses(styles.table, styles.logTable)} aria-label="프로젝트 변경 로그"><thead><tr>{["이름", "권한", "변경 내역", "일시"].map(label => <th key={label} scope="col" className={styles.column}>{label}</th>)}</tr></thead>
            <tbody>{project.logs.map(log => <tr key={log.id}><td className={styles.cell}><strong className={styles.label}>{log.name}</strong> <span className={styles.meta}>{log.department}</span></td><td className={mergeClasses(styles.cell, styles.meta)}>{log.role}</td><td className={styles.cell}><div className={styles.logDetail}>{log.detail}</div></td><td className={mergeClasses(styles.cell, styles.meta, styles.nowrap)}>{log.at}</td></tr>)}</tbody>
          </table>
          {project.logs.length === 0 && <p className={styles.meta}>변경 내역이 없습니다.</p>}
        </div>}
      </div>
    </DrawerBody>
  </OverlayDrawer>;
}
