import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { applyTemplate } from "@/lib/pptx/template-apply";
import { readTemplate } from "@/lib/pptx/template-read";
import { all, NS, serialize, xmlPart } from "@/lib/pptx/pptx-xml";
import { setupXmlDom } from "./fixture";
import { preservedParts, transformFixture } from "./transform-fixture";
setupXmlDom();

describe("실제 PPT 변환", () => {
  it("문구·미수정 파트·원본을 보존하고 반복 적용 결과가 같다", async () => {
    const {doc,lib,options,skill}=await transformFixture("skill-comparison.pptx");
    const original=doc.bytes.slice();
    const result=await applyTemplate(doc,skill,options,lib);
    expect(result.changes.filter(c=>c.status==="changed").length).toBeGreaterThan(20);
    await preservedParts(doc,result); expect(doc.bytes).toEqual(original);
    const again=await applyTemplate(doc,skill,options,lib);
    expect(again.changes).toEqual(result.changes);
    for(const path of result.modifiedParts)expect(await again.after.zip.file(path)!.async("string")).toBe(await result.after.zip.file(path)!.async("string"));
  },15_000);
  it("미선택·제외와 차트·일반그룹·병합표를 보존한다",async()=>{
    const {doc,lib,options,skill}=await transformFixture();
    const result=await applyTemplate(doc,skill,{...options,excluded:[doc.slides[0].objects[0].id]},lib);
    await preservedParts(doc,result);
    expect(result.changes.find(c=>c.id===doc.slides[0].objects[0].id)?.status).toBe("kept");
    const before=await xmlPart(doc.zip,doc.slides[2].path),after=await xmlPart(result.after.zip,doc.slides[2].path);
    for(const tag of ["grpSp","graphicFrame"])expect(all(after,NS.p,tag).map(serialize)).toEqual(all(before,NS.p,tag).map(serialize));
    expect(result.after.slides[3].objects.find(o=>o.merged)?.columnWidths).toEqual(doc.slides[3].objects.find(o=>o.merged)?.columnWidths);
    const subset=await applyTemplate(doc,skill,{...options,selectedSlides:[0]},lib);
    expect(await subset.after.zip.file(doc.slides[1].path)!.async("string")).toBe(await doc.zip.file(doc.slides[1].path)!.async("string"));
  });
  it("배치 안내선을 생성하고 공간이 부족한 요소에는 제외 사유를 남긴다",async()=>{
    const {doc,lib,options,skill}=await transformFixture("skill-comparison.pptx");
    const moved=await applyTemplate(doc,skill,{...options,layout:true,images:true},lib);
    expect(moved.modifiedParts).toContain("ppt/viewProps.xml");
    skill.table.padV=.4;skill.table.rowH=1.2;skill.pt.table.body=18;
    const result=await applyTemplate(doc,skill,{...options,pageTypes:{4:"table"},selectedSlides:[4]},lib);
    expect(result.changes.some(c=>c.status==="skipped"&&c.details.some(d=>/겹|경계|공간/.test(d)))).toBe(true);
  });
  it("POTX를 PPTX로 변환한다",async()=>{
    const {doc,lib,options,skill}=await transformFixture();const zip=await JSZip.loadAsync(doc.bytes);
    zip.file("[Content_Types].xml",(await zip.file("[Content_Types].xml")!.async("string")).replace("presentationml.presentation.main+xml","presentationml.template.main+xml"));
    const potx=await readTemplate(await zip.generateAsync({type:"uint8array"}),"원본.potx",lib);
    const result=await applyTemplate(potx,skill,options,lib);
    expect(result.modifiedParts).toContain("[Content_Types].xml");expect(await result.after.zip.file("[Content_Types].xml")!.async("string")).toContain("presentationml.presentation.main+xml");
  });
  it("없는 대상·손상·진행 중 취소는 결과를 만들지 않는다",async()=>{
    const {doc,lib,options,skill}=await transformFixture();
    await expect(applyTemplate(doc,skill,{...options,roles:{missing:"body"}},lib)).rejects.toMatchObject({code:"VALIDATION"});
    const controller=new AbortController();
    await expect(applyTemplate(doc,skill,options,lib,message=>{if(message.includes("적용"))controller.abort();},controller.signal)).rejects.toMatchObject({code:"CANCELLED"});
    const zip=await JSZip.loadAsync(doc.bytes);zip.file(doc.slides[0].masterPath,"<!DOCTYPE test><broken>");
    await expect(applyTemplate({...doc,bytes:await zip.generateAsync({type:"uint8array"})},skill,options,lib)).rejects.toThrow();
  });
});
