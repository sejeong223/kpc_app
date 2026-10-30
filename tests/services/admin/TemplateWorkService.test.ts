import { expect,it } from "vitest";
import { applyTemplate } from "@/lib/pptx/template-apply";
import { loadZipLibrary } from "@/lib/pptx/zip";
import { fixtureFile,setupXmlDom } from "../../lib/pptx/fixture";
import { templateDraft } from "./asset-fixture";
import { auditQuery,reviseSkill,target,workHarness } from "./work-fixture";
setupXmlDom();
it("원본 변경은 기존 다운로드를 유지하고 명시적 최신 적용만 버전을 교체한다",async()=>{
  const h=await workHarness();const done=(await h.works.execute(h.otherActor,{type:"apply-work",target:target(h.view),mode:"pinned"}))!;
  expect(done.work.status).toBe("succeeded");const original=await h.works.download(h.otherActor,done.work.id,done.work.result!.id);
  await reviseSkill(h);const newer=await h.works.getWork(h.otherActor,done.work.id);
  expect(newer.newer.skill).toBe(true);expect(newer.work).toEqual(done.work);expect(newer.canDownload).toBe(true);
  expect((await h.works.download(h.otherActor,done.work.id,done.work.result!.id)).bytes).toEqual(original.bytes);
  const latest=(await h.works.execute(h.otherActor,{type:"apply-work",target:target(newer),mode:"latest"}))!;
  expect(latest.work.skill.revision).toBe(2);expect(latest.work.inputRevision).toBe(2);expect(latest.newer.skill).toBe(false);
  expect((await h.service.getAudit(h.superActor,{...auditQuery,action:"apply"})).rows.total).toBe(2);
},15_000);
it("비활성·삭제는 새 작업을 막되 기존 작업 재적용·다운로드를 유지한다",async()=>{
  const h=await workHarness();await h.service.executeAsset(h.departmentActor,{type:"set-asset-status",target:{id:h.skill.assetId,version:1},status:"inactive"});
  await h.service.executeAsset(h.departmentActor,{type:"delete-asset",target:{id:h.template.assetId,version:1}});
  await expect(h.works.execute(h.otherActor,{type:"create-work",templateId:h.template.assetId,skillId:h.skill.assetId})).rejects.toThrow();
  const view=await h.works.getWork(h.otherActor,h.view.work.id);expect(view.canApplyLatest).toBe(false);expect(view.canReapply).toBe(true);
  const done=(await h.works.execute(h.otherActor,{type:"apply-work",target:target(view),mode:"pinned"}))!;
  expect(done.canDownload).toBe(true);expect((await h.works.download(h.otherActor,done.work.id,done.work.result!.id)).bytes.length).toBeGreaterThan(0);
  await h.service.executeAsset(h.departmentActor,{type:"set-asset-visibility",target:{id:h.template.assetId,version:2},visibility:{all:false,targets:[]}});
  expect(h.works.canAccess(h.otherActor,done.work.id)).toBe(false);await expect(h.works.download(h.otherActor,done.work.id,done.work.result!.id)).rejects.toMatchObject({code:"FORBIDDEN"});
});
it("실패한 최신 재적용은 이전 성공 결과를 보존하고 직접 설정 수정은 결과를 만료시킨다",async()=>{
  let fail=false;
  const h=await workHarness(async(doc,skill,options,progress,signal)=>{if(fail)throw new Error("검증용 파일 오류");return applyTemplate(doc,skill,options,await loadZipLibrary(),progress,signal);});
  const done=(await h.works.execute(h.otherActor,{type:"apply-work",target:target(h.view),mode:"pinned"}))!;await reviseSkill(h);fail=true;
  const failed=(await h.works.execute(h.otherActor,{type:"apply-work",target:target(done),mode:"latest"}))!;
  expect(failed.work.status).toBe("failed");expect(failed.work.result).toEqual(done.work.result);expect(failed.work.skill).toEqual(done.work.skill);expect(failed.canDownload).toBe(true);
  const edited=(await h.works.execute(h.otherActor,{type:"update-work-options",target:target(failed),options:{...failed.work.options,layout:true}}))!;
  expect(edited.canDownload).toBe(false);await expect(h.works.download(h.otherActor,edited.work.id,done.work.result!.id)).rejects.toMatchObject({code:"CONFLICT"});
  await expect(h.works.execute(h.otherActor,{type:"apply-work",target:target(failed),mode:"pinned"})).rejects.toMatchObject({code:"CONFLICT"});
});
it("Template 파일 교체 시 기본 매핑으로 초기화하고 다른 사용자와 결과 ID 변조를 차단한다",async()=>{
  const h=await workHarness();const edited=(await h.works.execute(h.otherActor,{type:"update-work-options",target:target(h.view),options:{...h.view.work.options,layout:true,selectedSlides:[0]}}))!;
  const source=await h.service.importTemplate(h.departmentActor,await fixtureFile());
  await h.service.executeAsset(h.departmentActor,{type:"update-template",target:{id:h.template.assetId,version:1},status:"active",visibility:{all:true,targets:[]},value:templateDraft(source)});await reviseSkill(h);
  const done=(await h.works.execute(h.otherActor,{type:"apply-work",target:target(edited),mode:"latest"}))!;
  expect(done.work.template.revision).toBe(2);expect(done.work.skill.revision).toBe(2);expect(done.work.options.layout).toBe(false);expect(done.work.options.selectedSlides).toHaveLength(4);
  expect(h.files.getSource(h.source.id).document.slides).toHaveLength(4);
  await expect(h.works.getWork(h.departmentActor,done.work.id)).rejects.toMatchObject({code:"FORBIDDEN"});
  await expect(h.works.download(h.otherActor,done.work.id,"변조")).rejects.toMatchObject({code:"CONFLICT"});
  const preview=h.works.getPreview(h.otherActor,done.work.id,"before")!;preview.slides[0].name="조작";expect(h.works.getPreview(h.otherActor,done.work.id,"before")!.slides[0].name).not.toBe("조작");
  h.works.dispose();expect(h.works.canAccess(h.otherActor,done.work.id)).toBe(false);
});
it("동일 파일의 최신 매핑을 반영하되 작업의 배치 옵션은 유지한다",async()=>{
  const h=await workHarness();
  const edited=(await h.works.execute(h.otherActor,{type:"update-work-options",target:target(h.view),options:{...h.view.work.options,layout:true}}))!;
  await h.service.executeAsset(h.departmentActor,{type:"update-template",target:{id:h.template.assetId,version:1},status:"active",visibility:{all:true,targets:[]},value:{...templateDraft(h.source),pageTypes:{0:"body",1:"table",2:"body",3:"table"},excluded:[h.files.getSource(h.source.id).document.slides[0].objects[0].id]}});
  const done=(await h.works.execute(h.otherActor,{type:"apply-work",target:target(edited),mode:"latest"}))!;
  expect(done.work.options.layout).toBe(true);expect(done.work.options.pageTypes[0]).toBe("body");expect(done.work.options.excluded).toHaveLength(1);
  await expect(h.works.execute(h.otherActor,{type:"update-work-options",target:target(done),options:{...done.work.options,selectedSlides:[199]}})).rejects.toMatchObject({code:"VALIDATION"});
});
