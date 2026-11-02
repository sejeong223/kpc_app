"use client";
import { Field } from "@fluentui/react-components";
import { DadamCheckbox as Checkbox, DadamSelect as Select } from "@/components/ui/DadamControls";
import { OPT,PAGE_TYPES,PAGE_LABEL,RULES } from "@/config/skill-options";
import type { SkillRules } from "@/lib/skills/schema";
interface SkillRuleFieldsProps {value:SkillRules;disabled:boolean;fieldErrors:Record<string,string>;onChange(value:SkillRules):void}
export function RuleChoice<T extends string|number|null>({label,value,options,onChange,disabled,error,hint,name,inheritLabel="공통 규칙",compact=false}:{label:string;value:T;options:readonly T[];onChange(value:T):void;disabled:boolean;error?:string;hint?:string;name?:string;inheritLabel?:string;compact?:boolean}){
  return <Field className="tw:min-w-0" label={compact?undefined:label} hint={hint} validationState={error?"error":"none"} validationMessage={error}><Select className="tw:min-w-0 tw:w-full" select={{className:"tw:min-w-0 tw:w-full"}} name={name} aria-label={compact?label:undefined} disabled={disabled} value={value===null?"":String(value)} onChange={(_,data)=>{const next=options.find(option=>(option===null?"":String(option))===data.value);if(next!==undefined)onChange(next);}}>{options.map(option=><option key={String(option)} value={option===null?"":String(option)}>{option===null?inheritLabel:option}</option>)}</Select></Field>;
}
function Section({title,children}:{title:string;children:React.ReactNode}){return <fieldset className="tw:m-0 tw:min-w-0 tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:p-(--layout-card-inset)"><legend className="tw:px-(--layout-inline-gap) tw:font-semibold">{title}</legend><div className="tw:grid tw:min-w-0 tw:[&>p]:m-0 tw:gap-(--layout-section-gap) tw:sm:grid-cols-2">{children}</div></fieldset>;}
export default function SkillRuleFields({value:v,disabled,fieldErrors,onChange}:SkillRuleFieldsProps){
  const common={disabled};
  const choice=<T extends string|number|null>(path:string,label:string,value:T,options:readonly T[],change:(next:T)=>void,hint?:string)=><RuleChoice key={path} {...common} name={path} label={label} value={value} options={options} onChange={change} error={fieldErrors[path]} hint={hint}/>;
  return <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-(--layout-section-gap)">
    <Section title="2. 글꼴·크기·굵기·줄 간격">
      {choice("font.family","글꼴",v.font.family,OPT.family,family=>onChange({...v,font:{...v.font,family}}))}
      {choice("font.lh","공통 줄 간격 (배)",v.font.lh,OPT.lh,lh=>onChange({...v,font:{...v.font,lh}}))}
      {(["title","sub","body"] as const).map(role=><div key={role} className="tw:grid tw:min-w-0 tw:grid-cols-2 tw:gap-(--layout-control-gap)">{choice(`font.${role}.0`,{title:"제목",sub:"리딩 메시지",body:"본문"}[role]+" 크기 (pt)",v.font[role][0],OPT[role],size=>onChange({...v,font:{...v.font,[role]:[size,v.font[role][1]]}}))}{choice(`font.${role}.1`,{title:"제목",sub:"리딩 메시지",body:"본문"}[role]+" 굵기",v.font[role][1],OPT.weight,weight=>onChange({...v,font:{...v.font,[role]:[v.font[role][0],weight]}}))}</div>)}
    </Section>
    <Section title="3. 제목·본문·표 사이 간격">{(["tb","bt","para"] as const).map(key=>choice(`gap.${key}`,{tb:"제목–본문 (cm)",bt:"본문–표 (cm)",para:"문단 간격 (pt)"}[key],v.gap[key],key==="para"?OPT.para:OPT.gap,next=>onChange({...v,gap:{...v.gap,[key]:next}})))}</Section>
    <Section title="4. 표 서식">
      {(["padV","padH","rowH"] as const).map(key=>choice(`table.${key}`,{padV:"상하 안쪽 여백 (cm)",padH:"좌우 안쪽 여백 (cm)",rowH:"행 높이 (cm)"}[key],v.table[key],key==="rowH"?OPT.rowH:OPT.pad,next=>onChange({...v,table:{...v.table,[key]:next}})))}
      {(["text","num"] as const).map(key=>choice(`table.${key}`,key==="text"?"문자 정렬":"숫자 정렬",v.table[key],OPT.align,next=>onChange({...v,table:{...v.table,[key]:next}})))}
      {choice("table.head","머리글",v.table.head,OPT.head,head=>onChange({...v,table:{...v.table,head}}))}
    </Section>
    <Section title="5. 도형·이미지 배치">
      {choice("shape.snap","맞춤 기준",v.shape.snap,OPT.snap,snap=>onChange({...v,shape:{...v.shape,snap}}))}
      {choice("shape.img","이미지 맞춤",v.shape.img,OPT.img,img=>onChange({...v,shape:{...v.shape,img}}))}
      {choice("shape.align","세로 정렬",v.shape.align,OPT.salign,align=>onChange({...v,shape:{...v.shape,align}}))}
      {choice("shape.min","최소 폭 (열)",v.shape.min,OPT.min,min=>onChange({...v,shape:{...v.shape,min}}))}
      <p className="tw:sm:col-span-2 tw:text-(--kpc-muted)">실제 적용에서 배치·이미지 옵션을 켤 때 사용합니다. 일반 그룹의 자동 정렬은 지원하지 않습니다.</p>
    </Section>
    <Section title="6. 슬라이드 여백·안내선·눈금선">
      {([0,1,2,3] as const).map(index=>choice(`mg.${index}`,["상단","왼쪽","하단","오른쪽"][index]+" 여백 (cm)",v.mg[index],OPT.mg,next=>{const mg:[number,number,number,number]=[...v.mg];mg[index]=next;onChange({...v,mg});}))}
      {(["cols","rows","grid"] as const).map(key=>choice(key,{cols:"세로 안내선 (열)",rows:"가로 안내선 (단)",grid:"눈금 간격 (cm)"}[key],v[key],OPT[key],next=>onChange({...v,[key]:next})))}
    </Section>
    <Section title="7. 넘침·겹침 방지">
      {(["shrink","split","overlap","inGuide"] as const).map(key=><Checkbox key={key} name={`guard.${key}`} disabled={disabled} checked={v.guard[key]} label={{shrink:"공간 부족 시 글자 축소",split:"자동 분할 규칙 저장 (적용 미지원)",overlap:"새로운 겹침 방지",inGuide:"가이드 안쪽 유지"}[key]} onChange={(_,data)=>onChange({...v,guard:{...v.guard,[key]:data.checked===true}})}/>)}
      {choice("guard.tableRows","표 최대 행",v.guard.tableRows,OPT.tableRows,tableRows=>onChange({...v,guard:{...v.guard,tableRows}}))}
      <p className="tw:sm:col-span-2 tw:text-(--kpc-muted)">기존 PPT의 슬라이드·표 자동 분할은 수행하지 않습니다. 지원하지 못한 요소는 원본 유지·적용 제외 사유로 안내합니다.</p>
    </Section>
    <Section title="8. 페이지 유형별 규칙">
      <p className="tw:m-0 tw:text-(--kpc-muted) tw:sm:col-span-2">공통을 선택한 칸은 공통 글꼴 설정을 따릅니다. 문구 재작성·번호 생성·로고 배치·출처 확인은 수행하지 않습니다.</p>
      <div role="region" aria-label="페이지 유형별 규칙 표" tabIndex={0} className="tw:min-w-0 tw:overflow-x-auto tw:sm:col-span-2">
        <table className="tw:w-full tw:min-w-[720px] tw:border-collapse tw:text-left" aria-label="페이지 유형별 규칙">
          <thead><tr>{["페이지 유형","제목 (pt)","본문 (pt)","줄 간격 (배)","정렬","규칙"].map(label=><th key={label} scope="col" className="tw:border-b tw:border-(--kpc-line) tw:p-(--layout-control-gap) tw:text-[11px]">{label}</th>)}</tr></thead>
          <tbody>{PAGE_TYPES.map(type=><tr key={type}>
            <th scope="row" className="tw:whitespace-nowrap tw:border-b tw:border-(--kpc-line-soft) tw:p-(--layout-control-gap)">{PAGE_LABEL[type]}</th>
            {(["title","body","lh"] as const).map(key=><td key={key} className="tw:border-b tw:border-(--kpc-line-soft) tw:p-(--layout-inline-gap)"><RuleChoice compact {...common} name={`pt.${type}.${key}`} label={`${PAGE_LABEL[type]} ${{title:"제목 크기 (pt)",body:"본문 크기 (pt)",lh:"줄 간격 (배)"}[key]}`} value={v.pt[type][key]} options={key==="title"?[null,...OPT.title,44,48]:key==="body"?[null,9,...OPT.body]:[null,...OPT.lh]} inheritLabel={`공통 ${key==="lh"?v.font.lh:v.font[key][0]}${key==="lh"?"배":"pt"}`} error={fieldErrors[`pt.${type}.${key}`]} onChange={next=>onChange({...v,pt:{...v.pt,[type]:{...v.pt[type],[key]:next}}})}/></td>)}
            <td className="tw:border-b tw:border-(--kpc-line-soft) tw:p-(--layout-inline-gap)"><RuleChoice compact {...common} name={`pt.${type}.align`} label={`${PAGE_LABEL[type]} 정렬`} value={v.pt[type].align} options={OPT.align} error={fieldErrors[`pt.${type}.align`]} onChange={align=>onChange({...v,pt:{...v.pt,[type]:{...v.pt[type],align}}})}/></td>
            <td className="tw:border-b tw:border-(--kpc-line-soft) tw:p-(--layout-inline-gap)"><RuleChoice compact {...common} name={`pt.${type}.rule`} label={`${PAGE_LABEL[type]} 유형 규칙`} value={v.pt[type].rule} options={RULES[type]} error={fieldErrors[`pt.${type}.rule`]} onChange={rule=>onChange({...v,pt:{...v.pt,[type]:{...v.pt[type],rule}}})}/></td>
          </tr>)}</tbody>
        </table>
      </div>
    </Section>
  </div>;
}
