"use client";
import type { CSSProperties } from "react";
import type { TemplateObject } from "@/types/pptx-template";
import type { TemplatePreviewData } from "@/types/template-work";
interface TemplateSlidePreviewProps {document:TemplatePreviewData;slideIndex:number;selectedObjectId:string|null;onSelect(id:string):void}
function ObjectPreview({object:o,width,height,selected,onSelect}:{object:TemplateObject;width:number;height:number;selected:boolean;onSelect():void}){
  const pt=(value:number)=>`${value/(width*72/2.54)*100}cqw`,cm=(value:number)=>`${value/width*100}cqw`;
  const position:CSSProperties={position:"absolute",left:`${o.x/width*100}%`,top:`${o.y/height*100}%`,width:`${o.w/width*100}%`,height:`${o.h/height*100}%`,transform:o.rotation?`rotate(${o.rotation}deg)`:undefined,outline:selected?"2px solid var(--kpc-brand)":undefined,outlineOffset:2};
  const imageAllowed=/^data:image\/(png|jpeg|gif|webp|bmp);base64,/i.test(o.imageData);
  let content:React.ReactNode;
  if(o.kind==="unsupported"||o.groupMembers||o.kind==="table"&&o.merged||o.kind==="image"&&!imageAllowed)content=<span>{o.name} · 표시 간소화</span>;
  else if(o.kind==="image"){
    const [l,t,r,b]=o.crop,cw=Math.max(.01,1-l-r),ch=Math.max(.01,1-t-b);
    // 파서가 만든 래스터 data URL만 표시하며 외부 관계를 요청하지 않는다.
    // eslint-disable-next-line @next/next/no-img-element
    content=<img src={o.imageData} alt={o.name} draggable={false} style={{position:"absolute",width:`${100/cw}%`,height:`${100/ch}%`,maxWidth:"none",left:`${-l/cw*100}%`,top:`${-t/ch*100}%`}}/>;
  }else if(o.kind==="table")content=<table style={{width:"100%",height:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}><tbody>{o.cells.map((row,i)=><tr key={i}>{row.map((text,j)=>{const style=o.cellStyles[i]?.[j]??o.style;return <td key={j} style={{fontSize:pt(style.size),fontFamily:style.face,fontWeight:style.bold?700:400,textAlign:style.align,padding:`${cm(style.padV)} ${cm(style.padH)}`,border:".5px solid #d9dee6",background:o.cellFills[i]?.[j]??"white"}}>{text}</td>;})}</tr>)}</tbody></table>;
  else content=o.text;
  return <div role="button" tabIndex={0} aria-label={o.name+" 선택"} aria-pressed={selected} onClick={onSelect} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onSelect();}}} title={[o.name,...o.reasons,...o.notices].join(" · ")} className="tw:cursor-pointer tw:focus-visible:outline-2 tw:focus-visible:outline-(--kpc-brand)" style={{...position,overflow:"hidden",boxSizing:"border-box",fontFamily:o.style.face,fontSize:pt(o.style.size),fontWeight:o.style.bold?700:400,color:o.style.color,textAlign:o.style.align,lineHeight:o.style.lh*1.15,whiteSpace:"pre-wrap",overflowWrap:"anywhere",background:o.fill,border:o.kind==="unsupported"?"1px dashed var(--kpc-warning)":o.stroke!=="transparent"?`.6px solid ${o.stroke}`:undefined,borderRadius:o.geometry==="ellipse"?"50%":0,padding:o.kind==="table"?0:`${cm(o.style.padV)} ${cm(o.style.padH)}`}}>{content}</div>;
}
export default function TemplateSlidePreview({document:doc,slideIndex,selectedObjectId,onSelect}:TemplateSlidePreviewProps){
  const slide=doc.slides.find(s=>s.index===slideIndex)??doc.slides[0];if(!slide)return <p>슬라이드가 없습니다.</p>;
  return <div aria-label={`${slide.index+1}쪽 구조 미리보기`} className="tw:relative tw:w-full tw:overflow-hidden tw:border tw:border-solid tw:border-(--kpc-line)" style={{containerType:"inline-size",aspectRatio:`${doc.width}/${doc.height}`,background:slide.background}}>{[...slide.decorations,...slide.objects].map(object=><ObjectPreview key={object.id} object={object} width={doc.width} height={doc.height} selected={selectedObjectId===object.id} onSelect={()=>onSelect(object.id)}/>)}</div>;
}
