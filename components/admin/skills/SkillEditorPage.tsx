"use client";
import { Field } from "@fluentui/react-components";
import { DadamButton as Button, DadamInput as Input, DadamSelect as Select, DadamTextarea as Textarea } from "@/components/ui/DadamControls";
import { useEffect,useId,useRef,useState } from "react";
import { useRouter } from "next/navigation";
import WorkspacePage from "@/components/layout/WorkspacePage";
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
interface SkillEditorPageProps {detail:AssetDetail|null;readOnly:boolean;onClose(savedAssetId?:string):void}
interface Draft {value:SkillDraft;status:AssetStatus;visibility:AssetVisibility;ownerDepartmentId:string|null;baseVersion:number|null}
function initial(detail:AssetDetail|null,departmentId:string|null):Draft {
  const revision=detail?.revision;if(revision&&revision.kind!=="skill")throw new Error("Skill을 선택하세요.");
  return {value:revision?{name:revision.name,short:revision.short,description:revision.description,rules:structuredClone(revision.rules)}:{name:"",short:"",description:"",rules:structuredClone(DEFAULT_SKILL_RULES)},status:detail?.asset.status??"inactive",visibility:structuredClone(detail?.asset.visibility??{all:false,targets:[]}),ownerDepartmentId:detail?detail.asset.ownerDepartmentId:departmentId,baseVersion:detail?.asset.version??null};
}
export default function SkillEditorPage({detail,readOnly,onClose}:SkillEditorPageProps){
  const {actor,access}=useAdminRuntime(),latest=useAsset(detail?.asset.id??null,"skill"),audience=useAssetAudience("skill"),command=useAssetCommand();
  const [draft,setDraft]=useState(()=>initial(detail,actor.departmentId)),[baseline,setBaseline]=useState(()=>JSON.stringify(initial(detail,actor.departmentId))),[errors,setErrors]=useState<Record<string,string>>({}),[confirmClose,setConfirmClose]=useState(false);
  const router=useRouter(),formId=useId(),heading=useRef<HTMLHeadingElement>(null),form=useRef<HTMLFormElement>(null),destination=useRef<string|null>(null);
  const allowed=Boolean(access?.grants.skills.read&&(!detail||latest.data?.asset.capabilities.read));
  const editable=allowed&&!readOnly&&Boolean(detail?access?.grants.skills.update&&latest.data?.asset.capabilities.update:access?.grants.skills.create);
  const dirty=JSON.stringify(draft)!==baseline,disabled=!editable||command.isPending;
  const close=()=>{if(command.isPending)return;destination.current=null;if(dirty&&editable)setConfirmClose(true);else onClose();};
  useEffect(()=>{window.scrollTo({top:0});heading.current?.focus({preventScroll:true});},[]);
  useEffect(()=>{
    if(!dirty||!editable)return;
    let confirmFrame:number|null=null;
    const beforeUnload=(event:BeforeUnloadEvent)=>{event.preventDefault();};
    const navigate=(event:MouseEvent)=>{
      if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      const link=event.target instanceof Element?event.target.closest<HTMLAnchorElement>("a[href]"):null;
      if(!link||link.target==="_blank"||link.hasAttribute("download"))return;
      const target=new URL(link.href,window.location.href);
      if(target.origin!==window.location.origin||target.hash&&target.pathname===window.location.pathname&&target.search===window.location.search)return;
      // 링크 이동만 막고 모바일 메뉴의 닫기 처리는 그대로 실행한다.
      event.preventDefault();
      if(command.isPending)return;
      destination.current=target.pathname+target.search+target.hash;
      // 메뉴 클릭이 확인창의 바깥 클릭으로 처리되지 않도록 다음 화면 갱신에서 연다.
      if(confirmFrame!==null)cancelAnimationFrame(confirmFrame);
      confirmFrame=requestAnimationFrame(()=>{confirmFrame=null;setConfirmClose(true);});
    };
    window.addEventListener("beforeunload",beforeUnload);document.addEventListener("click",navigate,true);
    return()=>{if(confirmFrame!==null)cancelAnimationFrame(confirmFrame);window.removeEventListener("beforeunload",beforeUnload);document.removeEventListener("click",navigate,true);};
  },[dirty,editable,command.isPending]);
  function discard(){const next=destination.current;onClose();if(next)router.push(next);}
  async function save(){
    if(disabled||!dirty)return;
    const raw=detail?{type:"update-skill",target:{id:detail.asset.id,version:draft.baseVersion},value:draft.value,status:draft.status,visibility:draft.visibility}:{type:"create-skill",ownerDepartmentId:draft.ownerDepartmentId,value:draft.value,status:draft.status,visibility:draft.visibility};
    const parsed=AssetCommandSchema.safeParse(raw);if(!parsed.success){setErrors(Object.fromEntries(parsed.error.issues.map(i=>[i.path.join(".").replace(/^value\.(rules\.)?/,""),i.message])));requestAnimationFrame(()=>form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());return;}
    setErrors({});try{const result=await command.mutateAsync(parsed.data);onClose(result.assetId);}catch{/* 실패 시 입력을 유지한다. */}
  }
  async function reload(){const result=await latest.refetch();if(result.data){const next=initial(result.data,actor.departmentId);setDraft(next);setBaseline(JSON.stringify(next));setErrors({});command.reset();}}
  return <WorkspacePage stickyHeader title={detail?(editable?"Skill 편집":"Skill 상세"):"Skill 등록"} headingRef={heading}
    className="tw:text-[12px] tw:text-(--kpc-ink)"
    leading={<Button appearance="subtle" disabled={command.isPending} onClick={close}>← Skill 목록</Button>}
    actions={<><Button disabled={command.isPending} onClick={close}>{editable?"취소":"닫기"}</Button>{editable&&<Button type="submit" form={formId} appearance="primary" disabled={!dirty||command.isPending}>{command.isPending?"저장 중…":detail?"저장":"등록"}</Button>}</>}>
    {command.error&&<div role="alert" className="tw:text-(--kpc-danger)">{command.error.message}{command.error.code==="CONFLICT"&&<Button onClick={()=>void reload()}>최신 내용 불러오기</Button>}</div>}
    {Object.keys(errors).length>0&&<p role="alert" className="tw:text-(--kpc-danger)">입력 오류를 확인해 주세요. {Object.values(errors)[0]}</p>}
    {!allowed?<AdminAsyncState state={latest.isPending&&access?.grants.skills.read?"loading":"forbidden"}/>:<>
      {detail&&<AssetVersionBadge currentRevision={latest.data?.asset.currentRevision??detail.asset.currentRevision} inactive={draft.status==="inactive"}/>}
      {!editable&&<p>조회 전용입니다. 편집 가능한 사본은 목록의 복제 기능으로 만들 수 있습니다.</p>}
      <div className="tw:grid tw:items-start tw:gap-(--layout-section-gap) tw:xl:grid-cols-[minmax(0,1fr)_320px]">
        <form id={formId} ref={form} aria-label="Skill 입력" noValidate onSubmit={event=>{event.preventDefault();void save();}} className="tw:flex tw:min-w-0 tw:flex-col tw:gap-(--layout-section-gap)">
          <fieldset className="tw:m-0 tw:min-w-0 tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:p-(--layout-card-inset)"><legend className="tw:px-(--layout-inline-gap) tw:font-semibold">1. 기본 정보</legend><div className="tw:grid tw:gap-(--layout-section-gap) tw:sm:grid-cols-2">
            {(["name","short"] as const).map(key=><Field key={key} label={key==="name"?"Skill 이름":"약칭"} required validationState={errors[key]?"error":"none"} validationMessage={errors[key]}><Input disabled={disabled} value={draft.value[key]} maxLength={key==="name"?80:20} onChange={(_,data)=>setDraft({...draft,value:{...draft.value,[key]:data.value}})}/></Field>)}
            <Field className="tw:sm:col-span-2" label="설명" validationMessage={errors.description}><Textarea disabled={disabled} value={draft.value.description} maxLength={1000} onChange={(_,data)=>setDraft({...draft,value:{...draft.value,description:data.value}})}/></Field>
            <Field label="소유 부서"><Select disabled={disabled||Boolean(detail)||actor.role!=="super_admin"} value={draft.ownerDepartmentId??""} onChange={(_,data)=>setDraft({...draft,ownerDepartmentId:data.value||null})}>{actor.role==="super_admin"&&<option value="">전사 소유</option>}{access?.departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
            <Field label="상태"><Select disabled={disabled} value={draft.status} onChange={(_,data)=>setDraft({...draft,status:AssetStatusSchema.parse(data.value)})}><option value="inactive">비활성</option><option value="active">활성</option></Select></Field>
          </div></fieldset>
          <SkillRuleFields value={draft.value.rules} disabled={disabled} fieldErrors={errors} onChange={rules=>setDraft({...draft,value:{...draft.value,rules}})}/>
          <section aria-label="9. 공개 범위"><h2 className="tw:mb-(--layout-section-gap) tw:mt-0 tw:text-[13px] tw:font-semibold">9. 공개 범위</h2><AssetVisibilityField value={draft.visibility} candidates={audience.data??{departments:[],users:[],groups:[]}} disabled={disabled||!audience.data} onChange={visibility=>setDraft({...draft,visibility})}/></section>
          <p className="tw:text-[11px] tw:text-(--kpc-muted)">공개 범위 변경은 기존 작업의 접근 권한에 즉시 반영됩니다. 서식 변경은 기존 결과에 자동 반영되지 않으며 최신 재적용으로 반영합니다.</p>
        </form><SkillStylePreview rules={draft.value.rules}/>
      </div>
    </>}
    {confirmClose&&<ModalFrame open title="변경사항 버리기" contentKey="skill-unsaved" onClose={()=>setConfirmClose(false)} footer={<><Button onClick={()=>setConfirmClose(false)}>계속 편집</Button><Button appearance="primary" onClick={discard}>변경사항 버리기</Button></>}><p>저장하지 않은 Skill 변경사항을 버리고 이동할까요?</p></ModalFrame>}
  </WorkspacePage>;
}
