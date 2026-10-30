"use client";
import { Checkbox } from "@fluentui/react-components";
import TemplateMappingFields from "../TemplateMappingFields";
import type { TemplateOptions } from "@/types/pptx-template";
import type { TemplatePreviewData } from "@/types/template-work";
interface TemplateApplyOptionsProps {value:TemplateOptions;document:TemplatePreviewData;disabled:boolean;onChange(value:TemplateOptions):void}
export default function TemplateApplyOptions({value,document:doc,disabled,onChange}:TemplateApplyOptionsProps){
  return <div className="tw:flex tw:flex-col tw:gap-3"><div className="tw:flex tw:flex-wrap tw:gap-3">
    <Checkbox label="배치·여백·가이드 적용" disabled={disabled} checked={value.layout} onChange={(_,data)=>onChange({...value,layout:data.checked===true})}/>
    <Checkbox label="이미지 크기 규칙 적용" disabled={disabled} checked={value.images} onChange={(_,data)=>onChange({...value,images:data.checked===true})}/>
  </div><fieldset className="tw:m-0 tw:min-w-0 tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:p-3"><legend>적용 슬라이드</legend>
    <Checkbox label="전체 슬라이드" disabled={disabled} checked={value.selectedSlides.length===doc.slides.length?true:value.selectedSlides.length?"mixed":false} onChange={(_,data)=>onChange({...value,selectedSlides:data.checked===true?doc.slides.map(s=>s.index):[]})}/>
    <div className="tw:flex tw:max-h-32 tw:flex-wrap tw:overflow-y-auto">{doc.slides.map(slide=><Checkbox key={slide.index} label={`${slide.index+1}쪽`} disabled={disabled} checked={value.selectedSlides.includes(slide.index)} onChange={(_,data)=>onChange({...value,selectedSlides:data.checked===true?[...value.selectedSlides,slide.index]:value.selectedSlides.filter(i=>i!==slide.index)})}/>)}</div>
    <p className="tw:text-[11px] tw:text-(--kpc-muted)">슬라이드 선택은 일반 요소에 적용됩니다. 공유 디자인 변경은 연결된 전체 페이지에 반영됩니다.</p>
  </fieldset><TemplateMappingFields document={doc} value={value} disabled={disabled} onChange={mapping=>onChange({...value,...mapping})}/></div>;
}
