import { expect,it } from "vitest";
import { applyTemplate } from "@/lib/pptx/template-apply";
import { sharedDesigns } from "@/lib/pptx/shared-design";
import type { SharedDesignEdit } from "@/types/pptx-template";
import { setupXmlDom } from "./fixture";
import { preservedParts,transformFixture } from "./transform-fixture";
setupXmlDom();
it("공유 원본을 모든 연결 페이지에 반영하고 숨김과 일반 파트를 보존한다",async()=>{
  const {doc,lib,options,skill}=await transformFixture("shared-design.pptx");
  const label=sharedDesigns(doc).find(i=>i.object.name==="공유 안내 문구")!;
  expect(label.slides).toHaveLength(4);expect(label.visibleSlides).toEqual([0,1,2]);
  const result=await applyTemplate(doc,skill,{...options,selectedSlides:[],sharedEdits:[{id:label.id,position:null,fill:null,text:{...label.object.style,face:"Noto Sans KR",size:15,bold:true,color:"#9F2433",lh:1.2,para:3,padH:.1,padV:.1}}]},lib);
  expect(result.modifiedParts).toEqual([label.path]);
  for(const index of label.visibleSlides)expect(result.after.slides[index].decorations.find(o=>o.id===label.id)?.style.color.toUpperCase()).toBe("#9F2433");
  expect(result.after.slides[3].decorations).toHaveLength(0);await preservedParts(doc,result);
});
it("공간·경계·겹침 오류는 연결된 전체 공유 요소를 원복한다",async()=>{
  const {doc,lib,options,skill}=await transformFixture("shared-design.pptx");const catalog=sharedDesigns(doc);
  const label=catalog.find(i=>i.object.name==="공유 안내 문구")!,bar=catalog.find(i=>i.object.name==="공유 색상 띠")!;
  const edits:SharedDesignEdit[]=[{id:label.id,position:null,fill:null,text:{...label.object.style,size:150}},{id:bar.id,text:null,fill:null,position:{x:25,y:17,w:2,h:1}},{id:bar.id,text:null,fill:null,position:{x:2,y:2,w:15,h:5}}];
  for(const edit of edits){const result=await applyTemplate(doc,skill,{...options,selectedSlides:[],sharedEdits:[edit]},lib);expect(result.modifiedParts).toEqual([]);expect(result.changes.filter(c=>c.id===edit.id).every(c=>c.status==="skipped"&&c.details.length>0)).toBe(true);await preservedParts(doc,result);}
  await expect(applyTemplate(doc,skill,{...options,sharedEdits:[edits[0],edits[0]]},lib)).rejects.toThrow("중복");
});
