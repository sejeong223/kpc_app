import { expect,it } from "vitest";
import { applyTemplate } from "@/lib/pptx/template-apply";
import { loadZipLibrary } from "@/lib/pptx/zip";
import { setupXmlDom } from "../../lib/pptx/fixture";
import { auditQuery,deferred,reviseSkill,target,workHarness } from "./work-fixture";
setupXmlDom();
async function delayedHarness(){
  const started=deferred<void>(),finish=deferred<void>();
  const h=await workHarness(async(doc,skill,options)=>{const result=await applyTemplate(doc,skill,options,await loadZipLibrary());started.resolve();await finish.promise;return result;});
  const pending=h.works.execute(h.otherActor,{type:"apply-work",target:target(h.view),mode:"pinned"});await started.promise;
  return {...h,pending,finish};
}
it.each(["cancel","discard","role","dispose"] as const)("%s 뒤 늦은 응답은 결과와 성공 감사를 게시하지 않는다",async(kind)=>{
  const h=await delayedHarness();
  await expect(h.works.execute(h.otherActor,{type:"apply-work",target:target(h.view),mode:"pinned"})).rejects.toMatchObject({code:"CONFLICT"});
  if(kind==="role")h.works.setActor({...h.otherActor,role:"user"});
  else if(kind==="dispose")h.works.dispose();
  else await h.works.execute(h.otherActor,{type:kind==="cancel"?"cancel-work":"discard-work",id:h.view.work.id});
  h.finish.resolve();const result=await h.pending;expect(result?.work.result??null).toBeNull();
  expect((await h.service.getAudit(h.superActor,{...auditQuery,action:"apply"})).rows.total).toBe(0);
});
it.each(["acl","group","group-delete","read-grant","locked","department"] as const)("%s 변경 시 현재 권한을 재검사하고 출력과 미리보기를 차단한다",async(kind)=>{
  const h=await delayedHarness();
  if(kind==="acl")await h.service.executeAsset(h.departmentActor,{type:"set-asset-visibility",target:{id:h.template.assetId,version:1},visibility:{all:false,targets:[]}});
  else if(kind==="group"||kind==="group-delete"){
    await h.service.executeAsset(h.departmentActor,{type:"set-asset-visibility",target:{id:h.template.assetId,version:1},visibility:{all:false,targets:[{type:"group",id:"g-review"}]}});
    const group=(await h.service.getGroups(h.superActor,{search:"",page:1,pageSize:20})).items.find(g=>g.id==="g-review")!;
    if(kind==="group-delete")await h.service.execute(h.superActor,{type:"delete-group",target:{id:group.id,version:group.version}});
    else await h.service.execute(h.superActor,{type:"update-group",target:{id:group.id,version:group.version},value:{name:group.name,memberIds:group.memberIds.filter(id=>id!==h.otherActor.userId)}});
  }else if(kind==="read-grant"){
    const rows=await h.service.getRoleGrants(h.superActor);
    rows.find(row=>row.role==="department_admin")!.grants.templates={create:false,read:false,update:false,delete:false};
    const access=await h.service.getAccess(h.superActor);
    await h.service.execute(h.superActor,{type:"save-grants",permissionRevision:access.permissionRevision,rows});
  }else if(kind==="locked")await h.service.execute(h.superActor,{type:"set-user-status",targets:[{id:h.otherActor.userId,version:1}],status:"locked"});
  else h.works.setActor({...h.otherActor,departmentId:"d-product"});
  h.finish.resolve();expect(await h.pending).toBeNull();expect(h.works.canAccess(h.otherActor,h.view.work.id)).toBe(false);
  expect(()=>h.works.getPreview(h.otherActor,h.view.work.id,"after")).toThrow();
  expect((await h.service.getAudit(h.superActor,{...auditQuery,action:"apply"})).rows.total).toBe(0);
});
it("실행 중 새 버전이 생겨도 캡처한 입력을 유지하고 새 버전 알림을 남긴다",async()=>{
  const h=await delayedHarness();await reviseSkill(h);h.finish.resolve();const result=(await h.pending)!;
  expect(result.work.skill.revision).toBe(1);expect(result.newer.skill).toBe(true);expect(result.canDownload).toBe(true);
  expect((await h.works.getWorks(h.otherActor))).toHaveLength(1);expect((await h.service.getAudit(h.superActor,{...auditQuery,action:"apply"})).rows.total).toBe(1);
});
