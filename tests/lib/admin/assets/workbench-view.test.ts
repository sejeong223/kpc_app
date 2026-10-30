import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect,it,vi } from "vitest";
import { TemplateWorkService } from "@/services/admin/TemplateWorkService";
import TemplateResultsPanel from "@/components/admin/templates/workbench/TemplateResultsPanel";
import TemplateSlidePreview from "@/components/admin/templates/workbench/TemplateSlidePreview";
import { clearPptxDownloads,downloadPptxBytes } from "@/lib/pptx/download";
import { assetHarness,createSkill,templateDraft } from "../../../services/admin/asset-fixture";
import { fixtureBytes,setupXmlDom } from "../../pptx/fixture";
import { target,workHarness } from "../../../services/admin/work-fixture";
setupXmlDom();
it("공유 변경은 작업에만 저장되고 결과에 부모·내부 사유를 함께 표시한다",async()=>{
  const h=assetHarness(),source=await h.service.importTemplate(h.departmentActor,new File([new Uint8Array(await fixtureBytes("shared-groups.pptx")).buffer],"공유.pptx"));
  const template=await h.service.executeAsset(h.departmentActor,{type:"create-template",ownerDepartmentId:h.departmentActor.departmentId,status:"active",visibility:{all:true,targets:[]},value:templateDraft(source)}),skill=await createSkill(h.service,h.departmentActor);
  const works=new TemplateWorkService({host:h.service,files:h.files,actor:h.otherActor});const created=(await works.execute(h.otherActor,{type:"create-work",templateId:template.assetId,skillId:skill.assetId}))!;
  const root=works.getSharedDesigns(h.otherActor,created.work.id).find(item=>item.object.name==="공유 그룹 보존")!,leaf=root.members.find(item=>item.object.name==="그룹 사각형")!;
  const edited=(await works.execute(h.otherActor,{type:"update-work-options",target:target(created),options:{...created.work.options,selectedSlides:[],sharedEdits:[{id:leaf.id,position:null,fill:null,text:{...leaf.object.style,color:"#C4263E"},textMode:"appearance",textFields:["color"]}]}}))!;
  const done=(await works.execute(h.otherActor,{type:"apply-work",target:target(edited),mode:"pinned"}))!;expect(done.work.status).toBe("succeeded");expect((await h.service.getAsset(h.departmentActor,template.assetId)).asset.currentRevision).toBe(1);
  const before=works.getPreview(h.otherActor,done.work.id,"before")!,after=works.getPreview(h.otherActor,done.work.id,"after"),changes=works.getChanges(h.otherActor,done.work.id);
  const html=renderToStaticMarkup(createElement(TemplateResultsPanel,{before,after,changes,warnings:done.work.result!.warnings}));expect(html).toContain("그룹 내부 결과");expect(html).toContain("PowerPoint와 동일한 화면이 아닙니다");
  await h.service.executeAsset(h.departmentActor,{type:"set-asset-visibility",target:{id:template.assetId,version:1},visibility:{all:false,targets:[]}});expect(()=>works.getSharedDesigns(h.otherActor,done.work.id)).toThrow();works.dispose();
});
it("미리보기는 PPT 문구를 HTML로 실행하거나 외부 이미지를 로드하지 않는다",async()=>{
  const h=await workHarness(),preview=h.works.getPreview(h.otherActor,h.view.work.id,"before")!;
  preview.slides[0].objects[0].text="<script>alert('주입')</script>";
  const text=renderToStaticMarkup(createElement(TemplateSlidePreview,{document:preview,slideIndex:0,selectedObjectId:null,onSelect:()=>{}}));expect(text).toContain("&lt;script&gt;");expect(text).not.toContain("<script>");
  const object=preview.slides[0].objects[0];object.kind="image";object.imageData="https://external.invalid/tracking.png";
  expect(renderToStaticMarkup(createElement(TemplateSlidePreview,{document:preview,slideIndex:0,selectedObjectId:null,onSelect:()=>{}}))).not.toContain("external.invalid");h.works.dispose();
});
it("다운로드 파일명을 정리하고 URL을 지연 또는 화면 정리 시 해제한다",()=>{
  vi.useFakeTimers();const create=vi.spyOn(URL,"createObjectURL").mockReturnValue("blob:output"),revoke=vi.spyOn(URL,"revokeObjectURL").mockImplementation(()=>{}),anchor={href:"",download:"",click:vi.fn(),remove:vi.fn()};
  vi.stubGlobal("document",{createElement:()=>anchor,body:{appendChild:vi.fn()}});
  try{downloadPptxBytes(new Uint8Array([1,2,3]),"../결과\n.potx");expect(anchor.download).toBe("..결과.pptx");expect(anchor.click).toHaveBeenCalledOnce();expect(create.mock.calls[0][0]).toMatchObject({type:"application/vnd.openxmlformats-officedocument.presentationml.presentation"});expect(revoke).not.toHaveBeenCalled();vi.advanceTimersByTime(1000);expect(revoke).toHaveBeenCalledOnce();downloadPptxBytes(new Uint8Array([4]),"결과");clearPptxDownloads();expect(revoke).toHaveBeenCalledTimes(2);}
  finally{clearPptxDownloads();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();}
});
