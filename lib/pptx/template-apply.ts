import {SkillEngineInputSchema as skillSchema,type SkillEngineInput as Skill} from '@/lib/skills/schema';
import {OPT} from '@/config/skill-options';
import {fontFace,textHeight,wrapText,alignValue} from './text-layout';
import type {ZipLibrary,ZipArchive} from './zip';
import type {TemplateDocument,TemplateOptions,TemplateResult,TemplateObject,ObjectRole,Box,ObjectChange,TemplateProgress} from '@/types/pptx-template';
import {NS,children,one,all,ensure,removeChildren,attrNumber,xmlPart,serialize,openPackage} from './pptx-xml';
import {readTemplate,textBody,transform,textValue} from './template-read';
import {TemplateOptionsSchema} from './options-schema';
export {TemplateOptionsSchema} from './options-schema';
import {applySharedDesigns,sharedTargets} from './shared-design';
import {checkPptxAbort,PptxError} from './errors';


const charOrder=['ln','noFill','solidFill','gradFill','blipFill','pattFill','grpFill','effectLst','effectDag','highlight','uLnTx','uLn','uFillTx','uFill','latin','ea','cs','sym','hlinkClick','hlinkMouseOver','rtl','extLst'];
const paraOrder=['lnSpc','spcBef','spcAft','buClrTx','buClr','buSzTx','buSzPct','buSzPts','buFontTx','buFont','buNone','buAutoNum','buChar','buBlip','tabLst','defRPr','extLst'];
const emu=(v:number):string=>String(Math.round(v*360000));
const intersectArea=(a:Box,b:Box):number=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
const roleValid=(o:TemplateObject,r:ObjectRole):boolean=>r==='keep'||o.kind==='text'&&['title','sub','body'].includes(r)||o.kind===r;
const stepDown=(v:number,min=9):number=>[...new Set([9,...OPT.body,...OPT.sub,...OPT.title,44,48])].sort((a,b)=>b-a).find(n=>n<v&&n>=min)??v;
const boxSummary=(o:TemplateObject):string=>`${o.style.face} ${o.style.size}pt${o.style.bold?' Bold':''} · ${o.w.toFixed(2)}×${o.h.toFixed(2)}cm · (${o.x.toFixed(2)}, ${o.y.toFixed(2)})`;
function position(node:Element,r:Box):void{
  let xf=transform(node);
  if(!xf){const sp=ensure(node,'p','spPr',['nvSpPr','spPr','style','txBody','extLst']);xf=ensure(sp,'a','xfrm',['xfrm','prstGeom','custGeom','noFill','solidFill','ln','effectLst','extLst']);}
  const off=ensure(xf,'a','off',['off','ext']),ext=ensure(xf,'a','ext',['off','ext']);off.setAttribute('x',emu(r.x));off.setAttribute('y',emu(r.y));ext.setAttribute('cx',emu(r.w));ext.setAttribute('cy',emu(r.h));
}
function textStyle(body:Element,s:Skill,role:'title'|'sub'|'body',size:number,lh:number,align:'left'|'center'|'right',boldOverride?:boolean,fill?:string):void{
  const face=fontFace(s,boldOverride===undefined?s.font[role][1]:boldOverride?'Bold':'Regular');
  const setProps=(props:Element)=>{
    props.setAttribute('sz',String(Math.round(size*100)));props.setAttribute('b',(boldOverride??face.bold)?'1':'0');
    for(const name of ['latin','ea','cs'])ensure(props,'a',name,charOrder).setAttribute('typeface',face.face);
    if(fill){removeChildren(props,NS.a,['noFill','solidFill','gradFill','blipFill','pattFill','grpFill']);const solid=ensure(props,'a','solidFill',charOrder);ensure(solid,'a','srgbClr').setAttribute('val',fill);}
  };
  for(const p of children(body).filter(e=>e.namespaceURI===NS.a&&e.localName==='p')){
    const ppr=ensure(p,'a','pPr',['pPr','r','br','fld','endParaRPr']);ppr.setAttribute('algn',align==='center'?'ctr':align==='right'?'r':'l');
    for(const [tag,value] of [['lnSpc',lh*100000],['spcAft',s.gap.para*100],['spcBef',0]] as const){const spacing=ensure(ppr,'a',tag,paraOrder);removeChildren(spacing,NS.a,['spcPct','spcPts']);ensure(spacing,'a',tag==='lnSpc'?'spcPct':'spcPts').setAttribute('val',String(Math.round(value)));}
    setProps(ensure(ppr,'a','defRPr',paraOrder));
    for(const run of children(p).filter(e=>['r','br','fld'].includes(e.localName)))setProps(ensure(run,'a','rPr',['rPr','t']));
    if(one(p,NS.a,'endParaRPr'))setProps(one(p,NS.a,'endParaRPr')!);
  }
  const bodyPr=one(body,NS.a,'bodyPr');if(bodyPr){removeChildren(bodyPr,NS.a,['normAutofit','spAutoFit','noAutofit']);ensure(bodyPr,'a','noAutofit',['prstTxWarp','noAutofit','scene3d','sp3d','flatTx','extLst']);}
}
function imageMode(node:Element,obj:TemplateObject,frame:Box,s:Skill):Box{
  if(!obj.imageWidth||!obj.imageHeight)throw new Error('이미지 원본 크기를 읽을 수 없어 이미지 크기 규칙을 적용하지 않았습니다.');
  const fill=one(node,NS.p,'blipFill');if(!fill)throw new Error('이미지 채우기 구조가 지원되지 않습니다.');
  removeChildren(fill,NS.a,['srcRect','tile','stretch']);const src=ensure(fill,'a','srcRect',['blip','srcRect','tile','stretch']),stretch=ensure(fill,'a','stretch',['blip','srcRect','tile','stretch']);ensure(stretch,'a','fillRect');
  const aspect=obj.imageWidth/obj.imageHeight,ratio=frame.w/frame.h;
  if(s.shape.img==='영역 채우기 (잘라내기)'){
    const crop=aspect>ratio?(1-ratio/aspect)/2:(1-aspect/ratio)/2;
    if(aspect>ratio){src.setAttribute('l',String(Math.round(crop*100000)));src.setAttribute('r',String(Math.round(crop*100000)));}else{src.setAttribute('t',String(Math.round(crop*100000)));src.setAttribute('b',String(Math.round(crop*100000)));}
    return frame;
  }
  let w=Math.min(frame.w,frame.h*aspect),h=w/aspect;
  if(s.shape.img==='원본 비율 유지'){w=Math.min(w,obj.imageWidth*2.54/96);h=w/aspect;}
  return {x:frame.x+(frame.w-w)/2,y:frame.y+(s.shape.align==='아래쪽 맞춤'?frame.h-h:s.shape.align==='가운데 맞춤'?(frame.h-h)/2:0),w,h};
}
async function applyGuides(zip:ZipArchive,s:Skill,width:number,height:number):Promise<void>{
  const path='ppt/viewProps.xml',entry=zip.file(path);
  const doc=entry?await xmlPart(zip,path):new DOMParser().parseFromString(`<p:viewPr xmlns:p="${NS.p}" xmlns:a="${NS.a}"/>`,'application/xml');
  const view=ensure(doc.documentElement,'p','slideViewPr',['normalViewPr','slideViewPr','outlineViewPr','notesTextViewPr','sorterViewPr','notesViewPr','gridSpacing','extLst']);
  const common=ensure(view,'p','cSldViewPr',['cSldViewPr','extLst']);common.setAttribute('snapToGrid',s.shape.snap===OPT.snap[0]?'1':'0');common.setAttribute('snapToObjects','0');common.setAttribute('showGuides','1');
  const base=ensure(common,'p','cViewPr',['cViewPr','guideLst']);if(!one(base,NS.p,'scale')){const scale=ensure(base,'p','scale',['scale','origin']);for(const key of ['sx','sy']){const v=ensure(scale,'a',key);v.setAttribute('n','100');v.setAttribute('d','100');}const origin=ensure(base,'p','origin');origin.setAttribute('x','0');origin.setAttribute('y','0');}
  const list=ensure(common,'p','guideLst',['cViewPr','guideLst']);while(list.firstChild)list.removeChild(list.firstChild);
  const w=width-s.mg[1]-s.mg[3],h=height-s.mg[0]-s.mg[2];
  for(const [direction,count,start,length] of [['vert',s.cols,s.mg[1],w],['horz',s.rows,s.mg[0],h]] as const)for(let i=0;i<=count;i++){const g=doc.createElementNS(NS.p,'p:guide');g.setAttribute('orient',direction);g.setAttribute('pos',String(Math.round((start+length*i/count)*72/2.54*8)));list.appendChild(g);}
  const grid=ensure(doc.documentElement,'p','gridSpacing',['normalViewPr','slideViewPr','outlineViewPr','notesTextViewPr','sorterViewPr','notesViewPr','gridSpacing','extLst']);grid.setAttribute('cx',emu(s.grid));grid.setAttribute('cy',emu(s.grid));zip.file(path,serialize(doc));
  const rel=await xmlPart(zip,'ppt/_rels/presentation.xml.rels');if(!all(rel,NS.rel,'Relationship').some(r=>r.getAttribute('Type')===NS.r+'/viewProps')){const ids=new Set(all(rel,NS.rel,'Relationship').map(r=>r.getAttribute('Id')));let index=1;while(ids.has('rIdKpcView'+index))index++;const r=rel.createElementNS(NS.rel,'Relationship');r.setAttribute('Id','rIdKpcView'+index);r.setAttribute('Type',NS.r+'/viewProps');r.setAttribute('Target','viewProps.xml');rel.documentElement.appendChild(r);zip.file('ppt/_rels/presentation.xml.rels',serialize(rel));}
  const ct=await xmlPart(zip,'[Content_Types].xml');if(!all(ct,NS.ct,'Override').some(e=>e.getAttribute('PartName')==='/ppt/viewProps.xml')){const e=ct.createElementNS(NS.ct,'Override');e.setAttribute('PartName','/ppt/viewProps.xml');e.setAttribute('ContentType','application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml');ct.documentElement.appendChild(e);}zip.file('[Content_Types].xml',serialize(ct));
}

export async function applyTemplate(input:TemplateDocument,inputSkill:Skill,inputOptions:TemplateOptions,lib:ZipLibrary,onProgress?:TemplateProgress,signal?:AbortSignal):Promise<TemplateResult>{
  checkPptxAbort(signal);
  onProgress?.('원본 PPTX 사본을 준비합니다.');
  const s=skillSchema.parse(inputSkill),options=TemplateOptionsSchema.parse(inputOptions),zip=await openPackage(input.bytes,lib),changes:ObjectChange[]=[],warnings:string[]=[],modifiedParts:string[]=[];
  const slideIds=new Set(input.slides.map(slide=>slide.index));
  const objectIds=new Set(input.slides.flatMap(slide=>slide.objects.map(object=>object.id)));
  const sharedIds=new Set(sharedTargets(input).map(item=>item.id));
  if(options.selectedSlides.some(id=>!slideIds.has(id))||Object.keys(options.pageTypes).some(id=>!/^\d+$/.test(id)||!slideIds.has(Number(id)))||Object.keys(options.roles).some(id=>!objectIds.has(id)&&!sharedIds.has(id))||options.excluded.some(id=>!objectIds.has(id)&&!sharedIds.has(id))||options.sharedEdits.some(edit=>!sharedIds.has(edit.id)))throw new PptxError('VALIDATION','문서에서 적용 대상을 찾을 수 없습니다.');
  // 필수 파트 손상을 요소별 적용 제외로 숨기지 않습니다.
  for(const path of Object.keys(zip.files))if(/\.(xml|rels)$/.test(path)){checkPptxAbort(signal);await xmlPart(zip,path);}
  const inner={x:s.mg[1],y:s.mg[0],w:input.width-s.mg[1]-s.mg[3],h:input.height-s.mg[0]-s.mg[2]};
  if(options.selectedSlides.length&&(inner.w<=1||inner.h<=1))throw new Error('선택한 여백을 적용하면 내용 영역이 1cm 이하입니다. 여백을 줄이세요.');
  const placements=new Map<string,Box>();
  for(const weight of [s.font.title[1],s.font.sub[1],s.font.body[1]]){const note=fontFace(s,weight).note;if(note)warnings.push(note);}
  for(const slide of input.slides){
    checkPptxAbort(signal);
    if(onProgress){onProgress(`Skill 적용 ${slide.index+1} / ${input.slides.length}장`);await new Promise<void>(resolve=>setTimeout(resolve,0));}
    const selected=options.selectedSlides.includes(slide.index),type=options.pageTypes[slide.index]??slide.type,p=s.pt[type];
    const doc=await xmlPart(zip,slide.path),tree=all(doc,NS.p,'spTree')[0],nodes=children(tree).filter(e=>!['nvGrpSpPr','grpSpPr','extLst'].includes(e.localName));
    const states=slide.objects.map(o=>({original:o,node:nodes[o.index],backup:nodes[o.index].cloneNode(true),rect:{x:o.x,y:o.y,w:o.w,h:o.h},changed:false,change:{slide:slide.index+1,id:o.id,name:o.name,status:'kept' as ObjectChange['status'],details:[] as string[],before:boxSummary(o),after:boxSummary(o)}}));
    const revert=(state:typeof states[number],reason:string)=>{if(state.node.parentNode){const copy=state.backup.cloneNode(true) as Element;state.node.parentNode.replaceChild(copy,state.node);state.node=copy;}state.rect={x:state.original.x,y:state.original.y,w:state.original.w,h:state.original.h};state.changed=false;state.change.status='skipped';state.change.details=[reason];};
    const obstacles=(state:typeof states[number],r:Box)=>states.filter(other=>other!==state&&other.original.w>0&&other.original.h>0&&intersectArea(r,other.rect)>intersectArea(state.original,other.original)+.015);
    for(const state of [...states].sort((a,b)=>a.original.y-b.original.y||a.original.x-b.original.x)){
      const o=state.original,node=state.node,role=options.roles[o.id]??o.role,details=state.change.details;
      if(!selected){details.push('선택하지 않은 슬라이드입니다.');continue;}
      if(options.excluded.includes(o.id)||role==='keep'){details.push(...o.reasons,'사용자 지정 또는 보호 대상: 원본 유지');continue;}
      if(!roleValid(o,role)){revert(state,'이 요소에 지정할 수 없는 역할입니다.');continue;}
      if(o.reasons.length){state.change.status='skipped';details.push(...o.reasons);continue;}
      if(o.kind==='shape'&&o.w>input.width*.85&&o.h>input.height*.85){details.push('슬라이드 배경 크기의 도형은 원본 디자인으로 유지합니다.');continue;}
      if(o.kind==='image'&&!options.images&&!options.layout){details.push('이미지 크기 적용과 위치 규칙이 꺼져 있어 원본을 유지합니다.');continue;}
      if(o.kind==='shape'&&!options.layout){details.push('위치 규칙이 꺼져 있어 도형을 유지합니다.');continue;}
      try{
        let r:Box=options.layout?{x:inner.x+o.x/input.width*inner.w,y:inner.y+o.y/input.height*inner.h,w:o.w/input.width*inner.w,h:o.h/input.height*inner.h}:{...state.rect};
        if(options.layout&&(o.kind==='shape'||o.kind==='image')){
          r.w=Math.max(r.w,inner.w*s.shape.min/s.cols);
          if(s.shape.snap!==OPT.snap[2]){r.x=inner.x+Math.round((r.x-inner.x)/(inner.w/s.cols))*(inner.w/s.cols);r.y=inner.y+Math.round((r.y-inner.y)/(inner.h/s.rows))*(inner.h/s.rows);if(s.shape.snap===OPT.snap[0]){r.x=inner.x+Math.round((r.x-inner.x)/s.grid)*s.grid;r.y=inner.y+Math.round((r.y-inner.y)/s.grid)*s.grid;}}
          details.push('최소 열 폭·위치 기준 적용');
        }
        if(o.kind==='text'&&(role==='title'||role==='sub'||role==='body')){
          let size=role==='title'?(p.title??s.font.title[0]):role==='sub'?s.font.sub[0]:(p.body??s.font.body[0]);const lh=p.lh??s.font.lh;
          const body=textBody(node);if(!body)throw new Error('텍스트 본문을 찾을 수 없습니다.');
          const bp=one(body,NS.a,'bodyPr'),padW=(attrNumber(bp,'lIns',91440)+attrNumber(bp,'rIns',91440))/360000,padH=(attrNumber(bp,'tIns',45720)+attrNumber(bp,'bIns',45720))/360000;
          const required=()=>textHeight(o.text,Math.max(.1,r.w-padW),size,lh,s.gap.para,s,s.font[role][1])+padH;
          const coverFits=()=>type!=='cover'||role!=='title'||p.rule!=='사업명 2줄까지 자동 줄바꿈'||wrapText(o.text,r.w-padW,size,s,s.font[role][1]).length<=2;
          if((required()>r.h||!coverFits())&&s.guard.shrink){const smaller=stepDown(size,role==='title'?20:type==='appx'?9:Math.min(10,size));if(smaller<size){details.push(`${size} → ${smaller}pt 한 단계 축소`);size=smaller;}}
          if(!coverFits())throw new Error('표지 제목이 두 줄을 넘습니다. 제목을 줄이거나 크기를 낮추세요.');
          if(required()>r.h){if(options.layout)r.h=required();else throw new Error('설정한 글자·줄 간격이 원본 텍스트 상자에 들어가지 않습니다. 위치 규칙을 켜거나 크기/간격을 줄이세요. 원본 내용 보존을 위해 자동 분할은 적용하지 않았습니다.');}
          textStyle(body,s,role,size,lh,alignValue(p.align));details.push(`${fontFace(s,s.font[role][1]).face} ${size}pt · ${lh}배 · 문단 ${s.gap.para}pt · ${p.align}`);
        }else if(o.kind==='table'){
          const tbl=all(node,NS.a,'tbl')[0];if(!tbl)throw new Error('표 구조를 읽을 수 없습니다.');
          const rows=children(tbl).filter(e=>e.localName==='tr'),lh=p.lh??s.font.lh;let size=p.body??s.font.body[0],widths=o.columnWidths.map(v=>v*r.w/o.w);
          if(options.layout&&p.rule==='열 너비 내용에 맞춤'&&!o.merged){const lengths=widths.map((_,j)=>Math.max(...o.cells.map(row=>Array.from(row[j]??'').reduce((n,ch)=>n+(/[\u2e80-\uffff]/.test(ch)?1:.58),0)))+s.table.padH*4+2);widths=lengths.map(v=>r.w*v/lengths.reduce((a,b)=>a+b,0));details.push('내용 길이에 따라 열 너비 조정');}
          const rowSizes=()=>o.cells.map(row=>Math.max(s.table.rowH,...row.map((text,j)=>textHeight(text,Math.max(.1,(widths[j]??r.w)-2*s.table.padH),size,lh,s.gap.para,s,s.font.body[1])+2*s.table.padV)));
          let heights=o.merged?o.rowHeights:rowSizes();
          if(!o.merged&&heights.reduce((a,b)=>a+b,0)>r.h&&s.guard.shrink){const smaller=stepDown(size);if(smaller<size){details.push(`표 ${size} → ${smaller}pt 한 단계 축소`);size=smaller;heights=rowSizes();}}
          if(o.merged){details.push(...o.notices);r={...state.rect};widths=[...o.columnWidths];}
          else{r.h=heights.reduce((a,b)=>a+b,0);all(tbl,NS.a,'gridCol').forEach((col,i)=>col.setAttribute('w',emu(widths[i])));rows.forEach((row,i)=>row.setAttribute('h',emu(heights[i])));details.push(`행 높이 최소 ${s.table.rowH}cm · 실제 최대 ${Math.max(...heights).toFixed(2)}cm`);}
          for(const [ri,row] of rows.entries())for(const [ci,cell] of children(row).filter(e=>e.localName==='tc').entries()){
            const text=textValue(textBody(cell)),align=ri===0?(s.table.head.startsWith('가운데')?'center':'left'):alignValue(/^[-+]?\d[\d,.]*(%|원)?$/.test(text.trim())?s.table.num:s.table.text),body=textBody(cell);
            if(body)textStyle(body,s,'body',size,lh,align,ri===0?s.table.head.includes('굵게'):undefined,ri===0?(s.table.head.includes('배경색')?'FFFFFF':'263345'):undefined);
            const pr=one(cell,NS.a,'tcPr')??ensure(cell,'a','tcPr',['txBody','tcPr','extLst']);for(const k of ['marT','marB'])pr.setAttribute(k,emu(s.table.padV));for(const k of ['marL','marR'])pr.setAttribute(k,emu(s.table.padH));
            if(ri===0){removeChildren(pr,NS.a,['noFill','solidFill','gradFill','blipFill','pattFill','grpFill']);const solid=ensure(pr,'a','solidFill',['lnL','lnR','lnT','lnB','lnTlToBr','lnBlToTr','cell3D','noFill','solidFill','headers','extLst']);ensure(solid,'a','srgbClr').setAttribute('val',s.table.head.includes('배경색')?'9F2433':'F0F2F5');}
            if(o.merged&&ri<o.rowHeights.length&&ci<o.columnWidths.length&&!['hMerge','vMerge'].some(k=>cell.getAttribute(k)==='1')){
              const spanW=widths.slice(ci,ci+attrNumber(cell,'gridSpan',1)).reduce((a,b)=>a+b,0),spanH=o.rowHeights.slice(ri,ri+attrNumber(cell,'rowSpan',1)).reduce((a,b)=>a+b,0);
              if(textHeight(text,Math.max(.1,spanW-2*s.table.padH),size,lh,s.gap.para,s,s.font.body[1])+2*s.table.padV>spanH+.02)throw new Error('병합 셀의 원본 높이에 변경된 텍스트가 들어가지 않습니다. 병합 관계 보존을 위해 이 표를 유지합니다.');
            }
          }
          details.push(`셀 여백 상하 ${s.table.padV} / 좌우 ${s.table.padH}cm · 문자/숫자/머리글 정렬`);
          if(rows.length-1>s.guard.tableRows)details.push(`데이터 ${rows.length-1}행이 기준 ${s.guard.tableRows}행을 넘지만 외부 템플릿의 표 분할은 미지원입니다. 내용과 슬라이드 수를 보존합니다.`);
        }else if(o.kind==='image'&&options.images){r=imageMode(node,o,r,s);details.push(`이미지: ${s.shape.img} · ${s.shape.align}`);}
        if(options.layout){
          const roleOf=(obj:TemplateObject)=>options.roles[obj.id]??obj.role;
          if(o.kind==='text'&&role!=='title'){const titles=states.filter(st=>st!==state&&roleOf(st.original)==='title'&&st.original.kind==='text');if(titles.length){const last=Math.max(...titles.map(st=>st.rect.y+st.rect.h));r.y=Math.max(r.y,last+s.gap.tb);details.push('제목과 본문 최소 간격 적용');}}
          if(o.kind==='table'){const texts=states.filter(st=>st!==state&&st.original.kind==='text'&&st.rect.y<r.y&&roleOf(st.original)!=='title');if(texts.length){r.y=Math.max(r.y,Math.max(...texts.map(st=>st.rect.y+st.rect.h))+s.gap.bt);details.push('본문과 표 최소 간격 적용');}}
          if(s.guard.inGuide){if(r.w>inner.w+.01||r.h>inner.h+.01)throw new Error('요소가 내용 영역보다 큽니다. 자동 슬라이드 분할은 템플릿 구조 보존을 위해 지원하지 않습니다.');r.x=Math.max(inner.x,Math.min(r.x,inner.x+inner.w-r.w));r.y=Math.max(inner.y,r.y);}
          details.push('슬라이드 크기를 유지하고 여백 안으로 비례 배치');
        }
        if(s.guard.overlap){let hit=obstacles(state,r),attempts=0;if(hit.length&&options.layout){while(hit.length&&attempts++<states.length){r.y=Math.max(...hit.map(h=>h.rect.y+h.rect.h))+.2;hit=obstacles(state,r);}details.push('새로 생기는 겹침을 아래로 재배치');}if(hit.length)throw new Error('서식 변경으로 다른 요소와 겹칩니다. 위치 규칙을 켜거나 값을 줄이세요. 이 요소는 원본으로 되돌렸습니다.');}
        const boundary=options.layout&&s.guard.inGuide?inner:{x:0,y:0,w:input.width,h:input.height};
        if(r.x<boundary.x-.01||r.y<boundary.y-.01||r.x+r.w>boundary.x+boundary.w+.01||r.y+r.h>boundary.y+boundary.h+.01)throw new Error('적용 후 경계를 넘거나 재배치 공간이 부족합니다. 자동 분할로 구조를 바꾸지 않고 원본 요소를 유지합니다.');
        position(node,r);state.rect=r;state.changed=true;state.change.status='changed';
      }catch(e){revert(state,e instanceof Error?e.message:'이 요소의 서식을 적용할 수 없습니다.');}
    }
    // 뒤의 요소가 복원되면서 새 충돌이 생긴 경우에도 변경본을 남기지 않습니다.
    if(s.guard.overlap){let again=true,passes=0;while(again&&passes++<=states.length){again=false;for(const st of states)if(st.changed&&obstacles(st,st.rect).length){revert(st,'다른 요소의 원본 복원 후 겹침이 발생하여 이 요소도 원본을 유지했습니다.');again=true;}}}
    if(states.some(st=>st.changed)){zip.file(slide.path,serialize(doc));modifiedParts.push(slide.path);}
    changes.push(...states.map(st=>st.change));
    for(const state of states)placements.set(state.original.id,state.rect);
    if(selected){
      warnings.push(`${slide.index+1}쪽 · ${p.rule}: 기존 내용 재작성·블록 재구성·목차 번호 생성·로고 위치 자동 판별·출처 확인은 수행하지 않습니다. 유형별 크기/줄 간격/정렬과 지원되는 표 규칙을 적용합니다.`);
      if(s.guard.split)warnings.push(`${slide.index+1}쪽: 자동 슬라이드/표 분할은 연결선·애니메이션·참조 손상 가능성 때문에 보류합니다. 공간이 부족한 요소는 원본 유지 사유를 확인하세요.`);
      if(!options.layout)warnings.push(`${slide.index+1}쪽: 원본 배치 유지 모드로 여백·요소 간격·스냅·최소 폭을 적용하지 않았습니다.`);
      else warnings.push(`${slide.index+1}쪽: 도형끼리의 위/가운데/아래 맞춤은 기준 그룹을 확정할 수 없어 생략합니다. 이미지의 세로 맞춤은 이미지 크기 적용을 켜면 원래 배치 영역 안에서 적용합니다.`);
    }
    for(const d of slide.decorations)changes.push({slide:slide.index+1,id:d.id,name:`${d.source==='master'?'마스터':'레이아웃'} · ${d.name}`,status:'kept',details:[...d.reasons,'공유 디자인 변경이 예약되지 않아 원본을 유지합니다.'],before:boxSummary(d),after:boxSummary(d)});
  }
  if(options.sharedEdits.length){
    onProgress?.('공유 디자인을 연결된 모든 슬라이드에 적용합니다.');
    const shared=await applySharedDesigns(zip,input,options.sharedEdits,placements,s.guard.overlap,signal);modifiedParts.push(...shared.modifiedParts);
    for(const change of changes){const outcome=shared.outcomes.get(change.id);if(outcome){change.status=outcome.status;change.details=outcome.details;change.children=outcome.children;}}
    warnings.push('공유 디자인 변경은 슬라이드 선택과 관계없이 같은 마스터/레이아웃을 사용하는 전체 슬라이드에 반영됩니다. 숨긴 마스터 그래픽은 숨김 상태를 유지합니다.');
  }
  if(options.layout&&options.selectedSlides.length){await applyGuides(zip,s,input.width,input.height);modifiedParts.push('ppt/viewProps.xml','ppt/_rels/presentation.xml.rels','[Content_Types].xml');warnings.push('편집용 안내선과 눈금 간격은 파일 전체 공통입니다. 선택하지 않은 슬라이드의 편집 화면에도 보입니다.');}
  const ct=await xmlPart(zip,'[Content_Types].xml');const main=all(ct,NS.ct,'Override').find(e=>e.getAttribute('PartName')==='/ppt/presentation.xml');
  if(main?.getAttribute('ContentType')?.includes('template.main')){main.setAttribute('ContentType','application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml');zip.file('[Content_Types].xml',serialize(ct));modifiedParts.push('[Content_Types].xml');warnings.push('POTX 템플릿을 편집 가능한 PPTX 사본으로 내보냈습니다.');}
  let lastPercent=-1;
  const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE',streamFiles:true},metadata=>{checkPptxAbort(signal);const percent=Math.floor(metadata.percent);if(percent!==lastPercent){lastPercent=percent;onProgress?.(`변경 PPTX 파일 생성 ${percent}%`);}});
  const after=await readTemplate(bytes,input.filename,lib,{images:input.images,signal,onProgress:message=>onProgress?.(`변경본 검증 · ${message}`)});
  for(const change of changes){const slide=after.slides[change.slide-1],obj=[...slide.objects,...slide.decorations].find(o=>o.id===change.id);if(obj)change.after=boxSummary(obj);}
  checkPptxAbort(signal);
  return {bytes,before:input,after,changes,warnings:[...new Set([...input.warnings,...warnings])],skill:s,modifiedParts:[...new Set(modifiedParts)]};
}
