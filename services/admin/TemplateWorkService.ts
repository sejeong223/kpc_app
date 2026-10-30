import { AdminDataError,validationError } from "@/lib/admin/errors";
import { IdSchema } from "@/lib/admin/record-schema";
import { TemplateWorkSchema,WorkCommandSchema } from "@/lib/admin/assets/work-schemas";
import { assetRef,buildDefaultOptions,canDownloadWork,resolveLatestCandidates,resolveReapplyOptions } from "@/lib/admin/assets/work-policy";
import { toEngineSkill } from "@/lib/pptx/skill-adapter";
import { PptxError,safePptxFilename } from "@/lib/pptx/errors";
import { validateOptionsForDocument } from "@/lib/pptx/options-schema";
import { sharedDesigns } from "@/lib/pptx/shared-design";
import type { SkillEngineInput } from "@/lib/skills/schema";
import type { AdminActor } from "@/types/admin";
import type { AssetRuntimeHost,ResolvedAsset } from "@/types/admin-assets";
import type { TemplateDocument,TemplateOptions,TemplateProgress,TemplateResult } from "@/types/pptx-template";
import type { TemplateWork,TemplateWorkDataService,WorkCommand,WorkView } from "@/types/template-work";
import type { TemplateFileStore } from "./TemplateFileStore";

export interface WorkServiceOptions {
  host:AssetRuntimeHost;files:TemplateFileStore;actor:AdminActor;createId?:()=>string;
  apply?:(source:TemplateDocument,skill:SkillEngineInput,options:TemplateOptions,onProgress:TemplateProgress,signal:AbortSignal)=>Promise<TemplateResult>;
}
interface Entry { work:TemplateWork;fileRefId:string;output:TemplateResult|null;run:{controller:AbortController;token:symbol}|null }
const actorKey=(actor:AdminActor)=>JSON.stringify([actor.userId,actor.role,actor.departmentId]);
const defaultApply:NonNullable<WorkServiceOptions["apply"]>=async(source,skill,options,onProgress,signal)=>{
  const [{applyTemplate},{loadZipLibrary}]=await Promise.all([import("@/lib/pptx/template-apply"),import("@/lib/pptx/zip")]);
  return applyTemplate(source,skill,options,await loadZipLibrary(),onProgress,signal);
};

export class TemplateWorkService implements TemplateWorkDataService {
  private readonly entries=new Map<string,Entry>();
  private readonly listeners=new Set<()=>void>();
  private readonly unsubscribe:()=>void;
  private readonly apply:NonNullable<WorkServiceOptions["apply"]>;
  private readonly createId:()=>string;
  private actor:AdminActor;
  private revision=0;
  private disposed=false;
  constructor(private readonly context:WorkServiceOptions) {
    this.actor={...context.actor};this.apply=context.apply??defaultApply;this.createId=context.createId??(()=>crypto.randomUUID());
    this.unsubscribe=context.host.subscribe(()=>{
      for(const entry of this.entries.values())if(entry.run&&!this.canAccess(this.actor,entry.work.id))this.stop(entry,"FORBIDDEN","현재 권한으로 이 작업을 계속할 수 없습니다.");
      this.emit();
    });
  }
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  getRevision=()=>this.revision;
  private emit(){this.revision++;for(const listener of this.listeners)listener();}
  private assertActor(actor:AdminActor){if(this.disposed||actorKey(actor)!==actorKey(this.actor))throw new AdminDataError("FORBIDDEN","현재 사용자와 작업 실행 사용자가 다릅니다.");}
  private owned(actor:AdminActor,id:string):Entry {
    this.assertActor(actor);const parsed=IdSchema.safeParse(id);if(!parsed.success)throw validationError(parsed.error);
    const entry=this.entries.get(parsed.data);if(!entry)throw new AdminDataError("NOT_FOUND","작업을 찾을 수 없습니다.");
    if(entry.work.ownerId!==actor.userId)throw new AdminDataError("FORBIDDEN","다른 사용자의 작업입니다.");return entry;
  }
  private resolve(actor:AdminActor,entry:Entry){
    return {template:this.context.host.resolveAsset(actor,entry.work.template,"existing"),skill:this.context.host.resolveAsset(actor,entry.work.skill,"existing")};
  }
  canAccess(actor:AdminActor,id:string):boolean {try{this.resolve(actor,this.owned(actor,id));return true;}catch{return false;}}
  private accessible(actor:AdminActor,id:string){const entry=this.owned(actor,id);this.resolve(actor,entry);return entry;}
  private view(actor:AdminActor,entry:Entry):WorkView {
    const current=this.resolve(actor,entry);let canApplyLatest=false;
    try{resolveLatestCandidates(this.context.host,actor,entry.work);canApplyLatest=!entry.run;}catch{/* 비활성·삭제 자산도 고정 버전은 유지한다. */}
    return {work:structuredClone(entry.work),fileRefId:entry.fileRefId,templateName:current.template.revision.name,skillName:current.skill.revision.name,newer:{template:current.template.asset.currentRevision>entry.work.template.revision,skill:current.skill.asset.currentRevision>entry.work.skill.revision},canReapply:!entry.run,canApplyLatest,canDownload:canDownloadWork(entry.work,true)};
  }
  async getWorks(actor:AdminActor){this.assertActor(actor);await this.context.host.getAccess(actor);return [...this.entries.values()].filter(e=>this.canAccess(actor,e.work.id)).map(entry=>{const view=this.view(actor,entry);return {id:entry.work.id,createdAt:entry.work.createdAt,updatedAt:entry.work.updatedAt,status:entry.work.status,templateName:view.templateName,skillName:view.skillName};});}
  getWorkSnapshot(actor:AdminActor,id:string){return this.view(actor,this.accessible(actor,id));}
  async getWork(actor:AdminActor,id:string){return this.getWorkSnapshot(actor,id);}
  private stop(entry:Entry,code:"CANCELLED"|"FORBIDDEN",message:string){entry.run?.controller.abort();entry.run=null;entry.work.status="cancelled";entry.work.progress="";entry.work.error={code,message};entry.work.version++;}
  private checkRun(actor:AdminActor,entry:Entry,token:symbol,inputRevision:number){
    this.assertActor(actor);if(entry.run?.token!==token||entry.run.controller.signal.aborted||!this.entries.has(entry.work.id))throw new PptxError("CANCELLED","작업 실행이 취소되었습니다.");
    if(entry.work.inputRevision!==inputRevision)throw new AdminDataError("CONFLICT","작업 설정이 변경되었습니다.");this.resolve(actor,entry);
  }
  async execute(actor:AdminActor,raw:WorkCommand):Promise<WorkView|null> {
    this.assertActor(actor);const parsed=WorkCommandSchema.safeParse(raw);if(!parsed.success)throw validationError(parsed.error);const command=parsed.data;
    const access=await this.context.host.getAccess(actor);this.assertActor(actor);const now=access.logicalNow;
    if(command.type==="create-work"){
      const template=this.context.host.resolveAsset(actor,{assetId:command.templateId},"new"),skill=this.context.host.resolveAsset(actor,{assetId:command.skillId},"new");
      if(template.revision.kind!=="template"||skill.revision.kind!=="skill")throw new AdminDataError("VALIDATION","Template과 Skill을 각각 선택하세요.");
      const id=this.createId(),fileRefId=template.revision.definition.fileRefId;
      const work=TemplateWorkSchema.parse({id,ownerId:actor.userId,createdAt:now,updatedAt:now,version:1,template:assetRef(template),skill:assetRef(skill),options:buildDefaultOptions(template.revision),inputRevision:1,status:"ready",progress:"",error:null,result:null});
      this.context.files.retain(fileRefId,"work:"+id);const entry:Entry={work,fileRefId,output:null,run:null};this.entries.set(id,entry);this.emit();return this.view(actor,entry);
    }
    const id="target" in command?command.target.id:command.id;
    // 권한을 잃은 본인 작업도 취소·폐기하여 메모리를 정리할 수 있다.
    const entry=command.type==="discard-work"||command.type==="cancel-work"?this.owned(actor,id):this.accessible(actor,id);
    if("target" in command&&command.target.version!==entry.work.version)throw new AdminDataError("CONFLICT","작업이 변경되었습니다. 최신 상태를 확인하세요.");
    if(command.type==="discard-work"){this.stop(entry,"CANCELLED","작업을 버렸습니다.");this.context.files.release(entry.fileRefId,"work:"+id);this.entries.delete(id);this.emit();return null;}
    if(command.type==="cancel-work"){if(entry.run){this.stop(entry,"CANCELLED","작업을 취소했습니다.");this.emit();}return this.canAccess(actor,id)?this.view(actor,entry):null;}
    if(command.type==="update-work-options"){
      validateOptionsForDocument(this.context.files.getSource(entry.fileRefId).document,command.options);
      if(JSON.stringify(command.options)===JSON.stringify(entry.work.options))return this.view(actor,entry);
      if(entry.run)this.stop(entry,"CANCELLED","설정 변경으로 이전 실행을 취소했습니다.");
      entry.work.options=command.options;entry.work.inputRevision++;entry.work.version++;entry.work.updatedAt=now;entry.work.status="ready";entry.work.error=null;entry.work.progress="";this.emit();return this.view(actor,entry);
    }
    if(entry.run)throw new AdminDataError("CONFLICT","이미 적용 중입니다.");
    return this.run(actor,entry,command.mode,now);
  }
  private async run(actor:AdminActor,entry:Entry,mode:"pinned"|"latest",now:string):Promise<WorkView|null> {
    const pinned=this.resolve(actor,entry);const candidate=mode==="latest"?resolveLatestCandidates(this.context.host,actor,entry.work):pinned;
    const {template,skill}=candidate;
    if(template.revision.kind!=="template"||skill.revision.kind!=="skill"||pinned.template.revision.kind!=="template")throw new AdminDataError("VALIDATION","자산 종류가 올바르지 않습니다.");
    const fileRefId=template.revision.definition.fileRefId,options=resolveReapplyOptions(entry.work.options,pinned.template.revision,template.revision);
    const refs={template:assetRef(template),skill:assetRef(skill)},baseInput=entry.work.inputRevision,token=Symbol(),controller=new AbortController();
    entry.run={controller,token};entry.work.status="running";entry.work.error=null;entry.work.version++;entry.work.progress="원본을 준비합니다.";this.emit();
    try{
      const result=await this.apply(this.context.files.getSource(fileRefId).document,toEngineSkill(skill.revision),options,message=>{this.checkRun(actor,entry,token,baseInput);this.checkCandidates(actor,candidate);entry.work.progress=message;this.emit();},controller.signal);
      this.checkRun(actor,entry,token,baseInput);this.checkCandidates(actor,candidate);
      const changed=template.revision.id!==entry.work.template.revisionId||skill.revision.id!==entry.work.skill.revisionId||JSON.stringify(options)!==JSON.stringify(entry.work.options);
      const inputRevision=baseInput+(changed?1:0),counts={changed:0,kept:0,skipped:0};for(const change of result.changes)counts[change.status]++;
      const filename=safePptxFilename(result.before.filename.replace(/\.(pptx|potx)$/i,"")+"_서식적용.pptx");
      const next=TemplateWorkSchema.parse({...entry.work,...refs,options,inputRevision,version:entry.work.version+1,status:"succeeded",progress:"적용을 완료했습니다.",error:null,updatedAt:now,result:{id:this.createId(),inputRevision,...refs,createdAt:now,filename,...counts,warnings:result.warnings}});
      this.context.files.retain(fileRefId,"work:"+entry.work.id);
      try{this.context.host.recordWorkActivity(actor,refs,"apply",entry.work.id);}catch(error){if(fileRefId!==entry.fileRefId)this.context.files.release(fileRefId,"work:"+entry.work.id);throw error;}
      const previousFile=entry.fileRefId;entry.work=next;entry.fileRefId=fileRefId;entry.output=result;entry.run=null;
      if(previousFile!==fileRefId)this.context.files.release(previousFile,"work:"+entry.work.id);this.emit();return this.view(actor,entry);
    }catch(error){
      if(entry.run?.token===token){
        const code=error instanceof AdminDataError?(error.code==="CONFLICT"?"CONFLICT":"FORBIDDEN"):error instanceof PptxError&&error.code==="CANCELLED"?"CANCELLED":"FILE";
        entry.run=null;entry.work.status=code==="CANCELLED"?"cancelled":"failed";entry.work.error={code,message:error instanceof Error?error.message:"파일 적용에 실패했습니다."};entry.work.progress="";entry.work.version++;this.emit();
      }
      return this.canAccess(actor,entry.work.id)?this.view(actor,entry):null;
    }
  }
  private checkCandidates(actor:AdminActor,candidates:{template:ResolvedAsset;skill:ResolvedAsset}){for(const candidate of [candidates.template,candidates.skill])this.context.host.resolveAsset(actor,assetRef(candidate),"existing");}
  async download(actor:AdminActor,id:string,resultId:string){
    const entry=this.accessible(actor,id);if(!canDownloadWork(entry.work,true)||entry.work.result?.id!==resultId||!entry.output)throw new AdminDataError("CONFLICT","현재 설정에 맞는 적용 결과가 없습니다. 다시 적용하세요.");
    this.context.host.recordWorkActivity(actor,{template:entry.work.template,skill:entry.work.skill},"export",id);
    return {bytes:entry.output.bytes.slice(),filename:entry.work.result.filename};
  }
  getPreview(actor:AdminActor,id:string,side:"before"|"after"){
    const entry=this.accessible(actor,id),doc=side==="before"?this.context.files.getSource(entry.fileRefId).document:entry.output?.after;
    return doc?structuredClone({width:doc.width,height:doc.height,slides:doc.slides,warnings:doc.warnings}):null;
  }
  getChanges(actor:AdminActor,id:string){return structuredClone(this.accessible(actor,id).output?.changes??[]);}
  getSharedDesigns(actor:AdminActor,id:string){const entry=this.accessible(actor,id);return structuredClone(sharedDesigns(this.context.files.getSource(entry.fileRefId).document));}
  setActor(actor:AdminActor){if(actorKey(actor)===actorKey(this.actor))return;for(const entry of this.entries.values())if(entry.run)this.stop(entry,"CANCELLED","사용자 또는 역할이 변경되어 실행을 취소했습니다.");this.actor={...actor};this.emit();}
  dispose(){if(this.disposed)return;this.disposed=true;this.unsubscribe();for(const entry of this.entries.values()){entry.run?.controller.abort();this.context.files.release(entry.fileRefId,"work:"+entry.work.id);}this.entries.clear();this.listeners.clear();}
}
