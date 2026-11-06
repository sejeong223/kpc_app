"use client";
import { useState } from "react";
import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { Checkmark12Regular, LockClosed12Regular, Warning12Regular, Comment12Regular } from "@fluentui/react-icons";
import ModalFrame from "@/components/ui/ModalFrame";
import { DadamButton } from "@/components/ui/DadamControls";
import type { ProjectView } from "@/types/workspace-production";
import { getCompletionSummary, outlineNumbers } from "@/lib/workspace/production/selectors";
import { WorkspaceErrorText } from "./WorkspaceUi";
export interface ProjectRoundDialogProps {
  open: boolean;
  mode: "complete" | "start-round";
  view: ProjectView;
  busy: boolean;
  error: string | null;
  onConfirm(input: {
    revision: number;
    fileRevision: number;
    round: number;
    acknowledged: true;
  }): void;
  onClose(): void;
  onReload?(): void;
}

const useStyles = makeStyles({
  header: { padding: '16px 18px 12px', gap: '10px', '& h2': { fontSize: '14px', lineHeight: '20px', fontWeight: 600 } },
  body: { padding: '14px 18px', gap: '12px', fontSize: '14px', lineHeight: '20px', scrollbarWidth: 'auto' },
  footer: { padding: '12px 18px', gap: '8px', justifyContent: 'flex-end', '& button': { height: '32px', minHeight: '32px', padding: '0 12px' } },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '8px', margin: 0,
    '& > div': { padding: '10px 12px', border: '1px solid '+tokens.colorNeutralStroke2, borderRadius: '6px', minWidth: 0 },
    '& dt': { fontSize: '12px', lineHeight: '16px', color: tokens.colorNeutralForeground3 },
    '& dd': { margin: 0, fontSize: '20px', lineHeight: '28px', fontWeight: 600 } },
  progress: { display: 'block', width: '100%', height: '6px', margin: '12px 0', border: 0, borderRadius: '3px', overflow: 'hidden', accentColor: tokens.colorStatusSuccessForeground1 },
  list: { listStyleType: 'none', padding: 0, margin: 0, border: '1px solid '+tokens.colorNeutralStroke2, borderRadius: '8px', maxHeight: '260px', overflowY: 'auto',
    '& li': { display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderBottom: '1px solid '+tokens.colorNeutralStroke2 } },
  title: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  meta: { fontSize: '12px', lineHeight: '16px', color: tokens.colorNeutralForeground3 },
  done: { color: tokens.colorStatusSuccessForeground1 }, doing: { color: tokens.colorStatusWarningForeground1 },
  groups: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '14px', '@media(max-width:480px)': { gridTemplateColumns: '1fr' },
    '& h3': { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', margin: '16px 0 8px', fontSize: '12px', lineHeight: '16px', fontWeight: 600 },
    '& ul': { listStyleType: 'none', padding: 0, margin: 0 }, '& li': { padding: '3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
  count: { borderRadius: '999px', padding: '0 5px', minWidth: '17px', textAlign: 'center', backgroundColor: tokens.colorBrandBackground, color: '#fff', fontSize: '12px', lineHeight: '17px' },
  fixed: { backgroundColor: tokens.colorNeutralBackground3, color: tokens.colorNeutralForeground3 },
  warning: { display: 'flex', gap: '6px', alignItems: 'center', padding: '8px 10px', margin: '0 0 10px', borderRadius: '4px', backgroundColor: '#fff4ce', color: tokens.colorStatusWarningForeground1 },
  notice: { display: 'flex', gap: '6px', alignItems: 'center', padding: '10px 12px', margin: '0 0 12px', borderRadius: '4px', backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2 },
});
export function RoundSummary({ view, mode }: { view: ProjectView; mode: ProjectRoundDialogProps['mode'] }) {
  const styles=useStyles(), sections=view.state.body.sections, counts=getCompletionSummary(view.state), numbers=outlineNumbers(view.state);
  const done=sections.filter(s=>s.state==='done').length, reviewCount=view.state.reviews.filter(t=>t.round===view.state.currentRound && t.status==='open').length;
  if(mode==='complete') return <div>
    <dl className={styles.stats}>{[['작성 완료',done],['작성 중',counts.writingSections],['미처리 의견',counts.openComments]].map(([label,count])=><div key={label}><dt>{label}</dt><dd className={label==='작성 중' && count ? styles.doing : undefined}>{count}</dd></div>)}</dl>
    <progress className={styles.progress} value={done} max={sections.length||1} aria-label="섹션 작성 진행률" aria-valuetext={'작성 완료 '+done+' / 전체 '+sections.length} />
    <ul className={styles.list}>{sections.map(s=><li key={s.id}><span className={styles.meta}>{numbers[s.id]}</span><span className={styles.title} title={s.title}>{s.title}</span><span className={s.state==='done'?styles.done:styles.doing} style={{fontSize:12,whiteSpace:'nowrap'}}>{s.state==='done'?'작성 완료':'작성 중'}</span></li>)}</ul>
    {!sections.length && <p className={styles.meta}>표시할 섹션이 없습니다.</p>}
  </div>;
  return <div>
    {reviewCount>0 && <p className={styles.notice}><Comment12Regular /><span><strong>리뷰 코멘트 {reviewCount}건</strong>이 제작으로 전달됩니다</span></p>}
    {view.state.phase==='writing' && <p className={styles.warning}><Warning12Regular /><span>{view.state.currentRound}차를 완성하지 않고 재작업합니다. {view.state.currentRound}차 완성본은 남지 않습니다.</span></p>}
    <div className={styles.groups}>{[true,false].map(fixed=>{const list=sections.filter(s=>(s.state==='done')===fixed);return <section key={String(fixed)} style={{minWidth:0}}>
      <h3>{fixed && <LockClosed12Regular />}{fixed?'고정 (작성 완료)':'다시 작업 (작성 중)'}<span className={mergeClasses(styles.count,fixed&&styles.fixed)}>{list.length}</span></h3>
      <ul>{list.map(s=><li key={s.id} title={numbers[s.id]+' '+s.title}><span className={styles.meta}>{numbers[s.id]}</span> {s.title}</li>)}</ul>{!list.length && <div className={styles.meta}>없음</div>}
    </section>;})}</div>
  </div>;
}
export default function ProjectRoundDialog({open,mode,view,busy,error,onConfirm,onClose,onReload}:ProjectRoundDialogProps){
  const styles=useStyles();
  const [baseline]=useState(()=>({revision:view.state.revision,fileRevision:view.fileRevision,round:view.state.currentRound,view}));
  const title=mode==='complete'?baseline.round+'차 완성':(baseline.round+1)+'차 재작업 시작';
  return <ModalFrame open={open} width={520} title={title} contentKey={mode+':'+baseline.round} slotClassNames={{header:styles.header,body:styles.body,footer:styles.footer}}
    onClose={()=>{if(!busy)onClose();}} footer={<>
      <DadamButton disabled={busy} onClick={onClose}>취소</DadamButton>
      <DadamButton appearance="primary" disabled={busy} onClick={()=>onConfirm({revision:baseline.revision,fileRevision:baseline.fileRevision,round:baseline.round,acknowledged:true})}>
        {mode==='complete' && <Checkmark12Regular />}{busy?'저장 중…':title}
      </DadamButton></>}>
    <RoundSummary view={baseline.view} mode={mode}/><WorkspaceErrorText error={error}/>
    {error&&onReload&&<DadamButton disabled={busy} onClick={onReload}>최신 상태 다시 불러오기</DadamButton>}
  </ModalFrame>;
}
