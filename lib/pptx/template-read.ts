import { checkPptxAbort } from "./errors";
import {NS,children,one,all,attrNumber,readXmlBoolean,relativePart,relationships,xmlPart,openPackage,type Relationship} from './pptx-xml';
import type {ZipArchive,ZipLibrary} from './zip';
import type {TemplateDocument,TemplateSlide,TemplateObject,TextStyle,Box,ObjectRole,TemplateImage,TemplateReadOptions,GroupMember} from '@/types/pptx-template';
import {TEMPLATE_LIMITS} from './limits';

const cm=(value:number):number=>value/360000;
interface ReadContext {zip:ZipArchive;path:string;rels:Relationship[];colors:Record<string,string>;major:string;minor:string;layout:Document|null;master:Document|null;images:Map<string,TemplateImage>;previewBudget:{used:number}}
function color(node:Element|undefined,ctx:ReadContext,fallback:string):string{
  if(!node)return fallback;
  if(one(node,NS.a,'noFill'))return 'transparent';
  const rgb=all(node,NS.a,'srgbClr')[0]?.getAttribute('val'),scheme=all(node,NS.a,'schemeClr')[0]?.getAttribute('val'),sys=all(node,NS.a,'sysClr')[0]?.getAttribute('lastClr');
  if(rgb&&/^[0-9a-f]{6}$/i.test(rgb))return '#'+rgb;
  if(sys&&/^[0-9a-f]{6}$/i.test(sys))return '#'+sys;
  if(scheme){const mapped:Record<string,string>={tx1:'dk1',bg1:'lt1',tx2:'dk2',bg2:'lt2'};return ctx.colors[mapped[scheme]??scheme]??fallback;}
  return fallback;
}
export function textBody(node:Element):Element|undefined{return one(node,NS.p,'txBody')??one(node,NS.a,'txBody');}
export function textValue(body:Element|undefined):string{
  if(!body)return '';
  return children(body).filter(e=>e.localName==='p'&&e.namespaceURI===NS.a).map(p=>children(p).map(r=>r.localName==='br'?'\n':all(r,NS.a,'t').map(t=>t.textContent??'').join('')).join('')).join('\n');
}
export function transform(node:Element):Element|undefined{return one(one(node,NS.p,'spPr'),NS.a,'xfrm')??one(node,NS.p,'xfrm')??one(one(node,NS.p,'grpSpPr'),NS.a,'xfrm');}
function placeholder(node:Element):Element|undefined{return one(one(one(node,NS.p,'nvSpPr'),NS.p,'nvPr'),NS.p,'ph');}
function inheritedShape(node:Element,doc:Document|null):Element|undefined{
  const ph=placeholder(node);if(!ph||!doc)return undefined;
  const idx=ph.getAttribute('idx')??'0',type=ph.getAttribute('type')??'body';
  return all(doc,NS.p,'sp').find(sp=>{const other=placeholder(sp);return other&&(other.getAttribute('idx')??'0')===idx&&(other.getAttribute('type')??'body')===type;})??all(doc,NS.p,'sp').find(sp=>{const other=placeholder(sp);return other&&(other.getAttribute('idx')??'0')===idx;});
}
function box(node:Element,fallback?:Element):Box{
  const xf=transform(node)??(fallback?transform(fallback):undefined),off=one(xf,NS.a,'off'),ext=one(xf,NS.a,'ext');
  return {x:cm(attrNumber(off,'x')),y:cm(attrNumber(off,'y')),w:cm(attrNumber(ext,'cx')),h:cm(attrNumber(ext,'cy'))};
}
function style(body:Element|undefined,ctx:ReadContext,fallback?:Element,role:ObjectRole='body',shape?:Element):TextStyle{
  const p=body?one(body,NS.a,'p'):undefined,ppr=one(p,NS.a,'pPr');
  const props=body?all(body,NS.a,'rPr')[0]??all(body,NS.a,'defRPr')[0]??all(body,NS.a,'endParaRPr')[0]:undefined;
  const fb=fallback?all(fallback,NS.a,'rPr')[0]??all(fallback,NS.a,'defRPr')[0]:undefined;
  const local=one(body,NS.a,'lstStyle'),lst=one(local,NS.a,`lvl${Math.min(9,attrNumber(ppr,'lvl')+1)}pPr`);
  const def=one(ppr,NS.a,'defRPr')??one(lst,NS.a,'defRPr')??fb;
  const face=one(props,NS.a,'ea')?.getAttribute('typeface')||one(props,NS.a,'latin')?.getAttribute('typeface')||one(def,NS.a,'ea')?.getAttribute('typeface')||one(def,NS.a,'latin')?.getAttribute('typeface')||(role==='title'?ctx.major:ctx.minor);
  const resolved=face.startsWith('+mj')?ctx.major:face.startsWith('+mn')?ctx.minor:face;
  const bodyPr=one(body,NS.a,'bodyPr'),within=one(ppr,NS.a,'lnSpc'),alignment=ppr?.getAttribute('algn');
  return {face:resolved,size:attrNumber(props,'sz',attrNumber(def,'sz',role==='title'?3200:1800))/100,bold:readXmlBoolean(props?.getAttribute('b')||def?.getAttribute('b')),
    color:color(props,ctx,color(def,ctx,color(one(one(shape,NS.p,'style'),NS.a,'fontRef'),ctx,'#263345'))),align:alignment==='ctr'?'center':alignment==='r'?'right':'left',lh:attrNumber(one(within,NS.a,'spcPct'),'val',100000)/100000,
    para:attrNumber(one(one(ppr,NS.a,'spcAft'),NS.a,'spcPts'),'val')/100,padV:cm(attrNumber(bodyPr,'tIns',45720)),padH:cm(attrNumber(bodyPr,'lIns',91440))};
}
function imageDimensions(bytes:Uint8Array,ext:string):{width:number;height:number}{
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(ext==='png'&&bytes.length>=24)return {width:v.getUint32(16),height:v.getUint32(20)};
  if(ext==='gif'&&bytes.length>=10)return {width:v.getUint16(6,true),height:v.getUint16(8,true)};
  if(['jpg','jpeg'].includes(ext)&&bytes[0]===255&&bytes[1]===216){let at=2;while(at+8<bytes.length){if(bytes[at]!==255){at++;continue;}const mark=bytes[at+1],len=v.getUint16(at+2);if([0xc0,0xc1,0xc2,0xc3].includes(mark))return {width:v.getUint16(at+7),height:v.getUint16(at+5)};if(len<2)break;at+=len+2;}}
  return {width:0,height:0};
}
async function readObject(node:Element,index:number,ctx:ReadContext,source:TemplateObject['source']):Promise<TemplateObject>{
  const layout=inheritedShape(node,ctx.layout),master=inheritedShape(layout??node,ctx.master),fallback=layout??master;
  const ph=placeholder(node),phType=ph?.getAttribute('type')??'',nv=all(node,NS.p,'cNvPr')[0],name=nv?.getAttribute('name')??`요소 ${index+1}`,kind=node.localName;
  const body=textBody(node),text=textValue(body),r=box(node,fallback),xf=transform(node)??(fallback?transform(fallback):undefined);
  let role:ObjectRole=['title','ctrTitle'].includes(phType)?'title':phType==='subTitle'?'sub':'body';
  const obj:TemplateObject={...r,id:`${ctx.path}#${index}`,name,kind:'unsupported',role:'keep',inferred:false,text,style:style(body,ctx,fallback,role,node),fill:color(one(node,NS.p,'spPr'),ctx,'transparent'),stroke:color(one(one(node,NS.p,'spPr'),NS.a,'ln'),ctx,'transparent'),geometry:all(node,NS.a,'prstGeom')[0]?.getAttribute('prst')??'rect',rotation:attrNumber(xf,'rot')/60000,cells:[],columnWidths:[],rowHeights:[],cellStyles:[],cellFills:[],imageData:'',imageWidth:0,imageHeight:0,crop:[0,0,0,0],reasons:[],notices:[],inherited:!transform(node)&&!!fallback,merged:false,index,source};
  if(r.w<=0||r.h<=0)obj.reasons.push('위치·크기를 확인할 수 없습니다. 레이아웃/마스터 상속이나 특수 좌표를 사용합니다.');
  if(obj.rotation!==0||readXmlBoolean(xf?.getAttribute('flipH'))||readXmlBoolean(xf?.getAttribute('flipV')))obj.reasons.push('회전/반전된 요소는 배치와 텍스트 기준이 달라 원본을 유지합니다.');
  if(readXmlBoolean(nv?.getAttribute('hidden')))obj.reasons.push('숨김 요소의 의도를 보존하기 위해 수정하지 않습니다.');
  if(source!=='slide')obj.notices.push('공유 디자인입니다. 공유 디자인 편집에서 변경을 예약하면 연결된 슬라이드 전체에 반영합니다.');
  if(kind==='grpSp'){
    if(source==='slide')obj.reasons.push('일반 Skill 적용에서는 그룹을 유지합니다.');
    else{obj.groupMembers=await readGroupMembers(node,index,ctx,source);obj.notices.push('그룹 구조·좌표·연결 관계를 보존하며 공유 디자인 편집에서 내부 요소별 서식을 변경할 수 있습니다.');}
  }
  else if(kind==='cxnSp')obj.reasons.push('연결선은 도형 연결 관계와 경로를 보존해야 하므로 유지합니다.');
  else if(kind==='sp'){
    obj.kind=text?'text':'shape';obj.role=text?role:'shape';
    if(!ph&&text){obj.inferred=true;if(/제목|title|사업명/i.test(name))role='title';else if(/리딩|subtitle|leading/i.test(name))role='sub';obj.role=role;}
    if(!ph&&text&&/페이지 정보|footer|바닥글|머리글|page.?number/i.test(name)){obj.role='keep';obj.inferred=true;obj.notices.push('요소 이름으로 페이지 정보/바닥글을 추정하여 유지합니다. 필요하면 적용 역할을 직접 바꾸세요.');}
    if(['dt','ftr','hdr','sldNum'].includes(phType)||all(node,NS.a,'fld').length){obj.role='keep';obj.reasons.push('날짜·페이지 번호·필드 또는 머리글/바닥글은 자동 갱신 내용을 보존합니다.');}
    const vert=one(body,NS.a,'bodyPr')?.getAttribute('vert');if(vert&&vert!=='horz')obj.reasons.push('세로쓰기/회전 텍스트는 가로쓰기 계산을 적용할 수 없습니다.');
    if(all(node,NS.a,'custGeom').length||!['rect','roundRect','ellipse'].includes(obj.geometry))obj.reasons.push('사용자 정의 또는 복잡한 도형의 경로를 보존합니다.');
    if(all(node,NS.a,'prstTxWarp').some(e=>e.getAttribute('prst')!=='textNoShape'))obj.reasons.push('WordArt 변형 텍스트의 효과와 공간 계산을 보존합니다.');
    if(body&&new Set(all(body,NS.a,'rPr').map(e=>`${e.getAttribute('sz')}/${e.getAttribute('b')}/${one(e,NS.a,'latin')?.getAttribute('typeface')}`)).size>1)obj.notices.push('혼합 크기·굵기가 있습니다. 적용하면 선택 역할의 글꼴·크기·굵기로 통일합니다. 색·링크·기울임은 유지합니다.');
  }else if(kind==='pic'){
    obj.kind='image';obj.role='image';
    const blip=all(node,NS.a,'blip')[0],embed=blip?.getAttributeNS(NS.r,'embed'),rel=ctx.rels.find(x=>x.id===embed);
    if(rel&&!rel.external){const target=relativePart(ctx.path,rel.target),ext=target.split('.').at(-1)?.toLowerCase()??'',entry=ctx.zip.file(target);
      if(entry&&['png','jpg','jpeg','gif'].includes(ext)){
        let cached=ctx.images.get(target);
        if(!cached){
          const bytes=await entry.async('uint8array'),dim=imageDimensions(bytes,ext);
          const preview=bytes.length<=TEMPLATE_LIMITS.previewImageBytes&&ctx.previewBudget.used+bytes.length<=TEMPLATE_LIMITS.previewTotalBytes&&dim.width*dim.height<=TEMPLATE_LIMITS.previewPixels;
          cached={...dim,data:preview?`data:image/${ext==='jpg'?'jpeg':ext};base64,${await entry.async('base64')}`:'',previewBytes:preview?bytes.length:0,notice:preview?'':'대용량 처리: 이미지 크기·해상도 또는 전체 미리보기 메모리 한도로 화면 표시만 생략합니다. 다운로드에는 원본 이미지가 보존되며 지원되는 위치·크기 규칙은 적용할 수 있습니다.'};
          ctx.previewBudget.used+=cached.previewBytes;ctx.images.set(target,cached);
        }
        obj.imageWidth=cached.width;obj.imageHeight=cached.height;obj.imageData=cached.data;if(cached.notice)obj.notices.push(cached.notice);
      }
      else obj.reasons.push('SVG/EMF/WMF 등 벡터 또는 읽을 수 없는 이미지는 파일을 보존하며 구조 미리보기에서 생략합니다.');
    }else obj.reasons.push('외부 연결 또는 누락된 이미지입니다. 네트워크로 불러오지 않고 원본 관계를 유지합니다.');
    if(obj.geometry!=='rect')obj.reasons.push('도형 마스크가 적용된 이미지는 자르기 형태를 유지합니다.');
    const crop=all(node,NS.a,'srcRect')[0];obj.crop=['l','t','r','b'].map(k=>attrNumber(crop,k)/100000) as TemplateObject['crop'];
    if(all(node,NS.p,'videoFile').length||all(node,NS.a,'videoFile').length)obj.reasons.push('동영상 포스터와 재생 관계를 보존합니다.');
  }else if(kind==='graphicFrame'){
    const tbl=all(node,NS.a,'tbl')[0];
    if(tbl){obj.kind='table';obj.role='table';const rows=children(tbl).filter(e=>e.localName==='tr');obj.cells=rows.map(row=>children(row).filter(e=>e.localName==='tc').map(cell=>textValue(textBody(cell))));obj.text=obj.cells.map(row=>row.join(' | ')).join('\n');obj.rowHeights=rows.map(row=>cm(attrNumber(row,'h')));obj.columnWidths=all(tbl,NS.a,'gridCol').map(col=>cm(attrNumber(col,'w')));obj.cellStyles=rows.map(row=>children(row).filter(e=>e.localName==='tc').map(cell=>{const st=style(textBody(cell),ctx),pr=one(cell,NS.a,'tcPr');return {...st,padH:cm(attrNumber(pr,'marL',91440)),padV:cm(attrNumber(pr,'marT',45720))};}));obj.cellFills=rows.map(row=>children(row).filter(e=>e.localName==='tc').map(cell=>color(one(cell,NS.a,'tcPr'),ctx,'#FFFFFF')));obj.style=obj.cellStyles[0]?.[0]??obj.style;obj.merged=all(tbl,NS.a,'tc').some(cell=>['gridSpan','rowSpan'].some(k=>attrNumber(cell,k,1)>1)||['hMerge','vMerge'].some(k=>readXmlBoolean(cell.getAttribute(k))));
      if(obj.merged)obj.notices.push('병합 셀: 글자·여백·정렬만 적용하며 행 높이/열 너비/분할은 원본을 유지합니다.');
      if(obj.cells.length>300||obj.columnWidths.length>50)obj.reasons.push('300행/50열을 넘는 표는 처리 범위를 벗어납니다.');
      if(!rows.length||!obj.columnWidths.length||obj.rowHeights.some(h=>h<=0)||obj.columnWidths.some(w=>w<=0))obj.reasons.push('행·열 개수 또는 크기가 올바르지 않은 표는 원본을 유지합니다.');
    }else{const uri=all(node,NS.a,'graphicData')[0]?.getAttribute('uri')??'';obj.reasons.push(uri.includes('chart')?'차트: 데이터·축·테마와 연결된 통합문서를 보존합니다.':uri.includes('diagram')?'SmartArt: 다이어그램 데이터와 생성된 도형 관계를 보존합니다.':'OLE/수식/미디어/기타 그래픽 프레임은 전용 편집기가 필요하여 원본을 유지합니다.');}
  }else if(kind!=='grpSp'&&kind!=='cxnSp')obj.reasons.push('지원하지 않는 요소 종류입니다. 원본 XML을 유지합니다.');
  if(obj.inherited)obj.notices.push('좌표를 레이아웃에서 상속합니다. 위치 규칙 적용 시 슬라이드에 좌표를 명시합니다.');
  return obj;
}

interface GroupMap {sx:number;sy:number;tx:number;ty:number;valid:boolean}
async function readGroupMembers(root:Element,rootIndex:number,ctx:ReadContext,source:TemplateObject['source']):Promise<GroupMember[]>{
  const members:GroupMember[]=[],rootId=`${ctx.path}#${rootIndex}`;
  let count=0;
  const walk=async(node:Element,path:number[],names:string[],parent:GroupMap,contextReasons:string[]):Promise<void>=>{
    if(path.length>12)throw new Error('그룹 중첩이 12단계를 넘어 분석할 수 없습니다.');
    const xf=transform(node),off=one(xf,NS.a,'off'),ext=one(xf,NS.a,'ext'),chOff=one(xf,NS.a,'chOff'),chExt=one(xf,NS.a,'chExt');
    const cx=cm(attrNumber(chExt,'cx')),cy=cm(attrNumber(chExt,'cy')),sx=cm(attrNumber(ext,'cx'))/cx,sy=cm(attrNumber(ext,'cy'))/cy;
    const nv=one(one(node,NS.p,'nvGrpSpPr'),NS.p,'cNvPr'),name=nv?.getAttribute('name')??'그룹';
    const hidden=readXmlBoolean(nv?.getAttribute('hidden'));
    const rotated=attrNumber(xf,'rot')!==0||readXmlBoolean(xf?.getAttribute('flipH'))||readXmlBoolean(xf?.getAttribute('flipV'));
    const valid=parent.valid&&!!xf&&cx>0&&cy>0&&sx>0&&sy>0&&Number.isFinite(sx)&&Number.isFinite(sy)&&!rotated;
    const map:GroupMap={sx:parent.sx*sx,sy:parent.sy*sy,tx:parent.tx+parent.sx*(cm(attrNumber(off,'x'))-cm(attrNumber(chOff,'x'))*sx),ty:parent.ty+parent.sy*(cm(attrNumber(off,'y'))-cm(attrNumber(chOff,'y'))*sy),valid};
    const restrictions=[...contextReasons,...(hidden?['상위 그룹이 숨김 상태입니다.']:[]),...(!valid?['상위 그룹의 회전·반전 또는 특수 좌표 때문에 크기·간격 계산을 제한합니다.']:[]),...(Math.abs(sx-1)>.0001||Math.abs(sy-1)>.0001?['상위 그룹이 확대·축소되어 크기·간격 계산을 제한합니다.']:[])];
    for(const [index,child] of children(node).filter(e=>!['nvGrpSpPr','grpSpPr','extLst'].includes(e.localName)).entries()){
      if(++count>3000)throw new Error('한 공유 그룹의 내부 요소가 3,000개를 넘습니다.');
      const nodePath=[...path,index],ancestors=[...names,name];
      if(child.localName==='grpSp'){await walk(child,nodePath,ancestors,map,restrictions);continue;}
      const object=await readObject(child,index,{...ctx,layout:null,master:null},source);
      const reasons=[...object.reasons];if(placeholder(child))reasons.push('그룹 안의 자리 표시자는 상속 관계를 보존합니다.');
      members.push({...object,reasons,id:`${rootId}/${nodePath.slice(1).join('/')}`,nodePath,ancestors,contextReasons:[...new Set(restrictions)],previewBox:valid?{x:map.tx+object.x*map.sx,y:map.ty+object.y*map.sy,w:object.w*map.sx,h:object.h*map.sy}:null,previewScale:valid?map.sy:1});
    }
  };
  await walk(root,[rootIndex],[],{sx:1,sy:1,tx:0,ty:0,valid:true},[]);
  return members;
}

export async function readTemplate(bytes:Uint8Array,filename:string,library:ZipLibrary,options:TemplateReadOptions={}):Promise<TemplateDocument>{
  checkPptxAbort(options.signal);
  options.onProgress?.('PPTX 압축 구조와 용량을 검사합니다.');
  const zip=await openPackage(bytes,library),pres=await xmlPart(zip,'ppt/presentation.xml');
  if(pres.documentElement.namespaceURI!==NS.p)throw new Error('Strict OOXML은 지원하지 않습니다. PowerPoint에서 일반 .pptx로 다시 저장하세요.');
  const size=all(pres,NS.p,'sldSz')[0],width=cm(attrNumber(size,'cx')),height=cm(attrNumber(size,'cy'));
  if(width<3||height<3||width>200||height>200)throw new Error('슬라이드 크기를 읽을 수 없거나 지원 범위(3~200cm)를 벗어납니다.');
  const presRels=await relationships(zip,'ppt/presentation.xml'),ids=all(pres,NS.p,'sldId');
  if(!ids.length||ids.length>200)throw new Error('1~200장의 PPTX를 선택하세요.');
  const slides:TemplateSlide[]=[],warnings:string[]=[],images=options.images??new Map<string,TemplateImage>(),previewBudget={used:[...images.values()].reduce((n,image)=>n+image.previewBytes,0)},sharedCache=new Map<string,TemplateObject[]>();
  for(const [index,id] of ids.entries()){
    checkPptxAbort(options.signal);
    if(options.onProgress){options.onProgress(`슬라이드 분석 ${index+1} / ${ids.length}장`);await new Promise<void>(resolve=>setTimeout(resolve,0));}
    const rel=presRels.find(r=>r.id===id.getAttributeNS(NS.r,'id'));if(!rel||rel.external)throw new Error(`${index+1}쪽 슬라이드 관계가 올바르지 않습니다.`);
    const path=relativePart('ppt/presentation.xml',rel.target),doc=await xmlPart(zip,path),rels=await relationships(zip,path),layoutRel=rels.find(r=>r.type==='slideLayout'&&!r.external);
    const layoutPath=layoutRel?relativePart(path,layoutRel.target):'',layout=layoutPath?await xmlPart(zip,layoutPath):null;
    const layoutRels=layoutPath?await relationships(zip,layoutPath):[],masterRel=layoutRels.find(r=>r.type==='slideMaster'&&!r.external),masterPath=masterRel?relativePart(layoutPath,masterRel.target):'',master=masterPath?await xmlPart(zip,masterPath):null;
    const masterRels=masterPath?await relationships(zip,masterPath):[],themeRel=masterRels.find(r=>r.type==='theme'&&!r.external),theme=themeRel?await xmlPart(zip,relativePart(masterPath,themeRel.target)):null;
    const colors:Record<string,string>={};for(const entry of theme?children(all(theme,NS.a,'clrScheme')[0]??theme.documentElement):[]){const rgb=children(entry)[0]?.getAttribute('val')??children(entry)[0]?.getAttribute('lastClr');if(rgb&&/^[0-9a-f]{6}$/i.test(rgb))colors[entry.localName]='#'+rgb;}
    const family=(type:string)=>{const font=theme?all(theme,NS.a,type)[0]:undefined;return font?(all(font,NS.a,'font').find(e=>e.getAttribute('script')==='Hang')?.getAttribute('typeface')||one(font,NS.a,'ea')?.getAttribute('typeface')||one(font,NS.a,'latin')?.getAttribute('typeface')||'맑은 고딕'):'맑은 고딕';};
    const ctx:ReadContext={zip,path,rels,colors,major:family('majorFont'),minor:family('minorFont'),layout,master,images,previewBudget};
    const tree=all(doc,NS.p,'spTree')[0];if(!tree)throw new Error(`${index+1}쪽 도형 목록이 없습니다.`);
    const nodes=children(tree).filter(e=>!['nvGrpSpPr','grpSpPr','extLst'].includes(e.localName));if(nodes.length>1000)throw new Error(`${index+1}쪽의 요소가 1,000개를 넘습니다.`);
    const objects:TemplateObject[]=[];for(const [i,node] of nodes.entries())objects.push(await readObject(node,i,ctx,'slide'));
    if(!objects.some(o=>o.role==='title')){const candidate=objects.filter(o=>o.kind==='text'&&o.role!=='keep'&&!o.reasons.length).sort((a,b)=>b.style.size-a.style.size||a.y-b.y)[0];if(candidate&&candidate.y<height*.35){candidate.role='title';candidate.inferred=true;}}
    const decorations:TemplateObject[]=[];
    for(const [source,shared,sharedPath] of [['master',master,masterPath],['layout',layout,layoutPath]] as const){
      if(!shared||!readXmlBoolean(doc.documentElement.getAttribute('showMasterSp'),true)||source==='master'&&!readXmlBoolean(layout?.documentElement.getAttribute('showMasterSp'),true))continue;
      const cached=sharedCache.get(sharedPath);if(cached){decorations.push(...cached);continue;}
      const sharedTree=all(shared,NS.p,'spTree')[0];if(!sharedTree)continue;
      const context={...ctx,path:sharedPath,rels:await relationships(zip,sharedPath),layout:null,master:null};
      // 자리 표시자를 건너뛰어도 원본 도형 목록의 인덱스를 유지합니다.
      const sharedObjects:TemplateObject[]=[];
      for(const [i,node] of children(sharedTree).filter(e=>!['nvGrpSpPr','grpSpPr','extLst'].includes(e.localName)).entries())if(!placeholder(node))sharedObjects.push(await readObject(node,i,context,source));
      sharedCache.set(sharedPath,sharedObjects);decorations.push(...sharedObjects);
    }
    const notes:string[]=[];
    if(rels.some(r=>r.external))notes.push('외부 링크가 있습니다. 링크는 보존하지만 미리보기에서 접속하지 않습니다.');
    if(all(doc,NS.p,'timing').length)notes.push('애니메이션이 있습니다. 객체 ID와 타이밍은 보존하며 분할은 적용하지 않습니다.');
    if(all(doc,NS.p,'transition').length)notes.push('화면 전환 효과는 원본을 유지합니다.');
    if(decorations.length)notes.push(`공유 디자인 ${decorations.length}개: 기본은 원본 유지이며, 공유 디자인 편집에서 별도로 변경할 수 있습니다.`);
    const bg=all(doc,NS.p,'bg')[0]??(layout?all(layout,NS.p,'bg')[0]:undefined)??(master?all(master,NS.p,'bg')[0]:undefined);
    if(bg&&all(bg,NS.a,'blipFill').length)notes.push('이미지 배경은 원본 파일에 보존됩니다. 구조 미리보기에는 단색으로 표시합니다.');
    slides.push({path,index,name:objects.find(o=>o.role==='title')?.text.slice(0,80)||`${index+1}쪽`,type:index===0?'cover':objects.some(o=>o.kind==='table')?'table':'body',objects,decorations,background:color(bg,ctx,'#FFFFFF'),warnings:notes,layoutPath,masterPath});
  }
  if(Object.keys(zip.files).some(p=>p.startsWith('ppt/embeddings/')))warnings.push('첨부 통합문서/OLE 파일을 수정하거나 실행하지 않고 원본 그대로 보존합니다.');
  if(Object.keys(zip.files).some(p=>p.startsWith('ppt/fonts/')))warnings.push('임베디드 글꼴은 보존하지만 새로 선택한 글꼴이 포함되지는 않습니다.');
  warnings.push('브라우저 비교는 텍스트·기본 도형·표·이미지의 구조 미리보기입니다. 차트/SmartArt/그룹·일부 효과·테마 상속은 PowerPoint에서 확인하세요.');
  if([...images.values()].some(image=>image.notice))warnings.push('대용량 이미지 일부는 메모리 사용을 줄이기 위해 미리보기를 생략했습니다. 원본 이미지 파일은 PPTX에 그대로 보존됩니다.');
  checkPptxAbort(options.signal);
  return {filename,bytes,zip,width,height,slides,warnings,images};
}
