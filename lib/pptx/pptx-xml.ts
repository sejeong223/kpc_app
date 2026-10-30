import type {ZipArchive,ZipLibrary} from './zip';
import {TEMPLATE_LIMITS} from './limits';

export const NS={a:'http://schemas.openxmlformats.org/drawingml/2006/main',p:'http://schemas.openxmlformats.org/presentationml/2006/main',r:'http://schemas.openxmlformats.org/officeDocument/2006/relationships',rel:'http://schemas.openxmlformats.org/package/2006/relationships',ct:'http://schemas.openxmlformats.org/package/2006/content-types'} as const;
export function children(node:Node):Element[]{return Array.from(node.childNodes).filter((n):n is Element=>n.nodeType===1);}
export function one(node:Node|undefined|null,ns:string,name:string):Element|undefined{return node?children(node).find(e=>e.namespaceURI===ns&&e.localName===name):undefined;}
export function all(node:Document|Element,ns:string,name:string):Element[]{return Array.from(node.getElementsByTagNameNS(ns,name));}
export function parseXml(text:string,label:string):Document{
  if(text.length>12000000)throw new Error(`${label}: XML 크기 제한(12MB)을 초과했습니다.`);
  if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error(`${label}: 외부 엔터티/DTD를 포함한 XML은 지원하지 않습니다.`);
  const doc=new DOMParser().parseFromString(text,'application/xml');
  if(!doc.documentElement||doc.getElementsByTagName('parsererror').length)throw new Error(`${label}: XML 형식을 읽을 수 없습니다.`);
  return doc;
}
export const serialize=(doc:Node):string=>new XMLSerializer().serializeToString(doc);
export function ensure(parent:Element,prefix:'a'|'p',name:string,order:readonly string[]=[]):Element{
  const existing=one(parent,NS[prefix],name);if(existing)return existing;
  const e=parent.ownerDocument.createElementNS(NS[prefix],`${prefix}:${name}`),index=order.indexOf(name);
  const later=children(parent).find(c=>order.indexOf(c.localName)>index&&index>=0);
  parent.insertBefore(e,later??null);return e;
}
export function removeChildren(parent:Element,ns:string,names:readonly string[]):void{for(const e of children(parent))if(e.namespaceURI===ns&&names.includes(e.localName))parent.removeChild(e);}
export const attrNumber=(node:Element|undefined,name:string,fallback=0):number=>{const raw=node?.getAttribute(name);return raw!==null&&raw!==undefined&&raw!==''&&Number.isFinite(Number(raw))?Number(raw):fallback;};
export function relativePart(owner:string,target:string):string{
  if(/[\\?#]/.test(target)||/^\w+:/.test(target))throw new Error('내부 파일 경로가 올바르지 않습니다.');
  const stack=target.startsWith('/')?[]:owner.split('/').slice(0,-1);
  for(const part of target.split('/')){if(!part||part==='.')continue;if(part==='..'){if(!stack.length)throw new Error('PPT 패키지 경계를 벗어난 관계입니다.');stack.pop();}else stack.push(part);}
  return stack.join('/');
}
export const relPath=(part:string):string=>{const x=part.split('/');return [...x.slice(0,-1),'_rels',x.at(-1)+'.rels'].join('/');};
export interface Relationship {id:string;type:string;target:string;external:boolean}
export async function relationships(zip:ZipArchive,part:string):Promise<Relationship[]>{
  const entry=zip.file(relPath(part));if(!entry)return [];
  const doc=parseXml(await entry.async('string'),relPath(part));
  return all(doc,NS.rel,'Relationship').map(e=>({id:e.getAttribute('Id')??'',type:(e.getAttribute('Type')??'').split('/').at(-1)??'',target:e.getAttribute('Target')??'',external:e.getAttribute('TargetMode')==='External'}));
}
export async function xmlPart(zip:ZipArchive,name:string):Promise<Document>{const entry=zip.file(name);if(!entry)throw new Error(`필수 PPT 구성 파일이 없습니다: ${name}`);return parseXml(await entry.async('string'),name);}

// 압축 해제 전에 중앙 디렉터리의 크기를 검사해 과도한 메모리 사용을 막습니다.
export function validateZip(bytes:Uint8Array):void{
  if(bytes.length>TEMPLATE_LIMITS.fileBytes)throw new Error(`파일은 ${TEMPLATE_LIMITS.fileMB}MB 이내로 선택하세요.`);
  if(bytes.length<22)throw new Error('PPTX ZIP 형식이 아닙니다. 암호화된 PPT와 구형 .ppt는 지원하지 않습니다.');
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(v.getUint32(i,true)===0x06054b50&&i+22+v.getUint16(i+20,true)===bytes.length){end=i;break;}
  if(end<0)throw new Error('PPTX ZIP 구조를 읽을 수 없습니다. 암호를 해제하고 .pptx로 저장하세요.');
  const count=v.getUint16(end+10,true),offset=v.getUint32(end+16,true),length=v.getUint32(end+12,true);
  if(v.getUint16(end+4,true)||v.getUint16(end+6,true)||count===65535||offset===0xffffffff||count>10000||offset+length>end)throw new Error('분할 ZIP/ZIP64 또는 지나치게 큰 PPTX는 지원하지 않습니다.');
  let p=offset,total=0;const names=new Set<string>();
  for(let i=0;i<count;i++){
    if(p+46>end||v.getUint32(p,true)!==0x02014b50)throw new Error('PPTX 파일 목록이 손상되었습니다.');
    const packed=v.getUint32(p+20,true),size=v.getUint32(p+24,true),nameLength=v.getUint16(p+28,true),extra=v.getUint16(p+30,true),comment=v.getUint16(p+32,true);
    if(v.getUint16(p+8,true)&1)throw new Error('암호화된 ZIP은 지원하지 않습니다.');
    if(size===0xffffffff||size>TEMPLATE_LIMITS.partBytes)throw new Error(`압축 해제 후 단일 구성 파일은 ${TEMPLATE_LIMITS.partMB}MB 이내여야 합니다.`);
    if(size>Math.max(1,packed)*1500)throw new Error('압축 비율이 과도한 구성 파일이 포함되어 있습니다.');
    total+=size;if(total>TEMPLATE_LIMITS.expandedBytes)throw new Error(`압축 해제 합계는 ${TEMPLATE_LIMITS.expandedMB}MB 이내여야 합니다.`);
    const name=new TextDecoder().decode(bytes.slice(p+46,p+46+nameLength));
    if(name.includes('..')||name.includes('\\')||name.startsWith('/'))throw new Error('비정상적인 ZIP 경로를 포함하고 있습니다.');
    if(names.has(name))throw new Error('같은 경로의 파일이 중복된 PPTX는 지원하지 않습니다.');names.add(name);
    p+=46+nameLength+extra+comment;if(p>end)throw new Error('PPTX 파일 목록의 범위가 올바르지 않습니다.');
  }
  if(p!==offset+length)throw new Error('PPTX 중앙 디렉터리가 올바르지 않습니다.');
}
export async function openPackage(bytes:Uint8Array,lib:ZipLibrary):Promise<ZipArchive>{
  validateZip(bytes);const zip=await lib.loadAsync(bytes);
  if(Object.keys(zip.files).some(p=>p.startsWith('_xmlsignatures/')||/vbaProject\.bin$/i.test(p)))throw new Error('전자서명 또는 VBA 매크로가 포함된 파일입니다. 서명/매크로 없는 사본을 .pptx로 저장하세요.');
  const types=await xmlPart(zip,'[Content_Types].xml');
  if(!all(types,NS.ct,'Override').some(e=>e.getAttribute('PartName')==='/ppt/presentation.xml'&&['application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml','application/vnd.openxmlformats-officedocument.presentationml.template.main+xml'].includes(e.getAttribute('ContentType')??'')))throw new Error('일반 .pptx/.potx 형식만 지원합니다. 구형 .ppt, 매크로 파일, Strict OOXML은 변환 후 사용하세요.');
  return zip;
}
