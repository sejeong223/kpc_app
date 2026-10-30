"use client";
import { Button } from "@fluentui/react-components";
import { Fragment,useEffect,useMemo,useState } from "react";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { useTemplateWork,useTemplateWorkCommand,useTemplateDownload } from "@/hooks/admin/use-template-work";
import { TemplateOptionsSchema } from "@/lib/pptx/options-schema";
import { clearPptxDownloads,downloadPptxBytes } from "@/lib/pptx/download";
import { AdminCard,AdminPage } from "@/components/admin/ui/AdminPrimitives";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import { ASSET_DATA_NOTICE } from "@/components/admin/assets/AssetListPanel";
import type { TemplateOptions } from "@/types/pptx-template";
import TemplateApplyOptions from "./TemplateApplyOptions";
import TemplateResultsPanel from "./TemplateResultsPanel";
import SharedDesignEditor from "./SharedDesignEditor";
import LatestVersionDialog from "./LatestVersionDialog";
import { WORK_STATUS } from "./TemplateWorkList";
interface TemplateWorkbenchProps {workId:string;onBack():void}
export default function TemplateWorkbench({workId,onBack}:TemplateWorkbenchProps){
  const {actor,works,access,revision}=useAdminRuntime(),query=useTemplateWork(workId),command=useTemplateWorkCommand(),cancel=useTemplateWorkCommand(),exporting=useTemplateDownload();
  const [latest,setLatest]=useState(false),[downloadError,setDownloadError]=useState("");
  const allowed=Boolean(access?.grants.templates.read&&access.grants.skills.read&&works.canAccess(actor,workId)),view=query.data;
  const templateRevision=view?.work.template.revisionId,resultId=view?.work.result?.id;
  // 외부 저장소의 권한·원본·결과가 바뀔 때만 큰 미리보기 사본을 다시 읽는다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data=useMemo(()=>allowed?{before:works.getPreview(actor,workId,"before"),after:works.getPreview(actor,workId,"after"),changes:works.getChanges(actor,workId),shared:works.getSharedDesigns(actor,workId)}:null,[actor,works,workId,allowed,revision,templateRevision,resultId]);
  useEffect(()=>()=>clearPptxDownloads(),[]);
  async function apply(mode:"pinned"|"latest"){if(!view)return;setLatest(false);try{await command.mutateAsync({type:"apply-work",target:{id:workId,version:view.work.version},mode});}catch{/* 서비스 오류는 화면에 표시한다. */}}
  async function options(value:TemplateOptions){
    if(!view)return;
    const focused=document.activeElement instanceof HTMLElement?document.activeElement:null,fileRefId=view.fileRefId;
    try{await command.mutateAsync({type:"update-work-options",target:{id:workId,version:view.work.version},options:TemplateOptionsSchema.parse(value)});}
    catch{/* 입력을 덮어쓰지 않고 현재 결과를 다시 확인한다. */}
    finally{requestAnimationFrame(()=>{
      if(!focused?.isConnected||!(document.activeElement===document.body||document.activeElement===focused))return;
      // 현재 사용자·소유권·접근 검사가 전환/폐기 뒤 포커스 복구를 차단한다.
      try{if(works.getWorkSnapshot(actor,workId).fileRefId===fileRefId)focused.focus({preventScroll:true});}catch{/* 권한 또는 문서가 바뀌면 복구하지 않는다. */}
    });}
  }
  async function download(){
    if(!view?.work.result)return;setDownloadError("");
    try{const result=await exporting.mutateAsync({workId,resultId:view.work.result.id});const current=await works.getWork(actor,workId);if(current.canDownload&&current.work.result?.id===view.work.result.id)downloadPptxBytes(result.bytes,result.filename);else setDownloadError("작업 설정이 변경되었습니다. 현재 결과를 확인하세요.");}
    catch(error){setDownloadError(error instanceof Error?error.message:"파일을 내려받지 못했습니다.");}finally{exporting.reset();}
  }
  if(!allowed)return <AdminPage title="적용 테스트" dataNotice={ASSET_DATA_NOTICE} actions={<Button onClick={onBack}>목록으로</Button>}><AdminAsyncState state="forbidden" message="현재 권한으로 이 작업을 열 수 없습니다."/></AdminPage>;
  if(!view||!data?.before)return <AdminPage title="적용 테스트" dataNotice={ASSET_DATA_NOTICE} actions={<Button onClick={onBack}>작업 닫기</Button>}><AdminAsyncState state={query.isError?"error":"loading"} message={query.error?.message} onRetry={()=>void query.refetch()}/></AdminPage>;
  const busy=command.isPending||view.work.status==="running",newer=view.newer.template||view.newer.skill;
  return <AdminPage title="PPT 적용 테스트" description={`${view.templateName} v${view.work.template.revision} × ${view.skillName} v${view.work.skill.revision}`} dataNotice={ASSET_DATA_NOTICE} actions={<>
    <Button onClick={onBack}>작업 닫기</Button>
    {view.work.status==="running"?<Button disabled={cancel.isPending} onClick={()=>cancel.mutate({type:"cancel-work",id:workId})}>적용 취소</Button>:<Button appearance="primary" disabled={busy||!view.canReapply} onClick={()=>void apply("pinned")}>{view.work.result?"현재 버전 재적용":"Skill 적용 및 비교"}</Button>}
    {newer&&view.canApplyLatest&&<Button disabled={busy} onClick={()=>setLatest(true)}>최신 버전 재적용</Button>}
    {view.canDownload&&<Button disabled={exporting.isPending||busy} onClick={()=>void download()}>PPTX 다운로드</Button>}
  </>}>
    <div role="status" aria-live="polite" className="tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:p-3"><strong>{WORK_STATUS[view.work.status]}</strong> · {view.work.progress||"설정을 확인하고 적용하세요."}{newer&&<p className="tw:mb-0 tw:font-semibold tw:text-(--kpc-brand)">새 버전 있음 · {view.newer.template?"Template ":""}{view.newer.skill?"Skill":""} · 기존 결과는 유지됩니다.</p>}</div>
    {view.work.result&&view.work.result.inputRevision!==view.work.inputRevision&&<p role="status">현재 옵션은 아직 적용하지 않았습니다. 아래는 이전 성공 결과이며 재적용 후 다운로드할 수 있습니다.</p>}
    {(view.work.error||command.error||cancel.error||downloadError)&&<p role="alert" className="tw:text-(--kpc-danger)">{downloadError||command.error?.message||cancel.error?.message||view.work.error?.message}</p>}
    <Fragment key={workId+":"+view.fileRefId}>
    <div className="tw:grid tw:items-start tw:gap-4 tw:xl:grid-cols-2"><AdminCard title="현재 작업 적용 설정"><TemplateApplyOptions document={data.before} value={view.work.options} disabled={busy} onChange={value=>void options(value)}/></AdminCard><AdminCard title="마스터·레이아웃 공유 디자인"><SharedDesignEditor items={data.shared} value={view.work.options.sharedEdits} disabled={busy} onChange={sharedEdits=>void options({...view.work.options,sharedEdits})}/></AdminCard></div>
    <TemplateResultsPanel before={data.before} after={data.after} changes={data.changes} warnings={view.work.result?.warnings??data.before.warnings}/>
    </Fragment>
    {latest&&<LatestVersionDialog open view={view} pending={busy} onClose={()=>setLatest(false)} onConfirm={()=>void apply("latest")}/>}
  </AdminPage>;
}
