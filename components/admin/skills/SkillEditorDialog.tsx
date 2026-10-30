"use client";
import { Button,Field,Input,Select,Textarea } from "@fluentui/react-components";
import { useState } from "react";
import ModalFrame from "@/components/ui/ModalFrame";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { useAsset,useAssetAudience,useAssetCommand } from "@/hooks/admin/use-assets";
import { DEFAULT_SKILL_RULES } from "@/config/skill-options";
import { AssetCommandSchema,AssetStatusSchema } from "@/lib/admin/assets/schemas";
import type { AssetDetail,AssetStatus,AssetVisibility,SkillDraft } from "@/types/admin-assets";
import AssetVisibilityField from "@/components/admin/assets/AssetVisibilityField";
import AssetVersionBadge from "@/components/admin/assets/AssetVersionBadge";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import SkillRuleFields from "./SkillRuleFields";
import SkillStylePreview from "./SkillStylePreview";
interface SkillEditorDialogProps {open:boolean;detail:AssetDetail|null;readOnly:boolean;onClose():void}
interface Draft {value:SkillDraft;status:AssetStatus;visibility:AssetVisibility;ownerDepartmentId:string|null;baseVersion:number|null}
function initial(detail:AssetDetail|null,departmentId:string|null):Draft {
  const revision=detail?.revision;if(revision&&revision.kind!=="skill")throw new Error("Skill을 선택하세요.");
  return {value:revision?{name:revision.name,short:revision.short,description:revision.description,rules:structuredClone(revision.rules)}:{name:"",short:"",description:"",rules:structuredClone(DEFAULT_SKILL_RULES)},status:detail?.asset.status??"inactive",visibility:structuredClone(detail?.asset.visibility??{all:false,targets:[]}),ownerDepartmentId:detail?detail.asset.ownerDepartmentId:departmentId,baseVersion:detail?.asset.version??null};
}
export default function SkillEditorDialog({open,detail,readOnly,onClose}:SkillEditorDialogProps){
  const {actor,access}=useAdminRuntime(),latest=useAsset(detail?.asset.id??null,"skill"),audience=useAssetAudience("skill"),command=useAssetCommand();
  const [draft,setDraft]=useState(()=>initial(detail,actor.departmentId)),[baseline,setBaseline]=useState(()=>JSON.stringify(initial(detail,actor.departmentId))),[errors,setErrors]=useState<Record<string,string>>({}),[confirmClose,setConfirmClose]=useState(false);
  const allowed=Boolean(access?.grants.skills.read&&(!detail||latest.data?.asset.capabilities.read));
  const editable=allowed&&!readOnly&&Boolean(detail?access?.grants.skills.update&&latest.data?.asset.capabilities.update:access?.grants.skills.create);
  const dirty=JSON.stringify(draft)!==baseline,disabled=!editable||command.isPending;
  const close=()=>{if(command.isPending)return;if(dirty&&editable)setConfirmClose(true);else onClose();};
  async function save(){
    if(!editable)return;
    const raw=detail?{type:"update-skill",target:{id:detail.asset.id,version:draft.baseVersion},value:draft.value,status:draft.status,visibility:draft.visibility}:{type:"create-skill",ownerDepartmentId:draft.ownerDepartmentId,value:draft.value,status:draft.status,visibility:draft.visibility};
    const parsed=AssetCommandSchema.safeParse(raw);if(!parsed.success){setErrors(Object.fromEntries(parsed.error.issues.map(i=>[i.path.join(".").replace(/^value\.(rules\.)?/,""),i.message])));return;}
    setErrors({});try{await command.mutateAsync(parsed.data);onClose();}catch{/* 실패 시 입력을 유지한다. */}
  }
  async function reload(){const result=await latest.refetch();if(result.data){const next=initial(result.data,actor.departmentId);setDraft(next);setBaseline(JSON.stringify(next));setErrors({});command.reset();}}
  return <ModalFrame open={open} width={1040} title={detail?(editable?"Skill 편집":"Skill 상세"):"Skill 등록"} contentKey={detail?.asset.id??"new-skill"} onClose={close} footer={<>
    {confirmClose?<><span>저장하지 않은 변경사항을 버릴까요?</span><Button onClick={()=>setConfirmClose(false)}>계속 편집</Button><Button onClick={onClose}>변경사항 버리기</Button></>:<><Button onClick={close}>{editable?"취소":"닫기"}</Button>{editable&&<Button appearance="primary" disabled={!dirty||command.isPending} onClick={()=>void save()}>{command.isPending?"저장 중…":"저장"}</Button>}</>}
  </>}>
    {!allowed?<AdminAsyncState state={latest.isPending&&access?.grants.skills.read?"loading":"forbidden"}/>:<>
      {detail&&<AssetVersionBadge currentRevision={latest.data?.asset.currentRevision??detail.asset.currentRevision} inactive={draft.status==="inactive"}/>}
      {!editable&&<p>조회 전용입니다. 편집 가능한 사본은 목록의 복제 기능으로 만들 수 있습니다.</p>}
      <div className="tw:grid tw:items-start tw:gap-4 tw:lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-3">
          <fieldset className="tw:m-0 tw:min-w-0 tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:p-3"><legend className="tw:font-semibold">1. 기본 정보</legend><div className="tw:grid tw:gap-3 tw:sm:grid-cols-2">
            {(["name","short"] as const).map(key=><Field key={key} label={key==="name"?"Skill 이름":"약칭"} required validationState={errors[key]?"error":"none"} validationMessage={errors[key]}><Input disabled={disabled} value={draft.value[key]} maxLength={key==="name"?80:20} onChange={(_,data)=>setDraft({...draft,value:{...draft.value,[key]:data.value}})}/></Field>)}
            <Field className="tw:sm:col-span-2" label="설명" validationMessage={errors.description}><Textarea disabled={disabled} value={draft.value.description} maxLength={1000} onChange={(_,data)=>setDraft({...draft,value:{...draft.value,description:data.value}})}/></Field>
            <Field label="소유 부서"><Select disabled={disabled||Boolean(detail)||actor.role!=="super_admin"} value={draft.ownerDepartmentId??""} onChange={(_,data)=>setDraft({...draft,ownerDepartmentId:data.value||null})}>{actor.role==="super_admin"&&<option value="">전사 소유</option>}{access?.departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
            <Field label="상태"><Select disabled={disabled} value={draft.status} onChange={(_,data)=>setDraft({...draft,status:AssetStatusSchema.parse(data.value)})}><option value="inactive">비활성</option><option value="active">활성</option></Select></Field>
          </div></fieldset>
          <SkillRuleFields value={draft.value.rules} disabled={disabled} fieldErrors={errors} onChange={rules=>setDraft({...draft,value:{...draft.value,rules}})}/>
          <h3 className="tw:my-0 tw:text-[12px]">9. 공개 범위</h3><AssetVisibilityField value={draft.visibility} candidates={audience.data??{departments:[],users:[],groups:[]}} disabled={disabled||!audience.data} onChange={visibility=>setDraft({...draft,visibility})}/>
          <p className="tw:text-[11px] tw:text-(--kpc-muted)">공개 범위 변경은 기존 작업의 접근 권한에 즉시 반영됩니다. 서식 변경은 기존 결과에 자동 반영되지 않으며 최신 재적용으로 반영합니다.</p>
          {command.error&&<div role="alert" className="tw:text-(--kpc-danger)">{command.error.message}{command.error.code==="CONFLICT"&&<Button onClick={()=>void reload()}>최신 내용 불러오기</Button>}</div>}
          {Object.keys(errors).length>0&&<p role="alert">입력 오류를 확인해 주세요. {Object.values(errors)[0]}</p>}
        </div><SkillStylePreview rules={draft.value.rules}/>
      </div>
    </>}
  </ModalFrame>;
}
