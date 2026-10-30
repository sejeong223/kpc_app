import { expect,it } from "vitest";
import { applyTemplate } from "@/lib/pptx/template-apply";
import JSZip from "jszip";
import { readTemplate } from "@/lib/pptx/template-read";
import { sharedDesigns,canEditShared,type SharedDesign } from "@/lib/pptx/shared-design";
import { SharedDesignEditSchema } from "@/lib/pptx/shared-schema";
import { all,NS,serialize,xmlPart } from "@/lib/pptx/pptx-xml";
import { parseXml } from "@/lib/pptx/pptx-xml";
import type { SharedDesignEdit } from "@/types/pptx-template";
import { setupXmlDom } from "./fixture";
import { preservedParts,transformFixture } from "./transform-fixture";
setupXmlDom();
const appearance=(item:SharedDesign,fields:SharedDesignEdit["textFields"]=["face","bold","color"]):SharedDesignEdit=>({id:item.id,position:null,fill:null,text:{...item.object.style,face:"Noto Sans KR",bold:true,color:"#C4263E"},textMode:"appearance",textFields:fields});
it("중첩·회전 그룹의 허용 서식만 바꾸고 구조·좌표·문구를 보존한다",async()=>{
  const {doc,lib,options,skill}=await transformFixture("shared-groups.pptx");
  const root=sharedDesigns(doc).find(i=>i.object.name==="공유 그룹 보존")!;
  const leaf=root.members.find(i=>i.object.name==="그룹 사각형")!,nested=root.members.find(i=>i.object.name==="중첩 텍스트")!,rotated=root.members.find(i=>i.object.name==="회전 텍스트 색상")!,hidden=root.members.find(i=>i.object.name==="숨김 내부 텍스트")!;
  expect(canEditShared(hidden)).toBe(false);expect(nested.nodePath).toHaveLength(3);
  const result=await applyTemplate(doc,skill,{...options,selectedSlides:[],sharedEdits:[appearance(leaf,["face"]),appearance(nested),appearance(rotated,["color"]),{...appearance(root.members[1]),textMode:"full",text:{...root.members[1].object.style,size:180}}]},lib);
  const next=sharedDesigns(result.after).find(i=>i.id===root.id)!;
  expect(next.members.find(i=>i.id===leaf.id)?.object.style).toEqual({...leaf.object.style,face:"Noto Sans KR"});
  expect(next.members.find(i=>i.id===nested.id)?.object.style.color.toUpperCase()).toBe("#C4263E");
  const report=result.changes.find(c=>c.id===root.id)!;expect(report.children?.filter(c=>c.status==="changed")).toHaveLength(3);expect(report.children?.filter(c=>c.status==="skipped")).toHaveLength(1);
  const before=await xmlPart(doc.zip,root.path),after=await xmlPart(result.after.zip,root.path);
  for(const [ns,tag] of [[NS.a,"xfrm"],[NS.a,"t"],[NS.p,"cNvPr"]])expect(all(after,ns,tag).map(serialize)).toEqual(all(before,ns,tag).map(serialize));
  await preservedParts(doc,result);
  const small={...appearance(leaf),text:{...leaf.object.style,size:2,lh:6,padV:11}};expect(SharedDesignEditSchema.safeParse(small).success).toBe(true);expect(SharedDesignEditSchema.safeParse({...small,textMode:"full"}).success).toBe(false);
});
it("그룹 내부와 상위의 숨김 true도 공유 편집을 차단한다",async()=>{
  const {doc,lib}=await transformFixture("shared-groups.pptx");
  const root=sharedDesigns(doc).find(item=>item.object.name==="공유 그룹 보존")!;
  const zip=await JSZip.loadAsync(doc.bytes),original=await zip.file(root.path)!.async("string");
  zip.file(root.path,original.replace(/hidden="1"/g,'hidden="true"'));
  const changed=await readTemplate(await zip.generateAsync({type:"uint8array"}),"숨김.pptx",lib);
  const hidden=sharedDesigns(changed).find(item=>item.id===root.id)!.members.find(item=>item.object.name==="숨김 내부 텍스트")!;
  expect(canEditShared(hidden)).toBe(false);
  for(const value of ["1","true"]){
    const xml=parseXml(original,root.path),group=all(xml,NS.p,"grpSp").find(node=>all(node,NS.p,"cNvPr")[0].getAttribute("name")==="공유 그룹 보존")!;
    all(group,NS.p,"cNvPr")[0].setAttribute("hidden",value);zip.file(root.path,serialize(xml));
    const next=sharedDesigns(await readTemplate(await zip.generateAsync({type:"uint8array"}),"상위숨김.pptx",lib)).find(item=>item.id===root.id)!;
    expect(next.members.every(item=>!canEditShared(item))).toBe(true);
  }
});
