# 작업 메뉴 회귀 검증 재현 코드

- 기준: 2026-11-04, 원본 커밋 `63f7e3b` + 회귀 수정 작업 트리.
- 실제 브라우저를 실행하지 않는다. jsdom과 독립 IDBFactory를 사용한다.
- 원본 커밋의 헤더를 메모리에서만 비교하며 작업 트리를 되돌리지 않는다.
- `tests/` 생성·복원·수정 없음. 아래 코드는 표준 입력으로 각각 별도 Node 프로세스에서 실행한다.

```powershell
@'
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const source = fs.readFileSync('.memory/reports/2026-11-04-workspace-regression-checks.md', 'utf8');
let index = 0;
for (const match of source.matchAll(/```javascript\r?\n([\s\S]*?)\r?\n```/g)) {
  console.log('검증 프로그램 ' + (++index));
  const result = spawnSync(process.execPath, ['--require', 'tsx/cjs', '-'], { input: match[1], encoding: 'utf8' });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (index !== 9) throw new Error('검증 코드 개수가 변경되었습니다.');
'@ | node -
```

## 도메인 권한·회차·헤더·과거 파일

```javascript

const assert=require("node:assert/strict");
const {createWorkspaceState,applyWorkspaceMutation}=require("./lib/workspace/production/domain.ts");
const {createEmptyFileProject}=require("./lib/workspace/files/domain.ts");
const {projectCanvasSnapshot,canvasCapabilities}=require("./lib/workspace/production/canvas-comments.ts");
const {getCompletionSummary}=require("./lib/workspace/production/selectors.ts");
const ids={pm:"entra:oid:pm",a:"entra:oid:a",b:"entra:oid:b",super:"entra:oid:super"};
let seq=0;
const project={id:"p",number:"P",name:"검증",departmentId:null,pmId:ids.pm,pmName:"PM",memberIds:Object.values(ids)};
const members=Object.values(ids).map(id=>({id,adminUserId:id,name:id,departmentId:null,departmentName:"",email:null,role:id===ids.super?"super_admin":"user"}));
const context=(who="pm")=>({identity:{namespace:"files:"+ids[who],actor:{id:ids[who],name:ids[who],role:who==="super"?"super_admin":"user",isMock:false}},project,members,now:"2026-11-04T00:00:00.000Z",newId:()=>"generated-"+(++seq)});
let files=createEmptyFileProject(context()), state=createWorkspaceState(context(),files);
const execute=(who,operation,extra={})=>{
 const result=applyWorkspaceMutation(state,{projectId:"p",expectedRevision:state.revision,expectedRound:state.currentRound,operation,...extra},context(who),files);
 state=result.receipt.state;files=result.files;return result.receipt;
};
const create=(id)=>({type:"canvas-command",command:{type:"create-thread",threadId:id,messageId:id+"-root",point:{xRatio:.3,yRatio:.6},draft:{text:"검토",mentions:[]}}});
const canvas=(who,command)=>execute(who,{type:"canvas-command",command});
execute("a",create("closed"));
assert.throws(()=>canvas("b",{type:"set-status",threadId:"closed",expectedRevision:1,status:"resolved"}),e=>e.code==="FORBIDDEN");
assert.throws(()=>canvas("pm",{type:"edit-message",messageId:"closed-root",expectedRevision:1,draft:{text:"타인 수정",mentions:[]}}),e=>e.code==="FORBIDDEN");
canvas("pm",{type:"set-status",threadId:"closed",expectedRevision:1,status:"resolved"});
assert.throws(()=>canvas("a",{type:"reply",threadId:"closed",messageId:"blocked",draft:{text:"추가",mentions:[]}}),e=>e.code==="VALIDATION");
execute("a",create("open"));
canvas("b",{type:"reply",threadId:"open",messageId:"reply",draft:{text:"답글",mentions:[]}});
canvas("b",{type:"move-thread",threadId:"open",expectedRevision:2,point:{xRatio:.2,yRatio:.4}});
const stable=JSON.stringify(state);
assert.throws(()=>execute("a",create("open")));
assert.equal(JSON.stringify(state),stable);
assert.throws(()=>execute("a",create("stale"),{expectedRevision:1}),e=>e.code==="CONFLICT");
assert.throws(()=>canvas("a",{type:"create-thread",threadId:"bad",messageId:"bad-root",point:{xRatio:2,yRatio:0},draft:{text:"검토",mentions:[]}}));
assert.throws(()=>canvas("a",{type:"create-thread",threadId:"mention",messageId:"mention-root",point:{xRatio:0,yRatio:0},draft:{text:"@외부",mentions:[{userId:"outsider",name:"외부",start:0,end:3}]}}));
assert.equal(getCompletionSummary(state).openComments,1);
assert.equal(canvasCapabilities(state,context("b"),false).statusThreadIds.length,0);
const scoped=projectCanvasSnapshot(state,context(),context().now);
assert.notEqual(scoped.scope.namespace,projectCanvasSnapshot(state,context("a"),context().now).scope.namespace);
const pruned=projectCanvasSnapshot(state,{...context(),members:members.filter(m=>m.id===ids.pm)},context().now);
assert.equal(pruned.messages.length,3);
execute("pm",{type:"complete",expectedFileRevision:files.revision,acknowledged:true});
const snapshot=structuredClone(state.snapshots[0]);
assert.throws(()=>execute("a",create("completed")),e=>e.code==="READ_ONLY");
assert.throws(()=>execute("pm",{type:"start-round",expectedFileRevision:files.revision+1,acknowledged:true}),e=>e.code==="CONFLICT");
execute("pm",{type:"start-round",expectedFileRevision:files.revision,acknowledged:true});
assert.equal(files.currentRound,2);assert.equal(state.currentRound,2);
assert.deepEqual(state.snapshots[0],snapshot);
assert.equal(state.body.canvasComments.threads.length,1);
assert.equal(state.body.canvasComments.messages.length,2);
assert.deepEqual(state.body.canvasComments.threads[0].carriedFrom,{round:1,threadId:"open"});
assert.notEqual(state.body.canvasComments.threads[0].id,"open");
assert.equal(state.body.canvasComments.messages.some(m=>["open-root","reply"].includes(m.id)),false);
canvas("super",{type:"set-status",threadId:state.body.canvasComments.threads[0].id,expectedRevision:1,status:"resolved"});
execute("pm",{type:"start-round",expectedFileRevision:files.revision,acknowledged:true});
assert.equal(state.snapshots[1].kind,"unfinished");
assert.equal(state.body.canvasComments.threads.length,0);
console.log("화면 의견 권한·검증·원본 불변·완성/미완성 회차 계승 통과");

const {selectProjectView}=require("./lib/workspace/production/selectors.ts");
const {selectWorkspaceHeader,getWorkspaceHeaderMetadata,canReviewProject}=require("./lib/workspace/production/header-selectors.ts");
const batchRevision=state.revision, inputRevision=state.inputRevision;
execute("pm",{type:"set-grants-batch",grants:[{userId:ids.a,permissions:["outline"]},{userId:ids.b,permissions:["complete"]}]});
assert.equal(state.revision,batchRevision+1);assert.equal(state.inputRevision,inputRevision);
const batchOriginal=structuredClone(state);
assert.throws(()=>execute("pm",{type:"set-grants-batch",grants:[{userId:ids.a,permissions:[]},{userId:ids.pm,permissions:[]}]}));
assert.deepEqual(state,batchOriginal);
assert.throws(()=>execute("a",{type:"set-grants-batch",grants:[{userId:ids.b,permissions:[]}]}),e=>e.code==="FORBIDDEN");
assert.throws(()=>execute("pm",{type:"set-grants-batch",grants:[{userId:ids.super,permissions:[]}]}));
execute("pm",{type:"set-grants",userId:ids.a,permissions:[]});
assert.equal(state.grants.some(g=>g.userId===ids.a),false);
const view=selectProjectView({state,files},context(),[]);
const selection={projectId:"p",sectionId:null,slideId:null,snapshotId:null};
const metadata=getWorkspaceHeaderMetadata("p",[{id:"p",budgetKrw:0}]);
assert.deepEqual(metadata,{organization:null,dueDate:null,budgetKrw:0});
assert.equal(getWorkspaceHeaderMetadata("missing",[]).dueDate,null);
const header=selectWorkspaceHeader(view,selection,metadata);
assert.equal(header.canReview,true);
assert.equal(header.completedVersions,1);
assert.equal(header.currentRound,3);
assert.equal(canReviewProject({...view,actor:{id:ids.a,role:"user"}}),false);
assert.equal(canReviewProject({...view,actor:{id:ids.super,role:"super_admin"}}),true);
const historyHeader=selectWorkspaceHeader(view,{...selection,snapshotId:state.snapshots[0].id},metadata);
assert.equal(historyHeader.readOnly,true);assert.equal(historyHeader.displayedRound,1);
assert.equal(historyHeader.currentRound,3);assert.equal(historyHeader.canManagePermissions,false);
assert.equal(Object.values(historyHeader.actions).some(Boolean),false);
assert.throws(()=>selectWorkspaceHeader(view,{...selection,projectId:"other"},metadata));
assert.throws(()=>selectWorkspaceHeader(view,{...selection,snapshotId:"missing"},metadata));
console.log("헤더 실제 집계·권한·이력·권한 배치 원자성 검증 통과");

const {selectFileSnapshot}=require("./lib/workspace/production/file-history.ts");
const historyBundle=structuredClone({state,files});
historyBundle.files.assets=[{id:"asset",ownerId:ids.pm,ownerName:"PM",createdAt:context().now,sourceKind:"file"}];
historyBundle.files.versions=[{id:"v1",assetId:"asset",category:"proposal",createdInRound:1,createdAt:context().now,createdBy:ids.pm,label:"old.txt",kind:"rfp",priority:"required",instruction:"",source:{type:"file",blobId:"blob1",filename:"old.txt",extension:".txt",mediaType:"text/plain",byteLength:1,lastModified:0}}];
historyBundle.files.versions.push({...historyBundle.files.versions[0],id:"v2",createdInRound:3,label:"new.txt"});
historyBundle.state.snapshots[0].fileEntries=[{assetId:"asset",versionId:"v1"}];
historyBundle.files.rounds[0].entries=[{assetId:"asset",versionId:"v2"}];
const saved=JSON.stringify(historyBundle),pastFiles=selectFileSnapshot(historyBundle,context(),snapshot.id);
assert.equal(pastFiles.rounds[0].resources[0].version.id,"v1");assert.equal(pastFiles.currentRound,1);assert.equal(pastFiles.canAdd,false);assert.equal(pastFiles.rounds[0].resources[0].canManage,false);assert.equal(JSON.stringify(historyBundle),saved);
assert.throws(()=>selectFileSnapshot(historyBundle,context(),"absent"),e=>e.code==="NOT_FOUND");
historyBundle.files.versions=historyBundle.files.versions.filter(v=>v.id!=="v1");assert.throws(()=>selectFileSnapshot(historyBundle,context(),snapshot.id),e=>e.code==="STORAGE");
console.log("T08 exact snapshot, missing version: passed");

```

## 격리 IndexedDB·스키마 호환·Blob

```javascript

const assert=require('node:assert/strict');
const {IDBFactory}=require('fake-indexeddb');
const {IndexedDbWorkspaceRepository}=require('./services/workspace/IndexedDbWorkspaceRepository.ts');
const {IndexedDbFileRepository}=require('./services/workspace/IndexedDbFileRepository.ts');
const {StoredWorkspaceStateSchema}=require('./lib/workspace/production/state-compatibility.ts');
const {selectFileSnapshot}=require('./lib/workspace/production/file-history.ts');
const {WorkspaceStateSchema}=require('./lib/workspace/production/schemas.ts');
(async()=>{
const factory=new IDBFactory(),dbName='isolated-workspace-verification',now='2026-11-04T00:00:00.000Z';let seq=0;
const ids={pm:'entra:oid:pm',a:'entra:oid:a',b:'entra:oid:b',super:'entra:oid:super'};
const identity=who=>({namespace:'files:'+ids[who],actor:{id:ids[who],name:who,role:who==='super'?'super_admin':'user',isMock:false}});
const project={id:'p',number:'P',name:'검증',departmentId:null,pmId:ids.pm,pmName:'pm',memberIds:Object.values(ids)};
const members=Object.values(ids).map(id=>({id,adminUserId:id,name:id,departmentId:null,departmentName:'',email:null,role:id===ids.super?'super_admin':'user'}));
const catalog={list:()=>[project,{...project,id:'other'}],get:id=>['p','other'].includes(id)?{...project,id}:null,members:()=>members};
const opts=who=>({identity:identity(who),catalog,factory,dbName,now:()=>now,newId:()=> 'gen-'+(++seq)});
const pm=new IndexedDbWorkspaceRepository(opts('pm')),otherActor=new IndexedDbWorkspaceRepository(opts('a')),fr=new IndexedDbFileRepository(opts('pm'));
const raw=async(store,mode,operation)=>{const db=await new Promise((resolve,reject)=>{const r=factory.open(dbName,2);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return new Promise((resolve,reject)=>{const tx=db.transaction(store,mode),req=operation(tx.objectStore(store));let result;req.onsuccess=()=>{result=req.result;};tx.oncomplete=()=>{db.close();resolve(result)};tx.onabort=()=>{db.close();reject(tx.error)};});};
const ns=identity('pm').namespace,readRaw=()=>raw('workspaces','readonly',s=>s.get([ns,'p'])),writeRaw=state=>raw('workspaces','readwrite',s=>s.put({namespace:ns,projectId:'p',state}));
let bundle=await pm.load('p');
const file=new File(['original content'],'source.txt',{type:'text/plain',lastModified:0});
await fr.execute({projectId:'p',expectedRevision:bundle.files.revision,expectedRound:1,operation:{type:'add-files',category:'proposal',files:[{file,kind:'rfp',priority:'required',instruction:'원본 유지'}]}});
bundle=await pm.load('p');const firstFile=bundle.files.versions[0];
const legacy=structuredClone(bundle.state);legacy.schemaVersion=1;delete legacy.body.canvasComments;
await writeRaw(legacy);
assert.equal((await pm.load('p')).state.schemaVersion,2);assert.equal((await readRaw()).state.schemaVersion,1);
assert.equal(await (await fr.readOriginal({projectId:'p',round:1,versionId:firstFile.id})).text(),'original content');
assert.equal((await readRaw()).state.schemaVersion,1);
const command=async(repo,operation)=>{const {state}=await repo.load('p');return repo.execute({projectId:'p',expectedRevision:state.revision,expectedRound:state.currentRound,operation});};
await command(pm,{type:'set-grants-batch',grants:[{userId:ids.a,permissions:['outline']},{userId:ids.b,permissions:['complete']}]});
assert.equal((await readRaw()).state.schemaVersion,2);
const stable=await pm.load('p');
await assert.rejects(command(pm,{type:'set-grants-batch',grants:[{userId:ids.a,permissions:[]},{userId:ids.pm,permissions:[]}]}));
assert.deepEqual(await pm.load('p'),stable);
await assert.rejects(command(otherActor,{type:'set-grants-batch',grants:[{userId:ids.b,permissions:[]}]}),e=>e.code==='FORBIDDEN');
assert.equal((await otherActor.load('p')).state.grants.length,0);
assert.equal((await pm.load('other')).state.body.canvasComments.threads.length,0);
const create=id=>({type:'canvas-command',command:{type:'create-thread',threadId:id,messageId:id+'-root',point:{xRatio:.25,yRatio:.5},draft:{text:'의견',mentions:[]}}});
await command(pm,create('resolved'));await command(pm,{type:'canvas-command',command:{type:'set-status',threadId:'resolved',expectedRevision:1,status:'resolved'}});
await command(pm,create('open'));await command(pm,{type:'canvas-command',command:{type:'reply',threadId:'open',messageId:'reply',draft:{text:'답글',mentions:[]}}});
await assert.rejects(command(pm,create('open')));
bundle=await pm.load('p');
await assert.rejects(command(pm,{type:'complete',expectedFileRevision:bundle.files.revision+1,acknowledged:true}),e=>e.code==='CONFLICT');
assert.deepEqual(await pm.load('p'),bundle);
await command(pm,{type:'complete',expectedFileRevision:bundle.files.revision,acknowledged:true});
bundle=await pm.load('p');const snap=structuredClone(bundle.state.snapshots[0]);
await assert.rejects(command(pm,create('no-write')),e=>e.code==='READ_ONLY');
await command(pm,{type:'start-round',expectedFileRevision:bundle.files.revision,acknowledged:true});
bundle=await pm.load('p');assert.equal(bundle.state.currentRound,2);assert.equal(bundle.files.currentRound,2);assert.deepEqual(bundle.state.snapshots[0],snap);
assert.equal(bundle.state.body.canvasComments.threads.length,1);assert.equal(bundle.state.body.canvasComments.messages.length,2);assert.deepEqual(bundle.state.body.canvasComments.threads[0].carriedFrom,{round:1,threadId:'open'});
await fr.execute({projectId:'p',expectedRevision:bundle.files.revision,expectedRound:2,operation:{type:'edit',assetId:firstFile.assetId,sourceVersionId:firstFile.id,settings:{kind:'other',priority:'excluded',instruction:'새 설정'},web:null}});
bundle=await pm.load('p');const context={identity:identity('pm'),project,members,now,newId:()=> 'unused'};
const historical=selectFileSnapshot(bundle,context,snap.id);assert.equal(historical.rounds[0].resources[0].version.id,firstFile.id);assert.equal(historical.rounds[0].resources[0].version.priority,'required');assert.equal(historical.canAdd,false);
assert.equal(await (await fr.readOriginal({projectId:'p',round:1,versionId:firstFile.id})).text(),'original content');
await command(pm,{type:'start-round',expectedFileRevision:bundle.files.revision,acknowledged:true});bundle=await pm.load('p');assert.equal(bundle.state.snapshots[1].kind,'unfinished');
// 과거 사본과 되돌리기 내용을 가진 v1은 각 body를 독립적으로 업그레이드한다.
const legacyFull=structuredClone(bundle.state);legacyFull.schemaVersion=1;
for(const body of [legacyFull.body,...legacyFull.snapshots.map(s=>s.body)])delete body.canvasComments;
legacyFull.undo={id:'undo',actorId:ids.pm,expiresAt:'2026-11-05T00:00:00.000Z',afterRevision:legacyFull.revision,round:legacyFull.currentRound,label:'복원',previousBody:structuredClone(legacyFull.body),sectionIds:[],permission:'outline'};
const beforeLegacy=JSON.stringify(legacyFull),converted=StoredWorkspaceStateSchema.parse(legacyFull);assert.equal(JSON.stringify(legacyFull),beforeLegacy);assert.equal(converted.snapshots.length,legacyFull.snapshots.length);assert.deepEqual(converted.snapshots.map(s=>s.fileEntries),legacyFull.snapshots.map(s=>s.fileEntries));
assert.deepEqual(converted.undo.previousBody.canvasComments,{nextNumber:1,threads:[],messages:[]});assert.equal(converted.undo.afterRevision,legacyFull.undo.afterRevision);
const valid=structuredClone(bundle.state),corrupt=structuredClone(valid);corrupt.body.canvasComments.nextNumber=0;await writeRaw(corrupt);await assert.rejects(pm.load('p'),e=>e.code==='STORAGE');assert.deepEqual((await readRaw()).state,corrupt);await writeRaw(valid);
assert.ok(WorkspaceStateSchema.safeParse((await pm.load('p')).state).success);
await assert.rejects(async()=>pm.load('no-project'));
pm.close();otherActor.close();fr.close();
console.log('T10 repository: migration read/write, Blob preservation, batch rollback, scope isolation, canvas rounds, exact history, corrupt no seed passed');
})().catch(e=>{console.error(e);process.exitCode=1;});

```

## 파일 초안 보존 컴포넌트 경계

```javascript
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom'); const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','HTMLInputElement','HTMLTextAreaElement','Element','Event','MouseEvent','navigator'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.React=require('react'); const {act,createElement:h,useState}=React;const {createRoot}=require('react-dom/client');
const Module=require('module'),original=Module._load;
let selection={selection:{projectId:'p',snapshotId:null},projects:[{id:'p'}],pending:false,error:null};
let header={state:{status:'ready',model:{currentRound:1,phase:'writing'}}};
const data={currentRound:1,revision:1,currentCount:0,canAdd:true,rounds:[{number:1,resources:[]}]};
const command={reset(){},isPending:false,error:null};
const Pass=({children})=>h('div',null,children);
const mocks={
'@/components/layout/WorkspacePage':{default:Pass},'@/components/admin/ui/AdminAsyncState':{default:({state})=>h('p',null,state)},
'@/hooks/workspace/use-workspace-files':{useFileCommand:()=>command,useFileWorkspace:()=>({data,isPending:false,isFetching:false,error:null}),useWorkspaceFileHistory:()=>({})},
'@/hooks/workspace/use-workspace-selection':{useWorkspaceSelection:()=>selection},
'@/hooks/workspace/use-file-draft-guard':{useFileDraftGuard:()=>({request:fn=>fn()})},
'@/components/common/ProjectHeaderProvider':{useProjectHeader:()=>header},
'@/components/common/ProjectHeader':{default:()=>null},
'./FileRoundSection':{default:({onAdd})=>h('button',{onClick:()=>onAdd('web')},'add')},
'./WebReferenceDialog':{default:()=>{const [text,setText]=useState('');return h('input',{id:'draft',value:text,onChange:e=>setText(e.target.value)});}},
};
Module._load=function(id,...args){return mocks[id]?{__esModule:true,...mocks[id]}:original.call(this,id,...args);};
const Files=require('./components/workspace/files/FilesWorkspace.tsx').default;
const root=createRoot(document.getElementById('root'));
(async()=>{
await act(async()=>root.render(h(Files,{onReconnect(){}})));
await act(async()=>document.querySelector('button').click());
await act(async()=>{const input=document.getElementById('draft');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'작업 중 초안');input.dispatchEvent(new Event('input',{bubbles:true}));});
const before=document.getElementById('draft');assert.equal(before.value,'작업 중 초안');
header={state:{status:'error',model:null}};selection={...selection,error:new Error('일시적 조회 실패')};
await act(async()=>root.render(h(Files,{onReconnect(){}})));
assert.equal(document.getElementById('draft'),before);assert.equal(before.value,'작업 중 초안');console.log('PASS file draft survives background header error');
await act(async()=>root.unmount());dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1});
```

## 공통 선택 실패·잘못된 URL·복구

```javascript
const assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'http://localhost/workspace/files',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','Element','Event','navigator'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.React=require('react');const {act,createElement:h}=React,{createRoot}=require('react-dom/client');
const query=require('@tanstack/react-query'),client=new query.QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{gcTime:0}}});
const Module=require('module'),load=Module._load;let path='/workspace/files',params=new URLSearchParams('project=p'),memory=null,failed=true,choice,readCount=0;
const listeners=new Set(),projects=[{id:'p'},{id:'q'}],view=id=>({project:{id},state:{body:{sections:[],slides:[]},snapshots:[]}});
const router={replace:href=>{const url=new URL(href,'http://localhost');path=url.pathname;params=url.searchParams;},push(){}};
const runtime={queryScope:['integration-selection'],isActive:()=>true,fileRuntime:{service:{listProjects:async()=>projects,getSelection:async()=>null,selectProject:async id=>{if(failed)throw new Error('선택 저장 실패');}}},selection:{get:()=>memory,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},set:v=>{memory=v;for(const fn of listeners)fn()}},navigate:fn=>fn()};
const mocks={'next/navigation':{useRouter:()=>router,usePathname:()=>path,useSearchParams:()=>params},
'./WorkspaceProjectProvider':{useOptionalWorkspaceRuntime:()=>runtime},
'@/hooks/workspace/use-workspace-production':{workspaceQueryOptions:{retry:false,gcTime:0},activeWorkspaceRead:(_r,fn)=>fn(),loadProjectView:async(_r,id)=>view(id),useProjectWorkspace:id=>query.useQuery({queryKey:['views',id],enabled:!!id,queryFn:async()=>{readCount++;return view(id)}})}};
Module._load=function(id,...args){return mocks[id]?{__esModule:true,...mocks[id]}:load.call(this,id,...args)};
const {default:Provider,useWorkspaceSelectionContext}=require('./components/workspace/WorkspaceSelectionProvider.tsx');
function Probe(){choice=useWorkspaceSelectionContext();return h('p',null,choice.selection.projectId)}
const root=createRoot(document.getElementById('root'));const render=()=>root.render(h(query.QueryClientProvider,{client},h(Provider,null,h(Probe))));
const settle=async()=>{for(let i=0;i<5;i++)await act(async()=>{await new Promise(r=>setTimeout(r,5))})};
(async()=>{
await act(async()=>render());await settle();assert.equal(choice.selection.projectId,'p');assert.equal(choice.error,null);
await act(async()=>{try{await choice.choose({projectId:'q',sectionId:null,slideId:null,snapshotId:null})}catch(e){assert.match(e.message,/실패/)}});await settle();
assert.equal(choice.selection.projectId,'p');assert.equal(choice.error,null);console.log('PASS failed selection preserves current project availability');
path='/workspace/toc';params=new URLSearchParams('project=p');await act(async()=>render());await settle();
assert.equal(choice.selection.projectId,'p');assert.equal(choice.error,null);console.log('PASS navigation after failed selection recovers');
failed=false;await act(async()=>{await choice.choose({projectId:'q',sectionId:null,slideId:null,snapshotId:null})});await settle();
assert.equal(choice.selection.projectId,'q');assert.equal(memory.projectId,'q');console.log('selection success: PASS');

params=new URLSearchParams('project=forbidden');await act(async()=>render());await settle();assert.equal(choice.selection.projectId,null);assert.equal(choice.error.code,'FORBIDDEN');
params=new URLSearchParams('project=p&project=q');await act(async()=>render());await settle();assert.equal(choice.selection.projectId,null);assert.equal(choice.error.code,'VALIDATION');
params=new URLSearchParams('project=p&snapshot=missing');await act(async()=>render());await settle();assert.equal(choice.selection.projectId,null);assert.equal(choice.error.code,'NOT_FOUND');
params=new URLSearchParams('project=p');await act(async()=>render());await settle();assert.equal(choice.selection.projectId,'p');assert.equal(choice.error,null);
console.log('PASS invalid/deleted/duplicate deep links denied and corrected URL recovers');
await act(async()=>root.unmount());client.clear();dom.window.close();
})().catch(e=>{console.error(e);client.clear();dom.window.close();process.exitCode=1});
```

## 권한 초안 회차 변경 전후 비교

```javascript
const assert=require('node:assert/strict'),{JSDOM}=require('jsdom');const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'http://localhost',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','HTMLInputElement','Element','Event','navigator'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.React=require('react');const {createElement:h,act,useState}=React,{createRoot}=require('react-dom/client');
const Module=require('module'),load=Module._load;let selection={projectId:'p',snapshotId:null};
const model={projectId:'p',currentRound:1,displayedRound:1,pmId:'pm',pmName:'PM',members:[],totalSections:0,doneSections:0,openComments:0,budgetKrw:null,snapshotId:null,history:[],actions:{},canManagePermissions:true};
let ready={status:'ready',view:{project:{id:'p'},actor:{id:'pm'},state:{pptVersions:[]}},model,error:null},context={state:ready,selection,projects:[],pending:false};
const Button=({children,onClick,disabled})=>h('button',{onClick,disabled},children);
const mocks={
'@/components/comments/CommentsProvider':{useComments:()=>({controller:null})},
'@/components/layout/WorkspaceHeader':{default:({leading,actions})=>h('div',null,leading,actions)},
'@/components/layout/WorkspacePage':{default:()=>null},
'@/components/workspace/WorkspaceProjectProvider':{useWorkspaceRuntime:()=>({navigate:fn=>fn()})},
'@/hooks/workspace/use-workspace-selection':{useWorkspaceSelection:()=>({selection})},
'@/hooks/workspace/use-workspace-ppt':{useWorkspacePpt:()=>({task:{}})},
'@/hooks/workspace/use-project-round':{useProjectRound:()=>({busy:false,dialog:null,error:null})},
'./Button':{default:Button},
'@/components/ui/DadamControls':{DadamSelect:({children,value,onChange})=>h('select',{value,onChange},children)},
'./ProjectHeaderProvider':{useProjectHeader:()=>context},
'./ProjectSettingsDrawer':{default:()=>{const [value,setValue]=useState('draft');return h('input',{id:'permission-draft',value,onChange:e=>setValue(e.target.value)})}}
};
Module._load=function(id,...args){return mocks[id]?{__esModule:true,...mocks[id]}:load.call(this,id,...args)};
async function check(Header,label){context={...context,state:ready};const root=createRoot(document.getElementById('root'));
await act(async()=>root.render(h(Header,{title:'파일 업로드'})));await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='설정').click());
const before=document.getElementById('permission-draft');assert.ok(before);
context={...context,state:{...ready,model:{...model,currentRound:2,displayedRound:2}}};await act(async()=>root.render(h(Header,{title:'파일 업로드'})));
const kept=document.getElementById('permission-draft')===before;console.log(label+': '+kept);await act(async()=>root.unmount());return kept;}
(async()=>{const path=require('path').resolve('components/common/ProjectHeader.tsx');const source=require('child_process').execFileSync('git',['show','63f7e3b94a8bfff25f3d616262e58814168c4ab2:components/common/ProjectHeader.tsx'],{encoding:'utf8'}),ts=require('typescript');
const old=new Module(path,module);old.filename=path;old.paths=module.paths;old._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,path);
assert.equal(await check(old.exports.default,'before: round change retains settings'),false);
assert.equal(await check(require('./components/common/ProjectHeader.tsx').default,'after: round change retains settings'),true);
dom.window.close();})().catch(e=>{console.error(e);process.exitCode=1});

```

## 실제 Query·코멘트·회차 통합

```javascript
const assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),{IDBFactory}=require('fake-indexeddb');
const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'http://localhost/workspace/write',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','Element','Event','navigator'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.React=require('react');
const {act,createElement:h,StrictMode}=React,{createRoot}=require('react-dom/client'),{QueryClient,QueryClientProvider}=require('@tanstack/react-query');
const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{gcTime:0}}});
const {createWorkspaceRuntime}=require('./services/workspace/createWorkspaceRuntime.ts');
const actor={id:'entra:oid:pm',name:'PM',role:'user',isMock:false},identity={namespace:'files:'+actor.id,actor};
const project={id:'p',number:'P',name:'검증',departmentId:null,pmId:actor.id,pmName:actor.name,memberIds:[actor.id,'entra:oid:writer']};
const members=project.memberIds.map(id=>({id,adminUserId:id,name:id,departmentId:null,departmentName:'',email:null,role:'user'}));
const catalog={list:()=>[project,{...project,id:'q'}],get:id=>['p','q'].includes(id)?{...project,id}:null,members:()=>members};
const scope=createWorkspaceRuntime({identity,catalog,host:{subscribe:()=>()=>{},getRevision:()=>1,checkWorkspaceAsset:()=>({allowed:true})},getActor:()=>({}),client,instanceId:'regression',reconnect(){},factory:new IDBFactory(),dbName:'isolated-hooks'});
const runtime=scope.runtime;const release=scope.retain();let path='/workspace/write',params=new URLSearchParams('project=p'),choice,comments,guard,readFailure=false,failAfterCommit=false;
const originalRead=runtime.service.load.bind(runtime.service);runtime.service.load=async(...args)=>{if(readFailure)throw new Error('재조회 실패');return originalRead(...args)};
const originalExecute=runtime.service.execute.bind(runtime.service);runtime.service.execute=async(...args)=>{const result=await originalExecute(...args);if(failAfterCommit)readFailure=true;return result};
const router={replace:href=>{const u=new URL(href,'http://localhost');path=u.pathname;params=u.searchParams},push(){}};
const Module=require('module'),load=Module._load;const mocks={
'next/navigation':{useRouter:()=>router,usePathname:()=>path,useSearchParams:()=>params},
'./WorkspaceProjectProvider':{useOptionalWorkspaceRuntime:()=>runtime},
'@/components/workspace/WorkspaceProjectProvider':{useWorkspaceRuntime:()=>runtime,useOptionalWorkspaceRuntime:()=>runtime},
'@/components/admin/AdminRuntimeProvider':{useAdminRuntime:()=>({revision:1})},
'@/components/workspace/files/FileDiscardDialog':{default:props=>{guard=props;return null}},
'@/components/providers/DadamThemeScope':{default:({children})=>children},
};
Module._load=function(id,...args){return mocks[id]?{__esModule:true,...mocks[id]}:load.call(this,id,...args)};
const {default:Selection,useWorkspaceSelectionContext}=require('./components/workspace/WorkspaceSelectionProvider.tsx');
const Canvas=require('./components/comments/ProjectCanvasCommentsProvider.tsx').default,{CommentsContext}=require('./components/comments/comments-context.ts');
function Probe(){choice=useWorkspaceSelectionContext();comments=React.useContext(CommentsContext);return h('p',null,comments.state.status)}
const root=createRoot(document.getElementById('root'));
const render=()=>root.render(h(StrictMode,null,h(QueryClientProvider,{client},h(Selection,null,h(Canvas,null,h(Probe))))));
const settle=async()=>{for(let i=0;i<12;i++)await act(async()=>{await new Promise(r=>setTimeout(r,5))})};
const next=id=>({projectId:id,sectionId:null,slideId:null,snapshotId:null});
(async()=>{
await act(async()=>render());await settle();assert.equal(comments.state.status,'ready');assert.equal(comments.state.snapshot.threads.length,0);
const firstController=comments.controller;
await act(async()=>{comments.controller.placePin({xRatio:.3,yRatio:.4});comments.controller.setDraft('new',{text:'영속 의견',mentions:[]});});
await act(async()=>assert.equal((await comments.controller.submitNew()).ok,true));await settle();
assert.equal(comments.state.snapshot.threads.length,1);assert.equal((await originalRead('p')).state.body.canvasComments.messages[0].text,'영속 의견');
console.log('PASS StrictMode + real Query/IDB comment create');
await act(async()=>{comments.controller.placePin({xRatio:.5,yRatio:.6});comments.controller.setDraft('new',{text:'보존할 초안',mentions:[]})});await settle();
let transition;await act(async()=>{transition=choice.choose(next('q'))});assert.equal(guard.open,true);
await act(async()=>{guard.onKeep();await transition});assert.equal(choice.selection.projectId,'p');assert.equal(comments.state.drafts.new.text,'보존할 초안');
await act(async()=>{transition=choice.choose(next('q'))});await act(async()=>{guard.onDiscard();await transition});await settle();
assert.equal(choice.selection.projectId,'q');assert.equal(comments.state.snapshot.threads.length,0);assert.notEqual(comments.controller,firstController);
await act(async()=>choice.choose(next('p')));await settle();assert.equal(comments.state.snapshot.threads.length,1);
console.log('PASS guarded cancel/discard + project isolation + reload');
await act(async()=>{comments.controller.placePin({xRatio:.5,yRatio:.6});comments.controller.setDraft('new',{text:'재조회 중 초안',mentions:[]})});
const preservedController=comments.controller;readFailure=true;
await act(async()=>{await client.invalidateQueries()});await settle();assert.equal(comments.controller,null);
readFailure=false;await act(async()=>{await client.invalidateQueries()});await settle();
assert.equal(comments.controller,preservedController);assert.equal(comments.state.drafts.new.text,'재조회 중 초안');
console.log('PASS background error recovery preserves canvas draft');
failAfterCommit=true;let result;
await act(async()=>{result=await comments.controller.submitNew()});await settle();
const persisted=await originalRead('p');
assert.equal(result.ok,true);assert.equal(persisted.state.body.canvasComments.messages.length,2);assert.equal(preservedController.getSnapshot().drafts.new,undefined);console.log('PASS committed comment survives refresh failure without duplicate draft');
readFailure=false;failAfterCommit=false;await act(async()=>client.invalidateQueries());await settle();
await act(async()=>preservedController.discardDrafts());await settle();
let bundle=await originalRead('p');await act(async()=>{await runtime.service.execute({projectId:'p',expectedRevision:bundle.state.revision,expectedRound:1,operation:{type:'complete',acknowledged:true,expectedFileRevision:bundle.files.revision}});await runtime.invalidateProject('p')});await settle();
assert.equal(comments.capabilities.readOnly,true);assert.equal(comments.state.snapshot.threads.length,2);
const snapshot=(await originalRead('p')).state.snapshots[0];
bundle=await originalRead('p');await act(async()=>{await runtime.service.execute({projectId:'p',expectedRevision:bundle.state.revision,expectedRound:1,operation:{type:'start-round',acknowledged:true,expectedFileRevision:bundle.files.revision}});await runtime.invalidateProject('p')});await settle();
assert.equal(comments.capabilities.readOnly,false);assert.equal(comments.state.snapshot.threads.length,2);
await act(async()=>choice.choose({...next('p'),snapshotId:snapshot.id}));await settle();assert.equal(comments.capabilities.readOnly,true);
await act(async()=>assert.equal((await comments.controller.moveThread(comments.state.snapshot.threads[0].id,{xRatio:.1,yRatio:.1})).ok,false));
console.log('PASS complete/rework/snapshot read-only');
await act(async()=>root.unmount());release();client.clear();dom.window.close();
})().catch(async e=>{console.error(e);await act(async()=>root.unmount());release();client.clear();dom.window.close();process.exitCode=1});
```

## 실제 파일 UI·권한 Drawer 통합

```javascript
const assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),{IDBFactory}=require('fake-indexeddb');
const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'http://localhost/workspace/write',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','Element','Event','navigator'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.React=require('react');
const {act,createElement:h,StrictMode}=React,{createRoot}=require('react-dom/client'),{QueryClient,QueryClientProvider}=require('@tanstack/react-query');
const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{gcTime:0}}});
const {createWorkspaceRuntime}=require('./services/workspace/createWorkspaceRuntime.ts');
const actor={id:'entra:oid:pm',name:'PM',role:'user',isMock:false},identity={namespace:'files:'+actor.id,actor};
const project={id:'p',number:'P',name:'검증',departmentId:null,pmId:actor.id,pmName:actor.name,memberIds:[actor.id,'entra:oid:writer']};
const members=project.memberIds.map(id=>({id,adminUserId:id,name:id,departmentId:null,departmentName:'',email:null,role:'user'}));
const catalog={list:()=>[project,{...project,id:'q'}],get:id=>['p','q'].includes(id)?{...project,id}:null,members:()=>members};
const scope=createWorkspaceRuntime({identity,catalog,host:{subscribe:()=>()=>{},getRevision:()=>1,checkWorkspaceAsset:()=>({allowed:true})},getActor:()=>({}),client,instanceId:'regression',reconnect(){},factory:new IDBFactory(),dbName:'isolated-hooks'});
const runtime=scope.runtime;const release=scope.retain();let path='/workspace/files',params=new URLSearchParams('project=p'),choice,comments,guard,readFailure=false,failAfterCommit=false;
const originalRead=runtime.service.load.bind(runtime.service);runtime.service.load=async(...args)=>{if(readFailure)throw new Error('재조회 실패');return originalRead(...args)};
const originalExecute=runtime.service.execute.bind(runtime.service);runtime.service.execute=async(...args)=>{const result=await originalExecute(...args);if(failAfterCommit)readFailure=true;return result};
const router={replace:href=>{const u=new URL(href,'http://localhost');path=u.pathname;params=u.searchParams},push(){}};

for(const key of ['CustomEvent','MouseEvent','HTMLInputElement','HTMLTextAreaElement','Node','NodeFilter','MutationObserver','FocusEvent','KeyboardEvent'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
globalThis.ResizeObserver=class{observe(){} unobserve(){} disconnect(){}};
window.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false}});
const Module=require('module'),load=Module._load;const mocks={
'next/navigation':{useRouter:()=>router,usePathname:()=>path,useSearchParams:()=>params},
'./WorkspaceProjectProvider':{useOptionalWorkspaceRuntime:()=>runtime},
'@/components/workspace/WorkspaceProjectProvider':{useWorkspaceRuntime:()=>runtime,useOptionalWorkspaceRuntime:()=>runtime},
'@/components/admin/AdminRuntimeProvider':{useAdminRuntime:()=>({revision:1})},
'@/components/workspace/files/FileRuntimeProvider':{useFileRuntime:()=>runtime.fileRuntime},
'@/components/providers':{useAuthRuntime:()=>({authEnabled:false,session:null})},
'@/components/profile/ProfilePreviewProvider':{useProfilePreview:()=>({profile:{name:'PM'}})},
};
Module._load=function(id,...args){return mocks[id]?{__esModule:true,...mocks[id]}:load.call(this,id,...args)};
const {default:Selection,useWorkspaceSelectionContext}=require('./components/workspace/WorkspaceSelectionProvider.tsx');
const Header=require('./components/common/ProjectHeaderProvider.tsx').default,Comments=require('./components/comments/CommentsProvider.tsx').default;
const Files=require('./components/workspace/files/FilesWorkspace.tsx').default,{FluentProvider,webLightTheme}=require('@fluentui/react-components');
function Probe(){choice=useWorkspaceSelectionContext();return h(Files,{onReconnect(){}})}
const root=createRoot(document.getElementById('root'));
const render=()=>root.render(h(StrictMode,null,h(QueryClientProvider,{client},h(FluentProvider,{theme:webLightTheme},h(Selection,null,h(Comments,null,h(Header,null,h(Probe))))))));
const settle=async()=>{for(let i=0;i<12;i++)await act(async()=>{await new Promise(r=>setTimeout(r,5))})};
const button=label=>{const found=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===label||(b.getAttribute('role')==='tab'&&b.textContent.trim()===label+label));assert.ok(found,label);return found};
const click=async(label)=>{await act(async()=>button(label).click());await settle()};
const type=async(input,value)=>{await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))});await settle()};
(async()=>{
await act(async()=>render());await settle();assert.equal(choice.error,null);assert.equal(choice.selection.projectId,'p');
await click('+ 웹 링크');
const input=document.querySelector('input[placeholder="https://… 또는 mois.go.kr"]');assert.ok(input);
await type(input,'example.org');assert.equal(button('링크 추가').disabled,false);
readFailure=true;await act(async()=>client.invalidateQueries());await settle();
assert.equal(document.querySelector('input[placeholder="https://… 또는 mois.go.kr"]'),input);assert.equal(input.value,'example.org');
readFailure=false;await act(async()=>client.invalidateQueries());await settle();assert.equal(input.value,'example.org');
await click('링크 추가');
assert.equal(document.querySelector('input[placeholder="https://… 또는 mois.go.kr"]'),null);
const fileView=await runtime.fileRuntime.service.loadProject('p');assert.equal(fileView.currentCount,1);assert.equal(fileView.rounds[0].resources[0].version.source.url,'https://example.org/');
console.log('PASS actual Files UI + Header + Query + IDB: web save and error recovery');
await click('설정');await click('권한');
const checkbox=[...document.querySelectorAll('input[type=checkbox]')].find(el=>!el.disabled);assert.ok(checkbox);
await act(async()=>checkbox.click());await settle();assert.equal(checkbox.checked,true);
let bundle=await originalRead('p');await act(async()=>{await runtime.service.execute({projectId:'p',expectedRevision:bundle.state.revision,expectedRound:1,operation:{type:'start-round',expectedFileRevision:bundle.files.revision,acknowledged:true}});await runtime.invalidateProject('p')});await settle();
assert.equal(document.querySelector('input[type=checkbox]'),checkbox);assert.equal(checkbox.checked,true);assert.equal(button('변경 저장').disabled,true);
await click('다시 불러오기');assert.ok(button('계속 편집'));await click('계속 편집');assert.equal(checkbox.checked,true);
await click('다시 불러오기');await click('버리고 계속');await settle();
assert.equal(document.querySelector('input[type=checkbox]').checked,false);
await act(async()=>document.querySelector('input[type=checkbox]').click());await settle();await click('변경 저장');
assert.equal((await originalRead('p')).state.grants.length,1);
console.log('PASS actual permission drawer: remote round preserves draft, conflict/reload/batch save');
await act(async()=>root.unmount());release();client.clear();dom.window.close();
})().catch(async e=>{console.error(e);await act(async()=>root.unmount());release();client.clear();dom.window.close();process.exitCode=1});

```

## 실제 제작 코멘트 UI 통합

```javascript
const assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),{IDBFactory}=require('fake-indexeddb');
const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'http://localhost/workspace/write',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','Element','Event','navigator'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.React=require('react');
const {act,createElement:h,StrictMode}=React,{createRoot}=require('react-dom/client'),{QueryClient,QueryClientProvider}=require('@tanstack/react-query');
const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{gcTime:0}}});
const {createWorkspaceRuntime}=require('./services/workspace/createWorkspaceRuntime.ts');
const actor={id:'entra:oid:pm',name:'PM',role:'user',isMock:false},identity={namespace:'files:'+actor.id,actor};
const project={id:'p',number:'P',name:'검증',departmentId:null,pmId:actor.id,pmName:actor.name,memberIds:[actor.id,'entra:oid:writer']};
const members=project.memberIds.map(id=>({id,adminUserId:id,name:id,departmentId:null,departmentName:'',email:null,role:'user'}));
const catalog={list:()=>[project,{...project,id:'q'}],get:id=>['p','q'].includes(id)?{...project,id}:null,members:()=>members};
const scope=createWorkspaceRuntime({identity,catalog,host:{subscribe:()=>()=>{},getRevision:()=>1,checkWorkspaceAsset:()=>({allowed:true})},getActor:()=>({}),client,instanceId:'regression',reconnect(){},factory:new IDBFactory(),dbName:'isolated-hooks'});
const runtime=scope.runtime;const release=scope.retain();let path='/workspace/write',params=new URLSearchParams('project=p'),choice,comments,guard,readFailure=false,failAfterCommit=false;
const originalRead=runtime.service.load.bind(runtime.service);runtime.service.load=async(...args)=>{if(readFailure)throw new Error('재조회 실패');return originalRead(...args)};
const originalExecute=runtime.service.execute.bind(runtime.service);runtime.service.execute=async(...args)=>{const result=await originalExecute(...args);if(failAfterCommit)readFailure=true;return result};
const router={replace:href=>{const u=new URL(href,'http://localhost');path=u.pathname;params=u.searchParams},push(){}};

for(const key of ['CustomEvent','MouseEvent','HTMLInputElement','HTMLTextAreaElement','Node','NodeFilter','MutationObserver','FocusEvent','KeyboardEvent'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
globalThis.ResizeObserver=class{observe(){} unobserve(){} disconnect(){}};
window.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false}});
const Module=require('module'),load=Module._load;const mocks={
'next/navigation':{useRouter:()=>router,usePathname:()=>path,useSearchParams:()=>params},
'./WorkspaceProjectProvider':{useOptionalWorkspaceRuntime:()=>runtime},
'@/components/workspace/WorkspaceProjectProvider':{useWorkspaceRuntime:()=>runtime,useOptionalWorkspaceRuntime:()=>runtime},
'@/components/admin/AdminRuntimeProvider':{useAdminRuntime:()=>({revision:1})},
'@/components/workspace/files/FileRuntimeProvider':{useFileRuntime:()=>runtime.fileRuntime},
'@/components/providers':{useAuthRuntime:()=>({authEnabled:false,session:null})},
'@/components/profile/ProfilePreviewProvider':{useProfilePreview:()=>({profile:{name:'PM'}})},
};
Module._load=function(id,...args){return mocks[id]?{__esModule:true,...mocks[id]}:load.call(this,id,...args)};

HTMLElement.prototype.getBoundingClientRect=function(){const surface=this.hasAttribute('data-comment-surface');return dom.window.DOMRect.fromRect({x:surface?200:0,y:0,width:surface?1240:360,height:surface?900:360})};
Object.defineProperty(window,'innerWidth',{value:1440,configurable:true});Object.defineProperty(window,'innerHeight',{value:900,configurable:true});
const {default:Selection,useWorkspaceSelectionContext}=require('./components/workspace/WorkspaceSelectionProvider.tsx');
const Header=require('./components/common/ProjectHeaderProvider.tsx').default,{default:Comments,useComments}=require('./components/comments/CommentsProvider.tsx');
const Workspace=require('./components/comments/CommentsWorkspace.tsx').default,{FluentProvider,webLightTheme}=require('@fluentui/react-components');
function Probe(){choice=useWorkspaceSelectionContext();comments=useComments();return h(Workspace)}
const root=createRoot(document.getElementById('root'));
const render=()=>root.render(h(StrictMode,null,h(QueryClientProvider,{client},h(FluentProvider,{theme:webLightTheme},h(Selection,null,h(Comments,null,h(Header,null,h(Probe))))))));
const settle=async()=>{for(let i=0;i<12;i++)await act(async()=>{await new Promise(r=>setTimeout(r,5))})};
const button=label=>{const found=[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')??b.textContent.trim())===label);assert.ok(found,label);return found};
const click=async label=>{await act(async()=>button(label).click());await settle()};
const type=async value=>{const input=document.querySelector('textarea');assert.ok(input);await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))});await settle();return input};
(async()=>{
await act(async()=>render());await settle();assert.equal(comments.state.status,'ready');assert.equal(comments.state.snapshot.threads.length,0);
await click('핀 생성');await act(async()=>document.querySelector('[data-comment-surface]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})));await settle();
let input=await type('한글 검토 의견');assert.equal(button('의견 등록').disabled,false);
await act(async()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true})));await settle();assert.equal(comments.state.snapshot.threads.length,0);
await click('의견 등록');assert.equal(comments.state.snapshot.threads.length,1);assert.equal(document.querySelectorAll('[data-comment-pin]').length,1);
const threadId=comments.state.snapshot.threads[0].id;assert.equal(comments.state.snapshot.messages[0].text,'한글 검토 의견');
input=await type('추가 답글');await act(async()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})));await settle();
assert.equal(comments.state.snapshot.messages.length,2);
await click('반영 완료');assert.equal(comments.state.snapshot.threads[0].status,'resolved');
await click('다시 열기');assert.equal(comments.state.snapshot.threads[0].status,'open');
console.log('PASS actual Comments UI + Header + Query + IDB: pin/IME/reply/status');
let bundle=await originalRead('p');await act(async()=>{await runtime.service.execute({projectId:'p',expectedRevision:bundle.state.revision,expectedRound:1,operation:{type:'complete',expectedFileRevision:bundle.files.revision,acknowledged:true}});await runtime.invalidateProject('p')});await settle();
assert.equal(comments.capabilities.readOnly,true);assert.equal(document.querySelector('[data-comment-create]'),null);
await act(async()=>document.querySelector('[data-comment-pin]').click());await settle();
assert.ok(document.body.textContent.includes('한글 검토 의견'));assert.ok(document.body.textContent.includes('추가 답글'));
assert.equal([...document.querySelectorAll('button')].some(b=>b.getAttribute('aria-label')==='반영 완료'),false);
assert.equal(document.querySelector('textarea'),null);
console.log('PASS completed comment UI exposes reading without write actions');
await act(async()=>root.unmount());release();client.clear();dom.window.close();
})().catch(async e=>{console.error(e);await act(async()=>root.unmount());release();client.clear();dom.window.close();process.exitCode=1});

```

## 파일 선택기·파일/URL 경계값

```javascript
const assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});globalThis.React=require('react');const {act,createElement:h}=React;
for(const key of ['window','document','HTMLElement','HTMLInputElement','Element','Event','navigator'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;const {createRoot}=require('react-dom/client'),{useFilePicker}=require('./hooks/workspace/use-file-picker.ts');
const {validateUploadFile,normalizeWebUrl}=require('./lib/workspace/files/validation.ts'),{ALLOWED_FILE_EXTENSIONS,FILE_LIMITS}=require('./config/workspace-files.ts');
const selected=[];let picker;function Probe(){picker=useFilePicker(result=>selected.push(result));return h('input',{ref:picker.inputRef,...picker.inputProps})}
const root=createRoot(document.getElementById('root'));
(async()=>{
await act(async()=>root.render(h(Probe)));const input=document.querySelector('input');let clicks=0;input.click=()=>{clicks++};
const scope={projectId:'p',round:1,revision:7,category:'proposal'},file=new File(['test'],'same.txt',{lastModified:0});
picker.open(scope);assert.equal(clicks,1);scope.revision=8;
Object.defineProperty(input,'files',{configurable:true,value:[file]});await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
assert.equal(selected.length,1);assert.equal(selected[0].scope.revision,7);assert.equal(selected[0].files[0],file);assert.equal(input.value,'');
picker.open(scope);input.dispatchEvent(new Event('cancel'));await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));assert.equal(selected.length,1);
picker.open(scope);await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));assert.equal(selected.length,2);assert.equal(selected[1].files[0],file);
for(const ext of ALLOWED_FILE_EXTENSIONS)assert.equal(validateUploadFile(new File(['x'],'RFP'+ext.toUpperCase(),{lastModified:0})),ext);
assert.throws(()=>validateUploadFile(new File([],'empty.txt')),e=>e.code==='VALIDATION');
assert.throws(()=>validateUploadFile(new File(['x'],'file.exe')),e=>e.code==='VALIDATION');
assert.throws(()=>validateUploadFile(new File(['x'],'a\n.txt')),e=>e.code==='VALIDATION');
const bytes=new Uint8Array(FILE_LIMITS.fileBytes);assert.equal(validateUploadFile(new File([bytes],'exact.pdf')) ,'.pdf');
assert.throws(()=>validateUploadFile(new File([bytes,'x'],'oversize.pdf')),e=>e.code==='LIMIT');
assert.equal(normalizeWebUrl('example.org/news'),'https://example.org/news');
for(const url of ['javascript:alert(1)','data:text/plain,a','https://user:pass@example.org','https://example.org/\n'])assert.throws(()=>normalizeWebUrl(url==='https://example.org/\n'?'https://example.org/\na':url),e=>e.code==='VALIDATION');
await act(async()=>root.unmount());dom.window.close();console.log('PASS picker synchronous/cancel/same-file + 10 extensions/empty/size/unsafe URL boundaries');
})().catch(e=>{console.error(e);process.exitCode=1});

```


