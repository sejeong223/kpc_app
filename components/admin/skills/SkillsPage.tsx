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
import SkillEditorDialog from "./SkillEditorDialog";
export default function SkillsPage(){
  const {actor,service,revision,access,queryClient}=useAdminRuntime(),[query,setQuery]=useState(()=>defaultAssetQuery("skill")),list=useAssets(query),command=useAssetCommand();
  const [editor,setEditor]=useState<{detail:AssetDetail|null}|null>(null),[deletion,setDeletion]=useState<AssetRow|null>(null),[notice,setNotice]=useState(""),[opening,setOpening]=useState(false);
  async function open(id:string){setOpening(true);try{const detail=await queryClient.fetchQuery({queryKey:adminQueryKey({actor,revision,kind:"asset",filter:{assetId:id}}),queryFn:()=>service.getAsset(actor,id)});setEditor({detail});}catch(error){setNotice(error instanceof Error?error.message:"상세를 열지 못했습니다.");}finally{setOpening(false);}}
  async function execute(value:AssetCommand){try{const result=await command.mutateAsync(value);setDeletion(null);setNotice(value.type==="duplicate-asset"?"비공개·비활성 사본을 만들었습니다.":"변경사항을 저장했습니다.");if(value.type==="duplicate-asset")void open(result.assetId);}catch{/* 오류를 표시하고 선택을 유지한다. */}}
  if(!access?.grants.skills.read)return <AdminAsyncState state="forbidden"/>;
  return <AdminPage title="Skill" description="제안서에 반복 적용할 글꼴·여백·표 서식을 관리합니다." dataNotice={ASSET_DATA_NOTICE}>
    {notice&&<p role="status">{notice}</p>}{command.error&&<p role="alert">{command.error.message}</p>}{opening&&<p role="status">상세를 불러오는 중입니다.</p>}
    <AssetListPanel kind="skill" query={query} onQueryChange={setQuery} list={list.data??emptyAssetList} loading={list.isPending} error={list.error?.message??null} canCreate={access.grants.skills.create} onCreate={()=>setEditor({detail:null})} onOpen={id=>void open(id)} onDuplicate={row=>void execute({type:"duplicate-asset",target:{id:row.id,version:row.version}})} onToggle={row=>void execute({type:"set-asset-status",target:{id:row.id,version:row.version},status:row.status==="active"?"inactive":"active"})} onDelete={row=>{command.reset();setDeletion(row);}}/>
    {list.isError&&<Button onClick={()=>void list.refetch()}>다시 시도</Button>}
    {editor&&<SkillEditorDialog open detail={editor.detail} readOnly={Boolean(editor.detail&&!editor.detail.asset.capabilities.update)} onClose={()=>setEditor(null)}/>}
    {deletion&&access.grants.skills.delete&&list.data?.rows.items.some(row=>row.id===deletion.id&&row.capabilities.delete)&&<AssetDeleteDialog open asset={deletion} pending={command.isPending} error={command.error?.message??null} onClose={()=>setDeletion(null)} onConfirm={target=>void execute({type:"delete-asset",target})}/>}
  </AdminPage>;
}
