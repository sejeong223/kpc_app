"use client";
import { Button,Field,Input,Radio,RadioGroup } from "@fluentui/react-components";
import { useState } from "react";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { useAsset,useAssets } from "@/hooks/admin/use-assets";
import { defaultAssetQuery } from "@/components/admin/assets/AssetListPanel";
import AdminPager from "@/components/admin/ui/AdminPager";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import ModalFrame from "@/components/ui/ModalFrame";
export default function SkillPickerDialog({templateId,pending,error,onSelect,onClose}:{templateId:string;pending:boolean;error:string|null;onSelect(skillId:string):void;onClose():void}){
  const {access}=useAdminRuntime(),template=useAsset(templateId,"template"),[query,setQuery]=useState({...defaultAssetQuery("skill"),status:"active" as const}),[selected,setSelected]=useState<string|null>(null),skills=useAssets(query);
  const allowed=Boolean(access?.grants.skills.read&&access.grants.templates.read&&template.data?.asset.capabilities.apply),choice=skills.data?.rows.items.find(row=>row.id===selected&&row.capabilities.apply);
  return <ModalFrame open title="적용할 Skill 선택" subtitle={allowed?template.data?.asset.name:undefined} contentKey={templateId} onClose={onClose} footer={<><Button disabled={pending} onClick={onClose}>취소</Button>{allowed&&<Button appearance="primary" disabled={!choice||pending} onClick={()=>{if(choice)onSelect(choice.id);}}>적용 작업 만들기</Button>}</>}>
    {!allowed?<AdminAsyncState state={template.isPending?"loading":"forbidden"}/>:<><Field label="활성 Skill 검색"><Input value={query.search} onChange={(_,data)=>{setQuery({...query,search:data.value,page:1});setSelected(null);}}/></Field>{skills.isError?<AdminAsyncState state="error" message={skills.error.message} onRetry={()=>void skills.refetch()}/>:!skills.data?<AdminAsyncState state="loading"/>:<><RadioGroup value={choice?.id??""} onChange={(_,data)=>setSelected(data.value)}>{skills.data.rows.items.filter(row=>row.capabilities.apply).map(row=><Radio key={row.id} value={row.id} label={`${row.name} · v${row.currentRevision} · ${row.ownerDepartmentName}`}/>)}</RadioGroup>{!skills.data.rows.items.length&&<p>선택 가능한 활성 Skill이 없습니다.</p>}<AdminPager {...skills.data.rows} onChange={page=>{setQuery({...query,page});setSelected(null);}}/></>}{error&&<p role="alert">{error}</p>}</>}
  </ModalFrame>;
}
