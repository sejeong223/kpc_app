"use client";
import { OverlayDrawer, makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { Dismiss16Regular, Settings20Regular } from "@fluentui/react-icons";
import { useRef, useState } from "react";
import { HEADER_NOTIFICATION_FIELDS, HEADER_PERMISSION_COLUMNS, canEditHeaderPermissionDraft, createHeaderSettingsDraft, headerSettingsDemoLogs } from "@/lib/workspace/production/header-settings-demo";
import type { HeaderPermissionKey, HeaderSettingsTab, WorkspaceHeaderModel } from "@/types/workspace-header";
import type { ProjectView } from "@/types/workspace-production";
export interface ProjectSettingsDrawerProps {
  id: string; project: WorkspaceHeaderModel; view: ProjectView; onClose(): void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}
const tabs: readonly [HeaderSettingsTab, string][] = [["info", "기본정보"], ["perm", "권한"], ["noti", "알림"], ["log", "로그"]];
const useStyles = makeStyles({
  drawer: { width: "560px", maxWidth: "96vw", zIndex: 4300, backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground1, fontFamily: tokens.fontFamilyBase, fontSize: "14px", lineHeight: "20px",
    "& button:focus-visible, & input:focus-visible, & [role='tabpanel']:focus-visible": { outline: "2px solid "+tokens.colorBrandStroke1, outlineOffset: "-2px" } },
  backdrop: { zIndex: 4299 },
  header: { display: "flex", alignItems: "center", flexShrink: 0, padding: "14px 16px", gap: "8px", borderBottom: "1px solid "+tokens.colorNeutralStroke2, minWidth: 0,
    "& h2": { margin: 0, flexShrink: 0, whiteSpace: "nowrap", fontSize: "14px", lineHeight: "20px", fontWeight: 600 } },
  subtitle: { flex: 1, minWidth: 0, wordBreak: "keep-all", overflowWrap: "anywhere", color: tokens.colorNeutralForeground3, fontSize: "12px", lineHeight: "16px" },
  close: { display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: "32px", height: "32px", padding: 0, marginLeft: "auto", border: "1px solid "+tokens.colorNeutralStroke1, borderRadius: "4px", backgroundColor: tokens.colorNeutralBackground1, cursor: "pointer" },
  tabs: { display: "flex", flexShrink: 0, flexWrap: "wrap", padding: "0 10px", gap: "2px", borderBottom: "1px solid "+tokens.colorNeutralStroke2 },
  tab: { position: "relative", height: "38px", padding: "0 10px", border: 0, backgroundColor: "transparent", color: tokens.colorNeutralForeground2, fontFamily: "inherit", fontWeight: 600, fontSize: "12px", lineHeight: "16px", cursor: "pointer",
    "&[aria-selected='true']": { color: tokens.colorBrandForeground1 },
    "&[aria-selected='true']::after": { content: '""', position: "absolute", bottom: 0, left: "10px", right: "10px", height: "3px", borderRadius: "3px", backgroundColor: tokens.colorBrandBackground } },
  body: { padding: "16px", flex: 1, minWidth: 0, minHeight: 0, overflow: "auto" },
  fields: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "12px 14px" },
  field: { display: "flex", flexDirection: "column", gap: "5px", minWidth: 0, "& > span": { fontWeight: 600 } },
  input: { width: "100%", minWidth: 0, boxSizing: "border-box", height: "32px", padding: "0 10px", margin: 0, border: "1px solid "+tokens.colorNeutralStroke1, borderRadius: "4px", font: "inherit", color: "inherit", backgroundColor: tokens.colorNeutralBackground1 },
  full: { gridColumn: "1/-1" },
  state: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" },
  badge: { display: "inline-flex", alignItems: "center", flexShrink: 0, padding: "2px 7px", borderRadius: "4px", backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2, fontSize: "12px", lineHeight: "16px", fontWeight: 600, whiteSpace: "nowrap" },
  stage: { padding: "4px 10px" },
  stageButton: { height: "26px", padding: "0 9px", marginLeft: "auto", font: "inherit", fontSize: "12px", border: "1px solid "+tokens.colorNeutralStroke1, borderRadius: "4px", color: tokens.colorNeutralForegroundDisabled, backgroundColor: tokens.colorNeutralBackgroundDisabled },
  scroll: { width: "100%", maxWidth: "100%", overflowX: "auto" },
  table: { borderCollapse: "collapse", width: "100%", fontSize: "14px", lineHeight: "20px",
    "& td, & tbody th": { borderBottom: "1px solid "+tokens.colorNeutralStroke2, padding: "11px 12px", textAlign: "left", verticalAlign: "middle", fontWeight: 400 },
    "& thead th": { position: "sticky", top: 0, zIndex: 1, borderBottom: "1px solid "+tokens.colorNeutralStroke2, padding: "9px 12px", textAlign: "left", fontSize: "12px", lineHeight: "16px", fontWeight: 600, whiteSpace: "nowrap", backgroundColor: tokens.colorNeutralBackground2 } },
  permissions: { minWidth: 0, tableLayout: "fixed", "& thead th": { paddingLeft: "4px", paddingRight: "4px", whiteSpace: "normal", textAlign: "center" }, "& td": { textAlign: "center", paddingLeft: "4px", paddingRight: "4px" }, "& thead th:first-child": { width: "34%", textAlign: "left" } },
  person: { display: "flex", alignItems: "center", minWidth: 0, gap: "8px", whiteSpace: "nowrap", "& strong": { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 } },
  avatar: { display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: "22px", height: "22px", borderRadius: "999px", border: "2px solid #fff", backgroundColor: tokens.colorBrandBackground, color: "#fff", fontSize: "12px", fontWeight: 600 },
  checkbox: { width: "16px", height: "16px", minHeight: "16px", margin: 0, padding: 0, verticalAlign: "middle", accentColor: tokens.colorBrandBackground, flexShrink: 0 },
  notification: { display: "flex", width: "100%", alignItems: "flex-start", padding: "9px 2px", gap: "9px", borderBottom: "1px solid "+tokens.colorNeutralStroke2, boxSizing: "border-box", "& input": { marginTop: "2px" }, "& > span": { display: "flex", flexDirection: "column", minWidth: 0 }, "& strong": { fontWeight: 600 } },
  meta: { color: tokens.colorNeutralForeground3, fontSize: "12px", lineHeight: "16px" },
  deliveryTitle: { margin: "16px 0 8px", fontSize: "12px", lineHeight: "16px", fontWeight: 600 },
  delivery: { display: "inline-flex", padding: "3px", gap: "2px", borderRadius: "8px", backgroundColor: tokens.colorNeutralBackground3 },
  deliveryButton: { height: "26px", padding: "0 10px", border: 0, borderRadius: "4px", font: "inherit", fontSize: "12px", lineHeight: "16px", backgroundColor: "transparent", color: tokens.colorNeutralForeground3, cursor: "pointer",
    "&[aria-pressed='true']": { backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground1, boxShadow: "0 1px 2px #0002" }, "&:disabled": { cursor: "default", opacity: .6 } },
  logs: { minWidth: "880px", "& td": { whiteSpace: "nowrap" }, "& td:nth-child(3)": { minWidth: "160px", whiteSpace: "normal", overflowWrap: "anywhere" } },
});
export default function ProjectSettingsDrawer(props: ProjectSettingsDrawerProps) {
  return <SettingsContent key={JSON.stringify([props.project.projectId,props.project.snapshotId])} {...props}/>;
}
function SettingsContent({ id, project, view, onClose, returnFocusRef }: ProjectSettingsDrawerProps) {
  const styles=useStyles(), [tab,setTab]=useState<HeaderSettingsTab>("info"), [draft,setDraft]=useState(()=>createHeaderSettingsDraft(project,view));
  const tabRefs=useRef<Partial<Record<HeaderSettingsTab,HTMLButtonElement|null>>>({});
  const readOnly=!!project.snapshotId, canEditPermission=canEditHeaderPermissionDraft(project,view);
  const members=[...new Map(view.members.map(m=>[m.id,m])).values()].sort((a,b)=>Number(b.id===project.pmId)-Number(a.id===project.pmId));
  const close=()=>{onClose();requestAnimationFrame(()=>{
    if (!document.querySelector("[data-modal-frame], [role='dialog']")) (returnFocusRef.current ?? document.querySelector<HTMLButtonElement>("[data-project-picker]"))?.focus();
  });};
  const changePermission=(memberId:string,key:HeaderPermissionKey,checked:boolean)=>{
    if(!canEditPermission || memberId===project.pmId || !members.some(m=>m.id===memberId&&m.role!=="super_admin") || !HEADER_PERMISSION_COLUMNS.some(c=>c.key===key))return;
    setDraft(previous=>({...previous,permissionsByMember:{...previous.permissionsByMember,[memberId]:checked?[...new Set([...previous.permissionsByMember[memberId],key])]:previous.permissionsByMember[memberId].filter(k=>k!==key)}}));
  };
  return <OverlayDrawer id={id} open position="end" size="large" className={styles.drawer} modalType="modal" backdrop={{className:styles.backdrop}} data-modal-frame="" aria-labelledby={id+"-title"} aria-describedby={id+"-subtitle"}
    onOpenChange={(_,data)=>{if(!data.open)close();}} onKeyDownCapture={event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();close();}}}>
    <header className={styles.header}><Settings20Regular style={{width:18,height:18,flexShrink:0}}/><h2 id={id+"-title"}>프로젝트 설정</h2><span id={id+"-subtitle"} className={styles.subtitle}>{project.name}</span><button type="button" className={styles.close} aria-label="닫기" onClick={close}><Dismiss16Regular style={{width:14,height:14}}/></button></header>
    <div role="tablist" aria-label="프로젝트 설정" className={styles.tabs}>{tabs.map(([value,label],index)=><button type="button" role="tab" key={value} id={id+"-tab-"+value} aria-controls={id+"-panel-"+value} aria-selected={tab===value} tabIndex={tab===value?0:-1} className={styles.tab}
      ref={node=>{tabRefs.current[value]=node;}} onClick={()=>setTab(value)} onKeyDown={event=>{
        const next=event.key==="ArrowRight"?(index+1)%tabs.length:event.key==="ArrowLeft"?(index+tabs.length-1)%tabs.length:event.key==="Home"?0:event.key==="End"?tabs.length-1:null;
        if(next===null)return;event.preventDefault();setTab(tabs[next][0]);tabRefs.current[tabs[next][0]]?.focus();
      }}>{label}</button>)}</div>
    <div className={styles.body}><div role="tabpanel" tabIndex={0} id={id+"-panel-"+tab} aria-labelledby={id+"-tab-"+tab}>
      {tab==="info"&&<div className={styles.fields}>
        {([["name","제안 프로젝트명"],["organization","발주 기관"],["budgetEok","사업 예산"],["dueDate","제출 마감일"]] as const).map(([key,label])=><label key={key} className={styles.field}><span>{label}</span><input type="text" className={styles.input} value={draft[key]} readOnly={readOnly} onChange={event=>{if(!readOnly)setDraft(d=>({...d,[key]:event.target.value}));}}/></label>)}
        <div className={mergeClasses(styles.field,styles.full)}><span>진행 상태</span><div className={styles.state}><span className={mergeClasses(styles.badge,styles.stage)}>{project.phase==="completed"?"완료":"진행 중"}</span>{project.phase==="writing"&&<button type="button" className={styles.stageButton} disabled>진행안함으로 전환</button>}</div></div>
      </div>}
      {tab==="perm"&&<div className={styles.scroll}><table className={mergeClasses(styles.table,styles.permissions)}><thead><tr><th scope="col">이름</th>{HEADER_PERMISSION_COLUMNS.map(c=><th key={c.key} scope="col" title={c.description}>{c.label}</th>)}</tr></thead><tbody>
        {members.map(member=><tr key={member.id}><th scope="row"><span className={styles.person}><span className={styles.avatar} aria-hidden="true">{member.name.slice(0,1)}</span><strong title={member.name}>{member.name}</strong>{member.id===project.pmId&&<span className={styles.badge}>PM</span>}</span></th>
          {HEADER_PERMISSION_COLUMNS.map(c=><td key={c.key}><input type="checkbox" className={styles.checkbox} checked={draft.permissionsByMember[member.id]?.includes(c.key)??false} disabled={!canEditPermission||member.id===project.pmId||member.role==="super_admin"} aria-label={member.name+" "+c.label} title={c.description} onChange={event=>changePermission(member.id,c.key,event.target.checked)}/></td>)}</tr>)}
        {!members.length&&<tr><td colSpan={6}>참여자가 없습니다.</td></tr>}
      </tbody></table></div>}
      {tab==="noti"&&<>
        {HEADER_NOTIFICATION_FIELDS.map(field=><label key={field.key} className={styles.notification}><input type="checkbox" className={styles.checkbox} checked={draft.notifications[field.key]} disabled={readOnly} onChange={event=>{if(!readOnly)setDraft(d=>({...d,notifications:{...d.notifications,[field.key]:event.target.checked}}));}}/><span><strong>{field.label}</strong><span className={styles.meta}>{field.description}</span></span></label>)}
        <h3 className={styles.deliveryTitle}>수신 방식</h3><div role="group" aria-label="수신 방식" className={styles.delivery}>{([["inApp","앱 내 알림"],["email","이메일"]] as const).map(([key,label])=><button type="button" key={key} disabled={readOnly} aria-pressed={draft.notifications[key]} className={styles.deliveryButton} onClick={()=>{if(!readOnly)setDraft(d=>({...d,notifications:{...d.notifications,[key]:!d.notifications[key]}}));}}>{label}</button>)}</div>
      </>}
      {tab==="log"&&<><p className={styles.meta} id={id+"-log-description"}>시연 로그</p><div className={styles.scroll}><table aria-describedby={id+"-log-description"} className={mergeClasses(styles.table,styles.logs)}><thead><tr>{["이름","권한","변경 내역","일시"].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>
        {headerSettingsDemoLogs(project.projectId).map(row=><tr key={row.id}><td><strong>{row.name}</strong> <span className={styles.meta}>{row.department}</span></td><td>{row.role}</td><td>{row.detail}</td><td>{row.at}</td></tr>)}
        {!headerSettingsDemoLogs(project.projectId).length&&<tr><td colSpan={4}>변경 내역이 없습니다.</td></tr>}
      </tbody></table></div></>}
    </div></div>
  </OverlayDrawer>;
}
