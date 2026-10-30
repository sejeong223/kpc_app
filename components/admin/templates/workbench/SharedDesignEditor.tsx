"use client";
import { Button,Checkbox,Field,Input,Select } from "@fluentui/react-components";
import { useState } from "react";
import { canEditShared,type SharedDesign } from "@/lib/pptx/shared-design";
import { SharedDesignEditSchema,type AppearanceField } from "@/lib/pptx/shared-schema";
import type { SharedDesignEdit } from "@/types/pptx-template";
interface SharedDesignEditorProps {items:readonly SharedDesign[];value:readonly SharedDesignEdit[];disabled:boolean;onChange(value:SharedDesignEdit[]):void}
function SharedForm({item,edit,disabled,onSave,onRemove}:{item:SharedDesign;edit?:SharedDesignEdit;disabled:boolean;onSave(edit:SharedDesignEdit):void;onRemove():void}){
  const object=item.object,baseText=edit?.text??object.style,baseBox=edit?.position??object;
  const [text,setText]=useState(baseText),[fill,setFill]=useState(edit?.fill??object.fill),[mode,setMode]=useState<"appearance"|"full">(edit?.textMode??"appearance"),[fields,setFields]=useState<AppearanceField[]>(edit?.textFields??["face"]);
  const [textOn,setTextOn]=useState(Boolean(edit?.text)),[fillOn,setFillOn]=useState(edit?.fill!=null),[positionOn,setPositionOn]=useState(Boolean(edit?.position)),[error,setError]=useState("");
  const [numbers,setNumbers]=useState({size:String(baseText.size),lh:String(baseText.lh),para:String(baseText.para),padV:String(baseText.padV),padH:String(baseText.padH),x:String(baseBox.x),y:String(baseBox.y),w:String(baseBox.w),h:String(baseBox.h)});
  function save(){
    const keys=[...(textOn&&mode==="full"?["size","lh","para","padV","padH"] as const:[]),...(positionOn?["x","y","w","h"] as const:[])];
    if(keys.some(key=>!numbers[key].trim())){setError("숫자 입력을 빠짐없이 확인하세요.");return;}
    const result=SharedDesignEditSchema.safeParse({id:item.id,position:positionOn?{x:Number(numbers.x),y:Number(numbers.y),w:Number(numbers.w),h:Number(numbers.h)}:null,text:textOn?{...text,...(mode==="full"?{size:Number(numbers.size),lh:Number(numbers.lh),para:Number(numbers.para),padV:Number(numbers.padV),padH:Number(numbers.padH)}:{})}:null,fill:fillOn?fill:null,textMode:mode,...(textOn&&mode==="appearance"?{textFields:fields}:{})});
    if(!result.success){setError(result.error.issues.map(i=>i.message).join(" "));return;}setError("");onSave(result.data);
  }
  const numberField=(key:keyof typeof numbers,label:string)=> <Field key={key} label={label}><Input type="number" step="0.01" disabled={disabled} value={numbers[key]} onChange={(_,data)=>setNumbers({...numbers,[key]:data.value})}/></Field>;
  return <div className="tw:mt-3 tw:flex tw:flex-col tw:gap-3 tw:rounded-lg tw:bg-(--kpc-bg) tw:p-3">
    <strong>{object.name}</strong><p className="tw:my-0">연결: {item.slides.map(i=>i+1).join(", ")}쪽 · 구조상 표시 {item.visibleSlides.length}장</p>
    <p className="tw:my-0 tw:text-[11px] tw:text-(--kpc-muted)">선택 슬라이드와 관계없이 연결된 전체에 반영됩니다. 현재 작업의 출력만 변경하며 등록 Template은 유지합니다.</p>
    {item.blockers.length>0?<p>{item.blockers.join(" ")}</p>:<>
      {!item.access.appearance.length&&<fieldset className="tw:m-0 tw:min-w-0 tw:border tw:border-solid tw:border-(--kpc-line) tw:p-3"><legend><Checkbox label="공유 글자 서식 변경" disabled={disabled} checked={textOn} onChange={(_,data)=>setTextOn(data.checked===true)}/></legend>{textOn&&<div className="tw:grid tw:gap-2 tw:sm:grid-cols-2">
        <Field label="글자 변경 범위"><Select disabled={disabled} value={mode} onChange={(_,data)=>setMode(data.value==="full"?"full":"appearance")}><option value="appearance">글꼴·굵기·색상만</option><option value="full" disabled={item.access.text.length>0}>크기·간격·여백까지</option></Select></Field>
        {mode==="appearance"&&<div>{(["face","bold","color"] as const).map(field=><Checkbox key={field} label={{face:"글꼴 적용",bold:"굵기 적용",color:"글자 색상 적용"}[field]} disabled={disabled} checked={fields.includes(field)} onChange={(_,data)=>setFields(data.checked===true?[...fields,field]:fields.filter(f=>f!==field))}/>)}</div>}
        <Field label="공유 글꼴"><Input disabled={disabled} value={text.face} onChange={(_,data)=>setText({...text,face:data.value})}/></Field>
        <Field label="공유 글자 색상 (#RRGGBB)"><Input disabled={disabled} maxLength={7} value={text.color} onChange={(_,data)=>setText({...text,color:data.value})}/></Field>
        <Checkbox label="공유 글자 굵게" disabled={disabled} checked={text.bold} onChange={(_,data)=>setText({...text,bold:data.checked===true})}/>
        {mode==="full"&&<>{numberField("size","글자 크기 (pt)")}{numberField("lh","줄 간격 (배)")}{numberField("para","문단 간격 (pt)")}{numberField("padV","안쪽 상하 여백 (cm)")}{numberField("padH","안쪽 좌우 여백 (cm)")}<Field label="공유 글자 정렬"><Select disabled={disabled} value={text.align} onChange={(_,data)=>setText({...text,align:data.value==="right"?"right":data.value==="center"?"center":"left"})}><option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option></Select></Field></>}
        <p className="tw:sm:col-span-2 tw:my-0 tw:text-[11px]">문구·링크는 유지합니다. 글꼴 변경에 따른 줄바꿈은 PowerPoint에서 확인하세요.</p>
      </div>}</fieldset>}
      {item.access.text.length>0&&<p className="tw:my-0 tw:text-[11px]">크기·간격 변경 제한: {item.access.text.join(" ")}</p>}
      {!item.access.position.length?<fieldset className="tw:m-0 tw:min-w-0 tw:border tw:border-solid tw:border-(--kpc-line) tw:p-3"><legend><Checkbox label="공유 위치·크기 변경" disabled={disabled} checked={positionOn} onChange={(_,data)=>setPositionOn(data.checked===true)}/></legend>{positionOn&&<div className="tw:grid tw:grid-cols-2 tw:gap-2">{numberField("x","왼쪽 (cm)")}{numberField("y","위쪽 (cm)")}{numberField("w","너비 (cm)")}{numberField("h","높이 (cm)")}</div>}</fieldset>:<p className="tw:my-0 tw:text-[11px]">위치·크기 유지: {item.access.position.join(" ")}</p>}
      {!item.access.fill.length&&<fieldset className="tw:m-0 tw:min-w-0 tw:border tw:border-solid tw:border-(--kpc-line) tw:p-3"><legend><Checkbox label="공유 채우기 변경" disabled={disabled} checked={fillOn} onChange={(_,data)=>setFillOn(data.checked===true)}/></legend>{fillOn&&<><Checkbox label="채우기 없음" disabled={disabled} checked={fill==="transparent"} onChange={(_,data)=>setFill(data.checked===true?"transparent":"#FFFFFF")}/>{fill!=="transparent"&&<Field label="공유 채우기 (#RRGGBB)"><Input disabled={disabled} maxLength={7} value={fill} onChange={(_,data)=>setFill(data.value)}/></Field>}<p className="tw:text-[11px]">기존 그라데이션·테마 채우기를 단색 또는 채우기 없음으로 바꿉니다.</p></>}</fieldset>}
      <div className="tw:flex tw:flex-wrap tw:gap-2"><Button appearance="primary" disabled={disabled} onClick={save}>현재 작업에 변경 예약</Button>{edit&&<Button disabled={disabled} onClick={onRemove}>이 공유 변경 해제</Button>}</div>
    </>}{error&&<p role="alert" className="tw:text-(--kpc-danger)">{error}</p>}
  </div>;
}
export default function SharedDesignEditor({items,value,disabled,onChange}:SharedDesignEditorProps){
  const [id,setId]=useState<string|null>(null),targets=items.flatMap(item=>[item,...item.members]),selected=targets.find(item=>item.id===id),edit=value.find(item=>item.id===id);
  return <section aria-label="공유 디자인 편집"><h3 className="tw:mt-0 tw:text-[13px]">공유 디자인 · 변경 예약 {value.length}개</h3>
    {!items.length?<p>편집 가능한 마스터·레이아웃 공유 요소가 없습니다.</p>:<div className="tw:max-h-64 tw:overflow-auto">{items.map(item=><details key={item.id} className="tw:mb-2 tw:rounded tw:border tw:border-solid tw:border-(--kpc-line) tw:p-2"><summary>{item.object.name} · 연결 {item.slides.length}장 {item.members.length?`· 내부 ${item.members.length}개`:""}</summary><p>연결 페이지: {item.slides.map(i=>i+1).join(", ")}쪽</p>
      {canEditShared(item)?<Button size="small" disabled={disabled} onClick={()=>setId(item.id)}>공유 요소 편집</Button>:<p className="tw:text-[11px]">{item.blockers.join(" ")}</p>}
      {item.members.map(member=><div key={member.id} className="tw:my-2 tw:ml-3"><span>{member.ancestors.slice(1).join(" / ")} {member.object.name} </span>{canEditShared(member)?<Button size="small" disabled={disabled} onClick={()=>setId(member.id)}>내부 요소 편집</Button>:<span className="tw:text-[11px]">{member.blockers.join(" ")}</span>}</div>)}
    </details>)}</div>}
    {selected&&<SharedForm key={selected.id+JSON.stringify(edit)} item={selected} edit={edit} disabled={disabled} onSave={next=>onChange([...value.filter(v=>v.id!==next.id),next])} onRemove={()=>onChange(value.filter(v=>v.id!==selected.id))}/>}
  </section>;
}
