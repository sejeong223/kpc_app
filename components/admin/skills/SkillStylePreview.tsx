"use client";
import type { SkillRules } from "@/lib/skills/schema";
import { weightValue } from "@/lib/pptx/text-layout";
export default function SkillStylePreview({rules}: {rules:SkillRules}){
  return <aside className="tw:min-w-0 tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-(--kpc-bg) tw:p-4" aria-label="정적 서식 예시">
    <h3 className="tw:mt-0 tw:text-[12px]">정적 서식 예시</h3><p className="tw:text-[11px] tw:text-(--kpc-muted)">설정 비교용 축소 예시입니다. 실제 PPT 분석 결과나 PowerPoint 렌더링과 다를 수 있습니다.</p>
    <div className="tw:overflow-hidden tw:rounded tw:bg-white tw:p-3" style={{fontFamily:rules.font.family,lineHeight:rules.font.lh}}>
      <p style={{fontSize:rules.font.title[0]*.6,fontWeight:weightValue[rules.font.title[1]],marginBottom:rules.gap.tb*14}}>사업 제안서</p>
      <p style={{fontSize:rules.font.sub[0]*.7,fontWeight:weightValue[rules.font.sub[1]]}}>목표를 명확하게 전달합니다</p>
      <p style={{fontSize:rules.font.body[0]*.75,fontWeight:weightValue[rules.font.body[1]],marginBottom:rules.gap.para}}>주요 과제와 추진 계획을 정리한 본문 예시입니다.</p>
      <table className="tw:w-full tw:border-collapse tw:text-[10px]"><thead><tr><th>항목</th><th>목표</th></tr></thead><tbody>{["분석","설계"].map((label,index)=><tr key={label}><td style={{padding:`${rules.table.padV*12}px ${rules.table.padH*12}px`,borderBottom:"1px solid var(--kpc-line)"}}>{label}</td><td className="tw:text-right">{index+1}단계</td></tr>)}</tbody></table>
    </div>
  </aside>;
}
