import { assetHarness,createSkill,templateDraft } from "./asset-fixture";
import { fixtureFile } from "../../lib/pptx/fixture";
import { TemplateWorkService,type WorkServiceOptions } from "@/services/admin/TemplateWorkService";
import type { WorkView } from "@/types/template-work";
import type { AuditQuery } from "@/types/admin";

export const auditQuery:AuditQuery={userSearch:"",targetSearch:"",action:"all",resource:"all",outcome:"all",from:"2026-10-01",to:"2026-10-20",page:1,pageSize:50,sortKey:"occurredAt",direction:"desc"};
export async function workHarness(apply?:WorkServiceOptions["apply"]) {
  const h=assetHarness(),source=await h.service.importTemplate(h.departmentActor,await fixtureFile());
  const template=await h.service.executeAsset(h.departmentActor,{type:"create-template",ownerDepartmentId:h.departmentActor.departmentId,status:"active",visibility:{all:true,targets:[]},value:templateDraft(source)});
  const skill=await createSkill(h.service,h.departmentActor);
  const works=new TemplateWorkService({host:h.service,files:h.files,actor:h.otherActor,apply});
  const view=(await works.execute(h.otherActor,{type:"create-work",templateId:template.assetId,skillId:skill.assetId}))!;
  return {...h,source,template,skill,works,view};
}
export const target=(view:WorkView)=>({id:view.work.id,version:view.work.version});
export async function reviseSkill(h:Awaited<ReturnType<typeof workHarness>>) {
  const detail=await h.service.getAsset(h.departmentActor,h.skill.assetId);if(detail.revision.kind!=="skill")throw new Error("fixture 오류");
  return h.service.executeAsset(h.departmentActor,{type:"update-skill",target:{id:detail.asset.id,version:detail.asset.version},status:"active",visibility:detail.asset.visibility,value:{name:detail.revision.name+" 수정",short:detail.revision.short,description:detail.revision.description,rules:detail.revision.rules}});
}
export function deferred<T>() {let resolve:(value:T)=>void=()=>{throw new Error("초기화 전");};const promise=new Promise<T>(done=>{resolve=done;});return {promise,resolve};}
