import { expect,it } from "vitest";
import { TemplateImportSession } from "@/lib/admin/assets/import-session";
import { createDemoTemplateFile } from "@/config/pptx-demo";
import type { StagedTemplateSource } from "@/types/admin-assets";
import { assetHarness,templateDraft } from "./asset-fixture";
import { deferred } from "./work-fixture";
import { fixtureFile,setupXmlDom } from "../../lib/pptx/fixture";
setupXmlDom();
it("예시 파일도 실제 분석하며 본인 staged와 현재 자산 파일만 미리보기 한다",async()=>{
  const h=assetHarness(),source=await h.service.importTemplate(h.departmentActor,createDemoTemplateFile());
  expect(source.byteLength).toBe(50079);expect(source.extraction.slideCount).toBe(4);
  expect(await h.service.getTemplatePreview(h.departmentActor,source.id)).not.toHaveProperty("bytes");
  await expect(h.service.getTemplatePreview(h.otherActor,source.id)).rejects.toMatchObject({code:"FORBIDDEN"});
  const asset=await h.service.executeAsset(h.departmentActor,{type:"create-template",ownerDepartmentId:h.departmentActor.departmentId,status:"active",visibility:{all:true,targets:[]},value:templateDraft(source)});
  expect((await h.service.getTemplatePreview(h.otherActor,source.id,asset.assetId)).slides).toHaveLength(4);
  const replaced=await h.service.importTemplate(h.departmentActor,await fixtureFile());
  await h.service.executeAsset(h.departmentActor,{type:"update-template",target:{id:asset.assetId,version:1},status:"active",visibility:{all:true,targets:[]},value:templateDraft(replaced)});
  await expect(h.service.getTemplatePreview(h.otherActor,source.id,asset.assetId)).rejects.toMatchObject({code:"FORBIDDEN"});expect(h.files.getSource(source.id).document.slides).toHaveLength(4);
});
it("새 파일 선택 뒤 늦게 끝난 이전 분석은 버리고 현재 파일만 유지한다",async()=>{
  const h=assetHarness(),session=new TemplateImportSession(id=>h.service.discardTemplateImport(h.departmentActor,id)),first=deferred<StagedTemplateSource>(),second=deferred<StagedTemplateSource>(),file=await fixtureFile();
  const one=await h.service.importTemplate(h.departmentActor,file),two=await h.service.importTemplate(h.departmentActor,file);
  const pendingFirst=session.select(file,()=>first.promise,()=>{}),pendingSecond=session.select(file,()=>second.promise,()=>{});
  second.resolve(two);expect((await pendingSecond)?.id).toBe(two.id);first.resolve(one);expect(await pendingFirst).toBeNull();expect(()=>h.files.getSource(one.id)).toThrow();expect(h.files.getSource(two.id)).toBeDefined();
  session.cancel();expect(h.files.getSource(two.id)).toBeDefined();session.clear();expect(()=>h.files.getSource(two.id)).toThrow();
});
it("권한 회수 뒤 읽기는 막고 본인 임시 파일은 정리할 수 있다",async()=>{
  const h=assetHarness(),source=await h.service.importTemplate(h.otherActor,await fixtureFile());
  await h.service.execute(h.superActor,{type:"set-user-status",targets:[{id:h.otherActor.userId,version:1}],status:"locked"});
  await expect(h.service.getTemplatePreview(h.otherActor,source.id)).rejects.toMatchObject({code:"INACTIVE_USER"});
  h.service.discardTemplateImport(h.otherActor,source.id);expect(()=>h.files.getSource(source.id)).toThrow();
});
it.each(["success","failure"] as const)("취소 후 늦은 %s와 진행은 새 업로드를 덮지 않는다",async outcome=>{
  const h=assetHarness(),discarded:string[]=[],messages:string[]=[],gate=deferred<void>(),file=await fixtureFile();
  const one=await h.service.importTemplate(h.departmentActor,file),two=await h.service.importTemplate(h.departmentActor,file);
  const session=new TemplateImportSession(id=>{discarded.push(id);h.service.discardTemplateImport(h.departmentActor,id);});
  const pending=session.select(file,async({onProgress})=>{onProgress("첫 분석");await gate.promise;onProgress("늦은 진행");if(outcome==="failure")throw new Error("늦은 실패");return one;},message=>messages.push(message));
  session.cancel();
  expect((await session.select(file,async()=>two,message=>messages.push(message)))?.id).toBe(two.id);
  gate.resolve();expect(await pending).toBeNull();expect(messages).toEqual(["첫 분석"]);
  expect(h.files.getSource(two.id)).toBeDefined();if(outcome==="success")expect(discarded).toContain(one.id);
  session.cancel();expect(h.files.getSource(two.id)).toBeDefined();session.clear();expect(()=>h.files.getSource(two.id)).toThrow();h.files.dispose();
});
