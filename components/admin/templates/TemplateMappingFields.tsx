"use client";
import { Checkbox,Field,Select } from "@fluentui/react-components";
import { useState } from "react";
import { PAGE_TYPES,PAGE_LABEL } from "@/config/skill-options";
import { PageTypeSchema,ObjectRoleSchema } from "@/lib/skills/schema";
import { ROLE_LABEL } from "@/types/pptx-template";
import type { TemplateDraft } from "@/types/admin-assets";
import type { TemplatePreviewData } from "@/types/template-work";
interface TemplateMappingFieldsProps {document:TemplatePreviewData;value:Pick<TemplateDraft,"pageTypes"|"roles"|"excluded">;disabled:boolean;onChange(value:Pick<TemplateDraft,"pageTypes"|"roles"|"excluded">):void}
export default function TemplateMappingFields({document:doc,value,disabled,onChange}:TemplateMappingFieldsProps){
  const [index,setIndex]=useState(0),slide=doc.slides.find(s=>s.index===index)??doc.slides[0];
  if(!slide)return <p>분석된 슬라이드가 없습니다.</p>;
  return <section aria-label="슬라이드 유형·역할·제외 설정" className="tw:min-w-0 tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:p-3">
    <h3 className="tw:mt-0 tw:text-[13px]">유형·역할·적용 제외</h3><div className="tw:grid tw:gap-2 tw:sm:grid-cols-2">
      <Field label="설정할 슬라이드"><Select value={slide.index} onChange={(_,data)=>setIndex(Number(data.value))}>{doc.slides.map(s=><option key={s.index} value={s.index}>{s.index+1}쪽 · {s.name}</option>)}</Select></Field>
      <Field label="페이지 유형"><Select disabled={disabled} value={value.pageTypes[String(slide.index)]??slide.type} onChange={(_,data)=>onChange({...value,pageTypes:{...value.pageTypes,[slide.index]:PageTypeSchema.parse(data.value)}})}>{PAGE_TYPES.map(type=><option key={type} value={type}>{PAGE_LABEL[type]}</option>)}</Select></Field>
    </div><p className="tw:text-[11px] tw:text-(--kpc-muted)">자동 추정 역할을 확인하세요. 제외한 요소는 적용 시 원본을 유지합니다.</p>
    <div className="tw:max-h-80 tw:overflow-auto">{slide.objects.map(object=><div key={object.id} className="tw:mb-2 tw:rounded tw:bg-(--kpc-bg) tw:p-2">
      <p className="tw:m-0 tw:font-semibold">{object.name}</p><p className="tw:my-1 tw:line-clamp-2 tw:text-[11px]">{object.text||object.kind}</p>
      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2"><Select aria-label={object.name+" 역할"} disabled={disabled} value={value.roles[object.id]??object.role} onChange={(_,data)=>onChange({...value,roles:{...value.roles,[object.id]:ObjectRoleSchema.parse(data.value)}})}>{Object.entries(ROLE_LABEL).filter(([role])=>role==="keep"||(object.kind==="text"?["title","sub","body"].includes(role):role===object.kind)).map(([role,label])=><option key={role} value={role}>{label}</option>)}</Select>
        <Checkbox label="적용 제외" disabled={disabled} checked={value.excluded.includes(object.id)} onChange={(_,data)=>onChange({...value,excluded:data.checked===true?[...new Set([...value.excluded,object.id])]:value.excluded.filter(id=>id!==object.id)})}/>
      </div>{object.reasons.length>0&&<p className="tw:mb-0 tw:text-[11px] tw:text-(--kpc-muted)">{object.reasons.join(" ")}</p>}
    </div>)}</div>
    {slide.decorations.length>0&&<p className="tw:text-[11px] tw:text-(--kpc-muted)">마스터·레이아웃 공유 요소 {slide.decorations.length}개는 원본을 유지합니다. 공유 디자인 편집은 적용 테스트의 현재 작업에서 제공합니다.</p>}
  </section>;
}
