import type {TemplateDocument,TemplateObject,Box,ObjectChange,TextStyle,GroupMember,ChildChange} from '@/types/pptx-template';
import type {ZipArchive} from './zip';
import type {SharedDesignEdit,AppearanceField} from './shared-schema';
import {sharedEditSchema} from './shared-schema';
import {NS,all,children,one,ensure,removeChildren,xmlPart,serialize} from './pptx-xml';
import {textBody,transform} from './template-read';
import {checkPptxAbort} from './errors';
import {textHeightWithFont} from './text-layout';

export interface SharedAccess {appearance:string[];text:string[];fill:string[];position:string[]}
export interface SharedDesign {id:string;path:string;object:TemplateObject;slides:number[];visibleSlides:number[];blockers:string[];access:SharedAccess;rootId:string;nodePath:number[];ancestors:string[];members:SharedDesign[]}
export interface SharedOutcome {status:ObjectChange['status'];details:string[];children?:ChildChange[]}
export const canEditShared=(item:SharedDesign):boolean=>Object.values(item.access).some(reasons=>!reasons.length);
function sharedAccess(object:TemplateObject,member?:GroupMember):SharedAccess{
  const context=member?.contextReasons??[],hidden=[...object.reasons,...context].filter(r=>r.includes('숨김')||r.includes('자리 표시자'));
  if(object.groupMembers!==undefined){const group=['그룹 자체의 좌표는 보존합니다. 내부 요소를 선택해 서식을 변경하세요.'];return {appearance:group,text:group,fill:group,position:group};}
  const appearance=object.kind==='text'?hidden:['일반 텍스트 요소가 아닙니다.'];
  const text=object.kind==='text'?[...object.reasons,...context]:['일반 텍스트 요소가 아닙니다.'];
  const fill=object.kind==='text'||object.kind==='shape'?hidden:['그림·표·차트 등은 도형 채우기 변경 대상이 아닙니다.'];
  const position=member?['그룹의 상대 좌표·크기·연결 관계를 유지하기 위해 내부 이동과 크기 변경은 지원하지 않습니다.']:[...object.reasons];
  if(!member&&object.kind==='table')position.push('공유 표의 크기 변경은 지원하지 않습니다.');
  if(!member&&object.kind==='unsupported'&&!position.length)position.push('전용 편집기가 필요한 요소입니다.');
  return {appearance:[...new Set(appearance)],text:[...new Set(text)],fill:[...new Set(fill)],position:[...new Set(position)]};
}
export const sharedPart=(object:TemplateObject):string=>object.id.slice(0,object.id.lastIndexOf('#'));
export function sharedDesigns(doc:TemplateDocument):SharedDesign[]{
  const objects=new Map<string,TemplateObject>();
  for(const slide of doc.slides)for(const object of slide.decorations)if(!objects.has(object.id))objects.set(object.id,object);
  return [...objects.values()].map(object=>{
    const path=sharedPart(object),slides=doc.slides.filter(s=>(object.source==='master'?s.masterPath:s.layoutPath)===path).map(s=>s.index);
    const visibleSlides=doc.slides.filter(s=>s.decorations.some(o=>o.id===object.id)).map(s=>s.index);
    const access=sharedAccess(object),blockers=Object.values(access).some(r=>!r.length)?[]:[...new Set(Object.values(access).flat())];
    const members=(object.groupMembers??[]).map(member=>{const access=sharedAccess(member,member);return {id:member.id,path,object:member,slides,visibleSlides,access,blockers:Object.values(access).some(r=>!r.length)?[]:[...new Set(Object.values(access).flat())],rootId:object.id,nodePath:member.nodePath,ancestors:member.ancestors,members:[]};});
    return {id:object.id,path,object,slides,visibleSlides,blockers,access,rootId:object.id,nodePath:[object.index],ancestors:[],members};
  });
}
export const sharedTargets=(doc:TemplateDocument):SharedDesign[]=>sharedDesigns(doc).flatMap(item=>[item,...item.members]);
const emu=(value:number)=>String(Math.round(value*360000));
const fills=['noFill','solidFill','gradFill','blipFill','pattFill','grpFill'];
const shapeOrder=['xfrm','prstGeom','custGeom',...fills,'ln','effectLst','effectDag','scene3d','sp3d','extLst'];
const charOrder=['ln',...fills,'effectLst','effectDag','highlight','uLnTx','uLn','uFillTx','uFill','latin','ea','cs','sym','hlinkClick','hlinkMouseOver','rtl','extLst'];
const paraOrder=['lnSpc','spcBef','spcAft','buClrTx','buClr','buSzTx','buSzPct','buSz','buFontTx','buFont','buNone','buAutoNum','buChar','buBlip','tabLst','defRPr','extLst'];
function setFill(node:Element,value:string,order:readonly string[]):void{
  removeChildren(node,NS.a,fills);
  if(value==='transparent')ensure(node,'a','noFill',order);
  else ensure(ensure(node,'a','solidFill',order),'a','srgbClr').setAttribute('val',value.slice(1).toUpperCase());
}
function writeText(body:Element,style:TextStyle):void{
  const props=(node:Element)=>{node.setAttribute('sz',String(Math.round(style.size*100)));node.setAttribute('b',style.bold?'1':'0');setFill(node,style.color,charOrder);for(const key of ['latin','ea','cs'])ensure(node,'a',key,charOrder).setAttribute('typeface',style.face);};
  for(const paragraph of children(body).filter(p=>p.namespaceURI===NS.a&&p.localName==='p')){
    const ppr=ensure(paragraph,'a','pPr',['pPr','r','br','fld','endParaRPr']);ppr.setAttribute('algn',style.align==='center'?'ctr':style.align==='right'?'r':'l');
    for(const [tag,value] of [['lnSpc',style.lh*100000],['spcAft',style.para*100],['spcBef',0]] as const){const spacing=ensure(ppr,'a',tag,paraOrder);removeChildren(spacing,NS.a,['spcPct','spcPts']);ensure(spacing,'a',tag==='lnSpc'?'spcPct':'spcPts').setAttribute('val',String(Math.round(value)));}
    props(ensure(ppr,'a','defRPr',paraOrder));
    for(const run of children(paragraph).filter(r=>['r','br'].includes(r.localName)))props(ensure(run,'a','rPr',['rPr','t']));
    const end=one(paragraph,NS.a,'endParaRPr');if(end)props(end);
  }
  const bp=ensure(body,'a','bodyPr',['bodyPr','lstStyle','p']);
  for(const key of ['lIns','rIns'])bp.setAttribute(key,emu(style.padH));
  for(const key of ['tIns','bIns'])bp.setAttribute(key,emu(style.padV));
  removeChildren(bp,NS.a,['normAutofit','spAutoFit','noAutofit']);ensure(bp,'a','noAutofit',['prstTxWarp','noAutofit','scene3d','sp3d','flatTx','extLst']);
}
function writeAppearance(body:Element,style:TextStyle,fields:readonly AppearanceField[]):void{
  const props=(node:Element)=>{if(fields.includes('bold'))node.setAttribute('b',style.bold?'1':'0');if(fields.includes('color'))setFill(node,style.color,charOrder);if(fields.includes('face'))for(const key of ['latin','ea','cs'])ensure(node,'a',key,charOrder).setAttribute('typeface',style.face);};
  for(const paragraph of children(body).filter(p=>p.namespaceURI===NS.a&&p.localName==='p')){
    const ppr=ensure(paragraph,'a','pPr',['pPr','r','br','fld','endParaRPr']);props(ensure(ppr,'a','defRPr',paraOrder));
    for(const run of children(paragraph).filter(r=>['r','br','fld'].includes(r.localName)))props(ensure(run,'a','rPr',['rPr','t']));
    const end=one(paragraph,NS.a,'endParaRPr');if(end)props(end);
  }
}
function sharedNode(xml:Document,path:readonly number[]):Element|undefined{
  let node:Element|undefined=all(xml,NS.p,'spTree')[0];
  for(const index of path){if(!node)return undefined;node=children(node).filter(e=>!['nvGrpSpPr','grpSpPr','extLst'].includes(e.localName))[index];}
  return node;
}
const area=(a:Box,b:Box)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
const moved=(a:Box,b:Box)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+Math.abs(a.w-b.w)+Math.abs(a.h-b.h)>.001;

export async function applySharedDesigns(zip:ZipArchive,doc:TemplateDocument,requests:readonly SharedDesignEdit[],placements:Map<string,Box>,checkOverlap:boolean,signal?:AbortSignal):Promise<{outcomes:Map<string,SharedOutcome>;modifiedParts:string[]}>{
  const catalog=new Map(sharedTargets(doc).map(item=>[item.id,item])),outcomes=new Map<string,SharedOutcome>(),parts=new Map<string,Document>();
  if(new Set(requests.map(edit=>edit.id)).size!==requests.length)throw new Error('같은 공유 요소의 변경 요청이 중복되었습니다.');
  for(const request of requests){
    checkPptxAbort(signal);
    const edit=sharedEditSchema.parse(request),item=catalog.get(edit.id);
    // 요청 경로를 직접 열지 않고 업로드 문서에서 찾은 공유 요소만 수정합니다.
    if(!item)throw new Error('공유 디자인을 찾을 수 없습니다. 파일을 다시 업로드하고 변경 대상을 확인하세요.');
    const object=item.object,details:string[]=[];
    const xml=parts.get(item.path)??await xmlPart(zip,item.path);
    try{
      if(item.blockers.length)throw new Error(item.blockers.join(' '));
      const mode=edit.textMode??'full',issues=[...(edit.position?item.access.position:[]),...(edit.text?mode==='appearance'?item.access.appearance:item.access.text:[]),...(edit.fill!==null?item.access.fill:[])];
      if(issues.length)throw new Error([...new Set(issues)].join(' '));
      if(edit.text&&object.kind!=='text')throw new Error('일반 텍스트에만 글자 서식을 적용할 수 있습니다.');
      if(edit.fill!==null&&!['text','shape'].includes(object.kind))throw new Error('채우기 색은 텍스트 상자와 기본 도형에만 적용할 수 있습니다.');
      const rect=edit.position??object;
      if(edit.position&&(rect.x+rect.w>doc.width+.01||rect.y+rect.h>doc.height+.01))throw new Error('공유 요소가 슬라이드 경계를 넘습니다. 위치와 크기를 줄이세요.');
      if(object.kind==='text'&&(edit.text&&mode==='full'||edit.position&&moved(object,rect))){
        const style=edit.text??object.style,w=rect.w-2*style.padH,h=rect.h-2*style.padV;
        if(w<=0||h<=0||textHeightWithFont(object.text,w,style)>h+.02)throw new Error('글자·간격·안쪽 여백이 텍스트 상자에 들어가지 않습니다. 크기/간격을 줄이거나 상자를 넓히세요. 공유 요소는 자동 축소하거나 다른 위치로 옮기지 않습니다.');
      }
      if(edit.position&&moved(object,rect)&&checkOverlap){
        const collisions:number[]=[];
        for(const index of item.visibleSlides){const slide=doc.slides[index];
          if([...slide.objects,...slide.decorations].some(other=>other.id!==object.id&&area(rect,placements.get(other.id)??other)>area(object,placements.get(other.id)??other)+.015))collisions.push(index+1);
        }
        if(collisions.length)throw new Error(`${collisions.join(', ')}쪽에서 다른 요소와 새로 겹칩니다. 연결된 모든 슬라이드의 배치를 보존하기 위해 공유 변경 전체를 제외했습니다.`);
      }
      const node=sharedNode(xml,item.nodePath);
      if(!node||all(node,NS.p,'ph').length)throw new Error('공유 요소의 원본 위치를 확인할 수 없거나 자리 표시자입니다.');
      const candidate=node.cloneNode(true) as Element;
      if(edit.position){const xf=transform(candidate);if(!xf)throw new Error('좌표가 상속된 공유 요소는 직접 이동할 수 없습니다.');const off=ensure(xf,'a','off',['off','ext']),ext=ensure(xf,'a','ext',['off','ext']);off.setAttribute('x',emu(rect.x));off.setAttribute('y',emu(rect.y));ext.setAttribute('cx',emu(rect.w));ext.setAttribute('cy',emu(rect.h));details.push(`위치 (${rect.x.toFixed(2)}, ${rect.y.toFixed(2)}) · 크기 ${rect.w.toFixed(2)} × ${rect.h.toFixed(2)}cm`);}
      if(edit.text){const body=textBody(candidate);if(!body)throw new Error('텍스트 구조를 찾을 수 없습니다.');if(mode==='appearance'){const fields=edit.textFields??['face','bold','color'];writeAppearance(body,edit.text,fields);details.push(`기본 서식: ${fields.map(field=>field==='face'?`글꼴 ${edit.text!.face}`:field==='bold'?`굵기 ${edit.text!.bold?'굵게':'보통'}`:`색상 ${edit.text!.color}`).join(' · ')}. 크기·간격·좌표·자동 맞춤은 원본 유지. 글꼴 변경에 따른 줄바꿈은 PowerPoint에서 확인하세요.`);}else{writeText(body,edit.text);details.push(`글자 ${edit.text.face} ${edit.text.size}pt · ${edit.text.bold?'굵게':'보통'} · ${edit.text.color} · ${edit.text.lh}배 · 문단 ${edit.text.para}pt · 안쪽 상하 ${edit.text.padV}/좌우 ${edit.text.padH}cm`);}}
      if(edit.fill!==null){const sp=one(candidate,NS.p,'spPr');if(!sp)throw new Error('도형 속성을 찾을 수 없습니다.');setFill(sp,edit.fill,shapeOrder);details.push(`채우기 ${edit.fill==='transparent'?'없음':edit.fill}`);}
      node.parentNode!.replaceChild(candidate,node);parts.set(item.path,xml);placements.set(object.id,rect);
      details.unshift(`공유 원본 1개 수정 · 연결 ${item.slides.length}장 / 구조상 표시 ${item.visibleSlides.length}장 · 슬라이드 선택과 무관하게 일괄 반영`);
      outcomes.set(object.id,{status:'changed',details});
    }catch(error){outcomes.set(object.id,{status:'skipped',details:[error instanceof Error?error.message:'공유 디자인을 변경할 수 없습니다.','이 공유 요소는 연결된 모든 슬라이드에서 원본을 유지합니다.']});}
  }
  const groupChanges=new Map<string,ChildChange[]>();
  for(const [id,outcome] of outcomes){const item=catalog.get(id)!;if(item.id!==item.rootId){const changes=groupChanges.get(item.rootId)??[];changes.push({id,name:[...item.ancestors.slice(1),item.object.name].join(' / '),status:outcome.status,details:outcome.details});groupChanges.set(item.rootId,changes);}}
  for(const [id,changes] of groupChanges){const changed=changes.filter(c=>c.status==='changed').length,skipped=changes.filter(c=>c.status==='skipped').length;outcomes.set(id,{status:changed?'changed':'skipped',details:[`그룹 내부 요소 변경 ${changed}개 · 적용 제외 ${skipped}개 · 미예약 요소 원본 유지. 그룹 구조·좌표·연결 관계는 유지합니다.`,...(skipped?['일부 요소의 변경이 제외되었습니다. 내부 요소별 결과를 확인하세요.']:[])],children:changes});}
  for(const [path,xml] of parts)zip.file(path,serialize(xml));
  return {outcomes,modifiedParts:[...parts.keys()]};
}
