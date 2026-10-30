import { expect,it } from "vitest";
import { all,NS,one,parseXml,readXmlBoolean,serialize,xmlPart } from "@/lib/pptx/pptx-xml";
import { readTemplate,transform } from "@/lib/pptx/template-read";
import { applyTemplate } from "@/lib/pptx/template-apply";
import { loadZipLibrary } from "@/lib/pptx/zip";
import { alteredFixture,setupXmlDom } from "./fixture";
import { engineSkill,preservedParts } from "./transform-fixture";
setupXmlDom();
it.each(["1","true"," true "])("참 표현 %s를 판독한다",value=>expect(readXmlBoolean(value)).toBe(true));
it.each(["0","false"," false "])("거짓 표현 %s는 기본값을 덮는다",value=>expect(readXmlBoolean(value,true)).toBe(false));
it.each([null,undefined,"","TRUE","invalid"])("누락·잘못된 표현 %s는 기본값을 따른다",value=>{expect(readXmlBoolean(value)).toBe(false);expect(readXmlBoolean(value,true)).toBe(true);});
it.each(["hidden","flipH","flipV"])("%s의 동등한 표현과 실제 출력 보존을 검사한다",async attribute=>{
  for(const value of ["1","true","0","false"]){
    const path="ppt/slides/slide2.xml";
    const bytes=await alteredFixture(async zip=>{
      const xml=parseXml(await zip.file(path)!.async("string"),path),shape=all(xml,NS.p,"sp")[0];
      const node=attribute==="hidden"?all(shape,NS.p,"cNvPr")[0]:transform(shape)!;
      expect(node).toBeDefined();node.setAttribute(attribute,value);zip.file(path,serialize(xml));
    });
    const lib=await loadZipLibrary(),doc=await readTemplate(bytes,"속성.pptx",lib),object=doc.slides[1].objects[0];
    const blocked=value==="1"||value==="true";
    expect(object.reasons.some(reason=>attribute==="hidden"?reason.includes("숨김"):reason.includes("반전"))).toBe(blocked);
    if(blocked){
      const result=await applyTemplate(doc,engineSkill(),{layout:false,images:false,selectedSlides:[1],pageTypes:{},roles:{},excluded:[]},lib);
      expect(result.changes.find(change=>change.id===object.id)?.status).toBe("skipped");
      expect(serialize(all(await xmlPart(result.after.zip,path),NS.p,"sp")[0])).toBe(serialize(all(await xmlPart(doc.zip,path),NS.p,"sp")[0]));
      await preservedParts(doc,result);
    }
  }
});
it.each(["true","1","false","0",null])("굵기 상속·병합·공유 표시 표현 %s",async value=>{
  const bytes=await alteredFixture(async zip=>{
    const path="ppt/slides/slide2.xml",xml=parseXml(await zip.file(path)!.async("string"),path);
    const body=all(all(xml,NS.p,"sp")[0],NS.p,"txBody")[0],paragraph=one(body,NS.a,"p")!;
    let props=one(paragraph,NS.a,"pPr");if(!props){props=xml.createElementNS(NS.a,"a:pPr");paragraph.insertBefore(props,paragraph.firstChild);}
    let def=one(props,NS.a,"defRPr");if(!def){def=xml.createElementNS(NS.a,"a:defRPr");props.appendChild(def);}def.setAttribute("b","true");
    for(const run of all(body,NS.a,"rPr")){run.removeAttribute("b");if(value!==null)run.setAttribute("b",value);}
    if(value!==null)xml.documentElement.setAttribute("showMasterSp",value);zip.file(path,serialize(xml));
    // 원본 fixture에는 일반 공유 도형이 없어 표시 여부를 검사할 도형을 넣는다.
    for(const layoutPath of Object.keys(zip.files).filter(name=>/^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(name))){
      const layout=parseXml(await zip.file(layoutPath)!.async("string"),layoutPath);
      const shared=layout.importNode(all(xml,NS.p,"sp")[0],true);
      for(const ph of all(shared,NS.p,"ph"))ph.parentNode!.removeChild(ph);
      all(layout,NS.p,"spTree")[0].appendChild(shared);zip.file(layoutPath,serialize(layout));
    }
    const tablePath="ppt/slides/slide4.xml",table=parseXml(await zip.file(tablePath)!.async("string"),tablePath);
    for(const cell of all(table,NS.a,"tc")){for(const attr of ["gridSpan","rowSpan","hMerge","vMerge"])cell.removeAttribute(attr);}
    const cells=all(table,NS.a,"tc");if(value!==null){cells[0].setAttribute("hMerge",value);cells[1].setAttribute("vMerge",value);}zip.file(tablePath,serialize(table));
  });
  const doc=await readTemplate(bytes,"판독.pptx",await loadZipLibrary()),truth=value==="true"||value==="1";
  expect(doc.slides[1].objects[0].style.bold).toBe(value===null||truth);
  expect(doc.slides[3].objects.some(object=>object.merged)).toBe(truth);
  if(value==="false"||value==="0")expect(doc.slides[1].decorations).toHaveLength(0);
  else expect(doc.slides[1].decorations.length).toBeGreaterThan(0);
});
