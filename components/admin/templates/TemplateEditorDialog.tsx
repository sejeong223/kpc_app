"use client";
import { Button,Field,Input,Select,Textarea } from "@fluentui/react-components";
import { useEffect,useRef,useState } from "react";
import ModalFrame from "@/components/ui/ModalFrame";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { useAsset,useAssetAudience,useAssetCommand,useTemplateImport,useTemplatePreview } from "@/hooks/admin/use-assets";
import { AssetCommandSchema,AssetStatusSchema } from "@/lib/admin/assets/schemas";
import { TemplateImportSession } from "@/lib/admin/assets/import-session";
import { createDisposalLease } from "@/lib/admin/runtime-lifetime";
import type { AssetDetail,AssetStatus,AssetVisibility,TemplateDraft,TemplateExtraction } from "@/types/admin-assets";
import AssetVisibilityField from "@/components/admin/assets/AssetVisibilityField";
import AssetVersionBadge from "@/components/admin/assets/AssetVersionBadge";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import TemplateFileInput from "./TemplateFileInput";
import TemplateExtractionPanel from "./TemplateExtractionPanel";
import TemplateMappingFields from "./TemplateMappingFields";
interface TemplateEditorDialogProps {open:boolean;detail:AssetDetail|null;readOnly:boolean;onClose():void;onApply?(id:string):void}
interface UiValue extends Omit<TemplateDraft,"fileRefId"> {fileRefId:string|null}
interface Draft {value:UiValue;status:AssetStatus;visibility:AssetVisibility;ownerDepartmentId:string|null;baseVersion:number|null}
function initial(detail:AssetDetail|null,departmentId:string|null):Draft {
  const revision=detail?.revision;if(revision&&revision.kind!=="template")throw new Error("Template을 선택하세요.");
  return {value:revision?{name:revision.name,short:revision.short,description:revision.description,fileRefId:revision.definition.fileRefId,pageTypes:structuredClone(revision.definition.pageTypes),roles:structuredClone(revision.definition.roles),excluded:[...revision.definition.excluded]}:{name:"",short:"",description:"",fileRefId:null,pageTypes:{},roles:{},excluded:[]},status:detail?.asset.status??"inactive",visibility:structuredClone(detail?.asset.visibility??{all:false,targets:[]}),ownerDepartmentId:detail?detail.asset.ownerDepartmentId:departmentId,baseVersion:detail?.asset.version??null};
}
const extractionOf=(detail:AssetDetail|null)=>detail?.revision.kind==="template"?detail.revision.definition.extraction:null;
export default function TemplateEditorDialog({open,detail,readOnly,onClose,onApply}:TemplateEditorDialogProps){
  const {actor,service,access}=useAdminRuntime(),latest=useAsset(detail?.asset.id??null,"template"),audience=useAssetAudience("template"),command=useAssetCommand(),importing=useTemplateImport();
  const [draft,setDraft]=useState(()=>initial(detail,actor.departmentId)),[baseline,setBaseline]=useState(()=>JSON.stringify(initial(detail,actor.departmentId))),[extraction,setExtraction]=useState<TemplateExtraction|null>(()=>extractionOf(detail));
  const [errors,setErrors]=useState<Record<string,string>>({}),[confirmClose,setConfirmClose]=useState(false),[progress,setProgress]=useState<string|null>(null),[fileError,setFileError]=useState<string|null>(null),[filename,setFilename]=useState<string|null>(()=>extractionOf(detail)?.filename??null);
  const [session]=useState(()=>new TemplateImportSession(id=>service.discardTemplateImport(actor,id))),[lease]=useState(()=>createDisposalLease(()=>session.clear()));
  const request=useRef(0),preview=useTemplatePreview(draft.value.fileRefId,detail?.asset.id);
  useEffect(lease,[lease]);
  const permissionLost=!access?.grants.templates.read||Boolean(detail&&latest.isError);
  useEffect(()=>{if(permissionLost)session.clear();},[permissionLost,session]);
  const allowed=Boolean(access?.grants.templates.read&&(!detail||latest.data?.asset.capabilities.read));
  const editable=allowed&&!readOnly&&Boolean(detail?access?.grants.templates.update&&latest.data?.asset.capabilities.update:access?.grants.templates.create);
  const dirty=JSON.stringify(draft)!==baseline,disabled=!editable||command.isPending||Boolean(progress);
  const close=()=>{if(command.isPending)return;session.cancel();if(dirty&&editable)setConfirmClose(true);else onClose();};
  async function select(file:File){
    if(!editable)return;const sequence=++request.current;setProgress("파일 구조를 분석합니다.");setFileError(null);setFilename(file.name);setExtraction(null);setDraft(current=>({...current,value:{...current.value,fileRefId:null,pageTypes:{},roles:{},excluded:[]}}));
    try{const source=await session.select(file,importing.mutateAsync,setProgress);if(!source||sequence!==request.current)return;setExtraction(source.extraction);setDraft(current=>({...current,value:{...current.value,name:current.value.name||file.name.replace(/\.(pptx|potx)$/i,"").slice(0,80),short:current.value.short||"템플릿",fileRefId:source.id,pageTypes:Object.fromEntries(source.extraction.slides.map(slide=>[String(slide.index),slide.type])),roles:{},excluded:[]}}));}
    catch(error){if(sequence===request.current)setFileError(error instanceof Error?error.message:"파일 분석에 실패했습니다.");}
    finally{if(sequence===request.current){setProgress(null);importing.reset();}}
  }
  async function save(){
    if(!editable||!draft.value.fileRefId||!extraction)return;
    const raw=detail?{type:"update-template",target:{id:detail.asset.id,version:draft.baseVersion},value:draft.value,status:draft.status,visibility:draft.visibility}:{type:"create-template",ownerDepartmentId:draft.ownerDepartmentId,value:draft.value,status:draft.status,visibility:draft.visibility};
    const parsed=AssetCommandSchema.safeParse(raw);if(!parsed.success){setErrors(Object.fromEntries(parsed.error.issues.map(i=>[i.path.join(".").replace(/^value\./,""),i.message])));return;}
    setErrors({});try{await command.mutateAsync(parsed.data);onClose();}catch{/* 실패 시 입력을 유지하여 다시 저장할 수 있게 한다. */}
  }
  async function reload(){const result=await latest.refetch();if(result.data){session.clear();const next=initial(result.data,actor.departmentId);setDraft(next);setBaseline(JSON.stringify(next));setExtraction(extractionOf(result.data));setFilename(extractionOf(result.data)?.filename??null);setErrors({});command.reset();}}
  return <ModalFrame open={open} width={1200} title={detail?(editable?"Template 편집":"Template 상세"):"Template 등록"} contentKey={detail?.asset.id??"new-template"} onClose={close} footer={<>
    {confirmClose?<><span>저장하지 않은 변경사항을 버릴까요?</span><Button onClick={()=>setConfirmClose(false)}>계속 편집</Button><Button onClick={onClose}>변경사항 버리기</Button></>:<><Button onClick={close}>{editable?"취소":"닫기"}</Button>{editable&&<Button appearance="primary" disabled={!dirty||disabled||!draft.value.fileRefId||!extraction} onClick={()=>void save()}>{command.isPending?"저장 중…":"저장"}</Button>}</>}
  </>}>
    {!allowed?<AdminAsyncState state={latest.isPending&&access?.grants.templates.read?"loading":"forbidden"}/>:<>
      {detail&&<AssetVersionBadge currentRevision={latest.data?.asset.currentRevision??detail.asset.currentRevision} inactive={draft.status==="inactive"}/>}
      {onApply&&latest.data?.asset.capabilities.apply&&access?.grants.skills.read&&<Button disabled={dirty||Boolean(progress)||command.isPending} onClick={()=>{if(detail)onApply(detail.asset.id);}}>저장된 버전으로 적용 테스트</Button>}
      {!editable&&<p>조회 전용입니다. 수정은 소유 부서 관리자에게 요청하거나 목록에서 사본을 복제하세요.</p>}
      <div className="tw:grid tw:items-start tw:gap-3 tw:lg:grid-cols-3">
        <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-3">{editable&&<TemplateFileInput disabled={command.isPending} filename={filename} progress={progress} error={fileError} onSelect={file=>void select(file)} onCancel={()=>{session.clear();setProgress(null);setFileError("파일 분석을 취소했습니다. 다시 선택할 수 있습니다.");}} onUseExample={()=>void import("@/config/pptx-demo").then(module=>select(module.createDemoTemplateFile()))}/>}
          {(["name","short"] as const).map(key=><Field key={key} label={key==="name"?"Template 이름":"약칭"} required validationState={errors[key]?"error":"none"} validationMessage={errors[key]}><Input disabled={disabled} value={draft.value[key]} maxLength={key==="name"?80:20} onChange={(_,data)=>setDraft({...draft,value:{...draft.value,[key]:data.value}})}/></Field>)}
          <Field label="설명"><Textarea disabled={disabled} value={draft.value.description} maxLength={1000} onChange={(_,data)=>setDraft({...draft,value:{...draft.value,description:data.value}})}/></Field>
          <Field label="소유 부서"><Select disabled={disabled||Boolean(detail)||actor.role!=="super_admin"} value={draft.ownerDepartmentId??""} onChange={(_,data)=>setDraft({...draft,ownerDepartmentId:data.value||null})}>{actor.role==="super_admin"&&<option value="">전사 소유</option>}{access?.departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
          <Field label="상태"><Select disabled={disabled} value={draft.status} onChange={(_,data)=>setDraft({...draft,status:AssetStatusSchema.parse(data.value)})}><option value="inactive">비활성</option><option value="active">활성</option></Select></Field>
        </div>
        {extraction?<TemplateExtractionPanel value={extraction}/>:<AdminAsyncState state="empty" message="파일 분석이 완료되면 추출 정보를 표시합니다."/>}
        {preview.data&&draft.value.fileRefId?<TemplateMappingFields document={preview.data} value={draft.value} disabled={disabled} onChange={mapping=>setDraft({...draft,value:{...draft.value,...mapping}})}/>:<AdminAsyncState state={preview.isError?"error":draft.value.fileRefId?"loading":"empty"} message={preview.error?.message??(draft.value.fileRefId?undefined:"분석한 파일의 유형과 역할을 설정합니다.")} onRetry={()=>void preview.refetch()}/>}
      </div>
      <AssetVisibilityField value={draft.visibility} candidates={audience.data??{departments:[],users:[],groups:[]}} disabled={disabled||!audience.data} onChange={visibility=>setDraft({...draft,visibility})}/>
      <p className="tw:text-[11px] tw:text-(--kpc-muted)">파일 교체 시 유형·역할·제외 설정을 초기화합니다. 기존 작업은 적용 당시 파일을 유지하고 최신 재적용으로 새 파일을 반영합니다. 공개 범위 변경은 현재 작업 접근에도 반영됩니다.</p>
      {command.error&&<div role="alert" className="tw:text-(--kpc-danger)">{command.error.message}{command.error.code==="CONFLICT"&&<Button onClick={()=>void reload()}>최신 내용 불러오기</Button>}</div>}
      {Object.keys(errors).length>0&&<p role="alert">입력 오류를 확인해 주세요. {Object.values(errors)[0]}</p>}
    </>}
  </ModalFrame>;
}
