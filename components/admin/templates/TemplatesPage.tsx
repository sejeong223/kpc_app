"use client";
import { useState } from "react";
import { Button } from "@fluentui/react-components";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { useAssets,useAssetCommand } from "@/hooks/admin/use-assets";
import { adminQueryKey } from "@/lib/admin/query-keys";
import { AdminPage } from "@/components/admin/ui/AdminPrimitives";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import AssetListPanel,{ASSET_DATA_NOTICE,defaultAssetQuery,emptyAssetList} from "@/components/admin/assets/AssetListPanel";
import AssetDeleteDialog from "@/components/admin/assets/AssetDeleteDialog";
import type { AssetCommand,AssetDetail,AssetRow } from "@/types/admin-assets";
import TemplateEditorDialog from "./TemplateEditorDialog";
import { useTemplateWorks,useTemplateWorkCommand } from "@/hooks/admin/use-template-work";
import ModalFrame from "@/components/ui/ModalFrame";
import TemplateWorkbench from "./workbench/TemplateWorkbench";
import TemplateWorkList from "./workbench/TemplateWorkList";
import SkillPickerDialog from "./workbench/SkillPickerDialog";
export default function TemplatesPage(){
  const {actor,service,revision,access,queryClient}=useAdminRuntime(),[query,setQuery]=useState(()=>defaultAssetQuery("template")),list=useAssets(query),command=useAssetCommand();
  const [editor,setEditor]=useState<{detail:AssetDetail|null}|null>(null),[deletion,setDeletion]=useState<AssetRow|null>(null),[notice,setNotice]=useState(""),[opening,setOpening]=useState(false);
  const works=useTemplateWorks(),workCommand=useTemplateWorkCommand();
  const [activeWork,setActiveWork]=useState<string|null>(null),[applyTemplate,setApplyTemplate]=useState<string|null>(null),[discard,setDiscard]=useState<string|null>(null);
  async function start(skillId:string){if(!applyTemplate)return;try{const view=await workCommand.mutateAsync({type:"create-work",templateId:applyTemplate,skillId});if(view){setApplyTemplate(null);setActiveWork(view.work.id);}}catch{/* 선택을 유지한다. */}}
  async function open(id:string){setOpening(true);try{const detail=await queryClient.fetchQuery({queryKey:adminQueryKey({actor,revision,kind:"asset",filter:{assetId:id}}),queryFn:()=>service.getAsset(actor,id)});setEditor({detail});}catch(error){setNotice(error instanceof Error?error.message:"상세를 열지 못했습니다.");}finally{setOpening(false);}}
  async function execute(value:AssetCommand){try{const result=await command.mutateAsync(value);setDeletion(null);setNotice(value.type==="duplicate-asset"?"비공개·비활성 사본을 만들었습니다.":"변경사항을 저장했습니다.");if(value.type==="duplicate-asset")void open(result.assetId);}catch{/* 오류를 표시하고 선택을 유지한다. */}}
  if(!access?.grants.templates.read)return <AdminAsyncState state="forbidden"/>;
  if(activeWork)return <TemplateWorkbench workId={activeWork} onBack={()=>setActiveWork(null)}/>;
  return <AdminPage title="Template" description="PPTX·POTX 원본을 분석하고 템플릿 버전과 적용 설정을 관리합니다." dataNotice={ASSET_DATA_NOTICE}>
    {notice&&<p role="status">{notice}</p>}{command.error&&<p role="alert">{command.error.message}</p>}{opening&&<p role="status">상세를 불러오는 중입니다.</p>}
    <AssetListPanel kind="template" query={query} onQueryChange={setQuery} list={list.data??emptyAssetList} loading={list.isPending} error={list.error?.message??null} canCreate={access.grants.templates.create} onCreate={()=>setEditor({detail:null})} onOpen={id=>void open(id)} onDuplicate={row=>void execute({type:"duplicate-asset",target:{id:row.id,version:row.version}})} onToggle={row=>void execute({type:"set-asset-status",target:{id:row.id,version:row.version},status:row.status==="active"?"inactive":"active"})} onDelete={row=>{command.reset();setDeletion(row);}} onApply={row=>{workCommand.reset();setApplyTemplate(row.id);}}/>
    {list.isError&&<Button onClick={()=>void list.refetch()}>다시 시도</Button>}
    {access.grants.skills.read&&<TemplateWorkList items={works.data??[]} onOpen={setActiveWork} onDiscard={setDiscard}/>}
    {editor&&<TemplateEditorDialog open detail={editor.detail} readOnly={Boolean(editor.detail&&!editor.detail.asset.capabilities.update)} onClose={()=>setEditor(null)} onApply={id=>{setEditor(null);workCommand.reset();setApplyTemplate(id);}}/>}
    {applyTemplate&&access.grants.skills.read&&<SkillPickerDialog templateId={applyTemplate} pending={workCommand.isPending} error={workCommand.error?.message??null} onSelect={id=>void start(id)} onClose={()=>setApplyTemplate(null)}/>}
    {discard&&<ModalFrame open title="적용 작업 버리기" contentKey={discard} onClose={()=>setDiscard(null)} footer={<><Button onClick={()=>setDiscard(null)}>취소</Button><Button appearance="primary" disabled={workCommand.isPending} onClick={()=>workCommand.mutate({type:"discard-work",id:discard},{onSuccess:()=>setDiscard(null)})}>작업 버리기</Button></>}><p>이 작업의 설정과 적용 결과를 메모리에서 삭제합니다. 등록한 Skill과 Template은 유지됩니다.</p>{workCommand.error&&<p role="alert">{workCommand.error.message}</p>}</ModalFrame>}
    {deletion&&access.grants.templates.delete&&list.data?.rows.items.some(row=>row.id===deletion.id&&row.capabilities.delete)&&<AssetDeleteDialog open asset={deletion} pending={command.isPending} error={command.error?.message??null} onClose={()=>setDeletion(null)} onConfirm={target=>void execute({type:"delete-asset",target})}/>}
  </AdminPage>;
}
