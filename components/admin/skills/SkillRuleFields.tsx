"use client";
import { Checkbox,Field,Select } from "@fluentui/react-components";
import { OPT,PAGE_TYPES,PAGE_LABEL,RULES } from "@/config/skill-options";
import type { SkillRules } from "@/lib/skills/schema";
interface SkillRuleFieldsProps {value:SkillRules;disabled:boolean;fieldErrors:Record<string,string>;onChange(value:SkillRules):void}
export function RuleChoice<T extends string|number|null>({label,value,options,onChange,disabled,error,hint}:{label:string;value:T;options:readonly T[];onChange(value:T):void;disabled:boolean;error?:string;hint?:string}){
  return <Field label={label} hint={hint} validationState={error?"error":"none"} validationMessage={error}><Select disabled={disabled} value={value===null?"":String(value)} onChange={(_,data)=>{const next=options.find(option=>(option===null?"":String(option))===data.value);if(next!==undefined)onChange(next);}}>{options.map(option=><option key={String(option)} value={option===null?"":String(option)}>{option===null?"공통 규칙":option}</option>)}</Select></Field>;
}
function Section({title,children,open=false}:{title:string;children:React.ReactNode;open?:boolean}){return <details open={open} className="tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:p-3"><summary className="tw:cursor-pointer tw:font-semibold">{title}</summary><div className="tw:mt-3 tw:grid tw:gap-3 tw:sm:grid-cols-2">{children}</div></details>;}
export default function SkillRuleFields({value:v,disabled,fieldErrors,onChange}:SkillRuleFieldsProps){
  const common={disabled};
  const choice=<T extends string|number|null>(path:string,label:string,value:T,options:readonly T[],change:(next:T)=>void,hint?:string)=><RuleChoice key={path} {...common} label={label} value={value} options={options} onChange={change} error={fieldErrors[path]} hint={hint}/>;
  return <div className="tw:flex tw:flex-col tw:gap-3">
    <Section title="2. 글꼴·크기·줄 간격" open>
      {choice("font.family","글꼴",v.font.family,OPT.family,family=>onChange({...v,font:{...v.font,family}}))}
      {choice("font.lh","공통 줄 간격 (배)",v.font.lh,OPT.lh,lh=>onChange({...v,font:{...v.font,lh}}))}
      {(["title","sub","body"] as const).map(role=><div key={role} className="tw:grid tw:grid-cols-2 tw:gap-2">{choice(`font.${role}.0`,{title:"제목",sub:"리딩 메시지",body:"본문"}[role]+" 크기 (pt)",v.font[role][0],OPT[role],size=>onChange({...v,font:{...v.font,[role]:[size,v.font[role][1]]}}))}{choice(`font.${role}.1`,"굵기",v.font[role][1],OPT.weight,weight=>onChange({...v,font:{...v.font,[role]:[v.font[role][0],weight]}}))}</div>)}
    </Section>
    <Section title="3. 요소·문단 간격">{(["tb","bt","para"] as const).map(key=>choice(`gap.${key}`,{tb:"제목–본문 (cm)",bt:"블록 간격 (cm)",para:"문단 간격 (pt)"}[key],v.gap[key],key==="para"?OPT.para:OPT.gap,next=>onChange({...v,gap:{...v.gap,[key]:next}})))}</Section>
    <Section title="4. 표 서식">
      {(["padV","padH","rowH"] as const).map(key=>choice(`table.${key}`,{padV:"상하 안쪽 여백 (cm)",padH:"좌우 안쪽 여백 (cm)",rowH:"행 높이 (cm)"}[key],v.table[key],key==="rowH"?OPT.rowH:OPT.pad,next=>onChange({...v,table:{...v.table,[key]:next}})))}
      {(["text","num"] as const).map(key=>choice(`table.${key}`,key==="text"?"문자 정렬":"숫자 정렬",v.table[key],OPT.align,next=>onChange({...v,table:{...v.table,[key]:next}})))}
      {choice("table.head","머리글",v.table.head,OPT.head,head=>onChange({...v,table:{...v.table,head}}))}
    </Section>
    <Section title="5. 도형·이미지">
      {choice("shape.snap","맞춤 기준",v.shape.snap,OPT.snap,snap=>onChange({...v,shape:{...v.shape,snap}}))}
      {choice("shape.img","이미지 맞춤",v.shape.img,OPT.img,img=>onChange({...v,shape:{...v.shape,img}}))}
      {choice("shape.align","세로 정렬",v.shape.align,OPT.salign,align=>onChange({...v,shape:{...v.shape,align}}))}
      {choice("shape.min","최소 폭 (cm)",v.shape.min,OPT.min,min=>onChange({...v,shape:{...v.shape,min}}))}
      <p className="tw:sm:col-span-2 tw:text-(--kpc-muted)">실제 적용에서 배치·이미지 옵션을 켤 때 사용합니다. 일반 그룹의 자동 정렬은 지원하지 않습니다.</p>
    </Section>
    <Section title="6. 여백·가이드">
      {([0,1,2,3] as const).map(index=>choice(`mg.${index}`,["상단","왼쪽","하단","오른쪽"][index]+" 여백 (cm)",v.mg[index],OPT.mg,next=>{const mg:[number,number,number,number]=[...v.mg];mg[index]=next;onChange({...v,mg});}))}
      {(["cols","rows","grid"] as const).map(key=>choice(key,{cols:"가이드 열",rows:"가이드 행",grid:"그리드 간격 (cm)"}[key],v[key],OPT[key],next=>onChange({...v,[key]:next})))}
    </Section>
    <Section title="7. 보호 규칙">
      {(["shrink","split","overlap","inGuide"] as const).map(key=><Checkbox key={key} disabled={disabled} checked={v.guard[key]} label={{shrink:"공간 부족 시 글자 축소",split:"자동 분할 규칙 저장 (적용 미지원)",overlap:"새로운 겹침 방지",inGuide:"가이드 안쪽 유지"}[key]} onChange={(_,data)=>onChange({...v,guard:{...v.guard,[key]:data.checked===true}})}/>)}
      {choice("guard.tableRows","표 최대 행",v.guard.tableRows,OPT.tableRows,tableRows=>onChange({...v,guard:{...v.guard,tableRows}}))}
      <p className="tw:sm:col-span-2 tw:text-(--kpc-muted)">기존 PPT의 슬라이드·표 자동 분할은 수행하지 않습니다. 지원하지 못한 요소는 원본 유지·적용 제외 사유로 안내합니다.</p>
    </Section>
    <Section title="8. 페이지 유형별 규칙">{PAGE_TYPES.map(type=><fieldset key={type} className="tw:m-0 tw:min-w-0 tw:rounded tw:border tw:border-solid tw:border-(--kpc-line-soft) tw:p-2"><legend>{PAGE_LABEL[type]}</legend><div className="tw:grid tw:gap-2">
      {(["title","body","lh"] as const).map(key=>choice(`pt.${type}.${key}`,{title:"제목 크기 (pt)",body:"본문 크기 (pt)",lh:"줄 간격 (배)"}[key],v.pt[type][key],key==="title"?[null,...OPT.title,44,48]:key==="body"?[null,9,...OPT.body]:[null,...OPT.lh],next=>onChange({...v,pt:{...v.pt,[type]:{...v.pt[type],[key]:next}}})))}
      {choice(`pt.${type}.align`,"정렬",v.pt[type].align,OPT.align,align=>onChange({...v,pt:{...v.pt,[type]:{...v.pt[type],align}}}))}
      {choice(`pt.${type}.rule`,"유형 규칙",v.pt[type].rule,RULES[type],rule=>onChange({...v,pt:{...v.pt,[type]:{...v.pt[type],rule}}}))}
      <span className="tw:text-[11px] tw:text-(--kpc-muted)">문구 재작성·번호 생성·로고 배치·출처 확인은 수행하지 않습니다.</span>
    </div></fieldset>)}</Section>
  </div>;
}
