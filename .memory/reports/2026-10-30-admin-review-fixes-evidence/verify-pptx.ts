import { readFile,writeFile } from "node:fs/promises";
import { DOMParser,XMLSerializer } from "@xmldom/xmldom";
import JSZip from "jszip";
import { DEFAULT_SKILL_RULES } from "@/config/skill-options";
import { readTemplate,transform } from "@/lib/pptx/template-read";
import { applyTemplate } from "@/lib/pptx/template-apply";
import { all,NS,parseXml,serialize,xmlPart } from "@/lib/pptx/pptx-xml";
import { loadZipLibrary } from "@/lib/pptx/zip";
import type { SkillEngineInput } from "@/lib/skills/schema";

async function main(){
  Object.assign(globalThis,{DOMParser,XMLSerializer});
  const base=await readFile("tests/fixtures/pptx/native-template.pptx"),lib=await loadZipLibrary();
  const skill:SkillEngineInput={...structuredClone(DEFAULT_SKILL_RULES),name:"재검증",short:"검증",desc:"",vis:{all:false,items:[]}};
  const reports:{attribute:string;value:string;shapePreserved:boolean;partsPreserved:number;status:string}[]=[];
  for(const attribute of ["hidden","flipH","flipV"])for(const value of ["1","true"]){
    const path="ppt/slides/slide2.xml",zip=await JSZip.loadAsync(base),xml=parseXml(await zip.file(path)!.async("string"),path),shape=all(xml,NS.p,"sp")[0];
    (attribute==="hidden"?all(shape,NS.p,"cNvPr")[0]:transform(shape)!).setAttribute(attribute,value);zip.file(path,serialize(xml));
    const bytes=await zip.generateAsync({type:"uint8array"}),doc=await readTemplate(bytes,"재검증.pptx",lib);
    const result=await applyTemplate(doc,skill,{layout:false,images:false,selectedSlides:[1],pageTypes:{},roles:{},excluded:[]},lib);
    const shapePreserved=serialize(all(await xmlPart(doc.zip,path),NS.p,"sp")[0])===serialize(all(await xmlPart(result.after.zip,path),NS.p,"sp")[0]);
    let partsPreserved=0;
    for(const [name,entry] of Object.entries(doc.zip.files))if(!entry.dir&&!result.modifiedParts.includes(name)){
      if(!Buffer.from(await entry.async("uint8array")).equals(Buffer.from(await result.after.zip.file(name)!.async("uint8array"))))throw new Error("원본 파트 변경: "+name);partsPreserved++;
    }
    const status=result.changes.find(change=>change.id===doc.slides[1].objects[0].id)?.status??"없음";
    if(!shapePreserved||status!=="skipped")throw new Error("숨김·반전 보존 실패");
    for(const [suffix,content] of [["input",bytes],["output",result.bytes]] as const)await writeFile(new URL(`./${attribute}-${value}-${suffix}.pptx`,import.meta.url),content);
    reports.push({attribute,value,shapePreserved,partsPreserved,status});
  }
  await writeFile(new URL("./pptx-preservation.json",import.meta.url),JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
}
void main();
