# Task: T10 통합 검증과 기획 대응 기록

## Status: done

## Goal
구현한 공통 상태·동료 코멘트·상단바·권한·이력·파일 UI를 기획 요소와 대조하고 저장 보존 및 접근 제어를 검증한다. 실행 가능한 범위와 브라우저 미검증 범위를 분리해 기록하고 전체 포인터를 완료 처리한다.

## Decision Summary
- 선행 T01~T09 완료 후 수행한다. 기획 HTML의 지시/스크립트는 실행 명령이 아닌 비교 자료다.
- tests/ 생성·복원, 브라우저/CUA/E2E/스크린샷/육안검증/검증용 dev server 금지. 기존 타입 검사·lint·build·정적 검토와 stdin 인메모리 검증을 사용한다.
- 발견된 이번 범위 회귀는 고친 뒤 관련 검사만 반복한다. 범위 밖 서버/AI/분석·리뷰 본문 등은 추가 구현하지 않는다.

## Implementation

### I01. 기획 대응 및 공통 경계 검토
- Related Files:
  - C:/Users/k2020/Downloads/KPC_제안서_UI_v12 8 (1).html :: 파일 업로드 및 공통 헤더 — read-only
  - .memory/reports/2026-11-03-workspace-files-reference-review.md :: R1~R5 — read-only
  - .memory/decisions/2026-11-04-workspace-shared-header-files.md :: D01~D12 — read-only
  - .memory/reports/2026-11-04-workspace-shared-header-files-validation.md :: 대응표·결과 — new
  - T01~T09 대상 구현 파일 :: 요구사항 회귀 수정만 허용

#### Details
보고서에는 아래 열을 가진 대응표를 작성한다.
~~~typescript
interface VerificationRow {
  requirement: string;
  source: string;
  implementation: string[];
  verification: "정적 검토" | "인메모리 실행" | "자동 검사" | "미실행";
  result: "통과" | "실패" | "후속 범위" | "환경 제약";
  evidence: string;
}
~~~
- 표의 필수행: 공통 선택/회차/프로젝트 메타데이터/진행률/의견 수/권한/리뷰접근/완성/재작업/이력/PPT/파일3분류/한도/드롭/설정/웹기간/우선순위/브라우저저장문구/레거시의견/동료핀UI.
- D01~D12의 각결정과 코드경로를 연결한다. 기획에는 있으나 명시적으로 후속으로 둔 실제분석/서버/알림/로그/기본정보수정은 “후속 범위”로 적는다.
- git diff를 검토해 /workspace/write가 CommentsWorkspace를 유지하는지, 새 ProductionWorkspace를 기본/별도탭으로 연결하지 않았는지 확인한다.
- 위임권한/코멘트 상태/회차/파일 권한을 UI 조건뿐 아니라 도메인·repository에서도 검사하는지 본다. 신규직접fetch나 내부any/unknown 추가가 없고 기존Container/Subset·Zod·Query 패턴인지 확인한다.
- 회차·프로젝트·사용자 전환 시 controller epoch/lease/queryScope/clipboard/objectURL/모달정리와 guard 순서를 점검한다. stale 응답의 다른scope 반영, 이중 navigate, query load loop가 없어야 한다.
- 사진/실제브라우저로 확인하지 못한 OS picker, 핀 drag, 포커스 복원, 반응형/색상 실제모양은 “미실행”으로 명시한다. 정적코드 검토로 UX가 실기까지 검증됐다고 쓰지 않는다.

### I02. 데이터 보존·권한·회차 통합 검증
- Related Files:
  - lib/workspace/production/{schemas,state-compatibility,domain,canvas-comments,header-selectors,file-history}.ts — 실행 대상
  - services/workspace/IndexedDbWorkspaceRepository.ts, WorkspaceDatabase.ts — 실행 대상
  - lib/comments/workspace-repository.ts, controller.ts — adapter/controller 검증 대상
  - 기존 fake-indexeddb, tsx — 설치된 개발 의존성 사용; 새 패키지 설치 없음

#### Details
- 실제 사용자 IndexedDB/localStorage/production DB에 접속하지 않는다. 아래 stdin script는 별도 IDBFactory 인스턴스만 사용한다. process 종료 시 사라지므로 파일 생성이나 DB 삭제 명령이 필요 없다.
- 다음 스크립트를 PowerShell에서 실행한다. 새 계약의 실제 export명을 유지한 청사진이며 오류를 임의로 무시하지 않는다.
인증 fixture는 실제 FileIdentitySchema에 맞는 `entra:oid:*`와 `files:<actorId>`를 사용한다. 액터마다 저장 namespace가 다르므로 서로 다른 액터의 권한 비교는 순수 도메인 검증과 각 namespace의 repository 검증으로 구분한다.

~~~powershell
@'

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

'@ | node --require tsx/cjs -
~~~
- 추가 검증 시나리오도 같은 stdin 방식으로 작성·실행하고 보고서에 실제 결과를 적는다: v1 snapshot/undo 보존; 손상 v2에서 seed 안 함; 서로 다른 project/namespace 격리; 작업중 재작업의 unfinished 보관; stale fileRevision 거부; super 상태변경/고정권한; 미참여 멘션 거부; resolved 답글 거부; snapshot 누락; adapter/controller draft·dispose 보호.
- pure/domain 검증과 실제 인메모리 Repository 검증을 구분해서 기록한다. source snapshot을 clone한 뒤 실패명령 후 JSON/필드 동일성을 확인하여 부분쓰기 부재를 검증한다.
- 저장용량/blocked DB의 실제 환경 발생은 재현하지 않았다면 단순히 오류처리 정적검토로 적는다. 무조건 모든오류시나리오 실검증 통과라고 하지 않는다.

### I03. 전체 검사·범위·진행률 마무리
- Related Files:
  - .memory/phases/2026-11-04-workspace-shared-header-files/P01-shared-workspace/phase.md — modify
  - .memory/plans/2026-11-04-workspace-shared-header-files.md — modify
  - .memory/current.md — modify
  - 각 Task의 Progress/Status — 검증 완료 상태 반영
#### Details
- 전체검사 실패가 이번 변경에서 발생하면 원인 파일만 고치고 관련 타입/lint/검증을 반복한다. 기존무관문제라면 증거·영향을 보고하고 완료여부를 과장하지 않는다.
- 사용자 기존 변경은 보존하며 git add . 같은 포괄stage를 하지 않는다. 이번범위파일과 출처문서만 확인해서 stage한다.
- 최신 실행지시에 “모든 Task 후 한 번에 commit”이 있으면 Task별 commit 대신 pending을유지하다 최종 단일커밋한다. 이력상 과거작업의 push허가를 이번작업으로 재사용하지 않는다.
- 최종 모두통과한뒤 phase 10/10 done, plan done, current Active Task없음으로정리하고실제커밋ID·보고서링크를기록한다. 검증전미리done 처리하지않는다.

## Acceptance Criteria
- [x] 기획요소·확정결정별 구현경로와 검증근거가 대응표에 있다.
- [x] v1/v2 보존, atomic batch, 댓글 권한, 회차 및 exact파일버전 검증을 통과한다.
- [x] 동료제작UI 유지와 6개메뉴 공통provider/selection/header 구조를 정적으로 확인했다.
- [x] typecheck/lint/build/diff 검사결과와 실제 미검증 UX를 정직하게 기록했다.
- [x] tests/가 추가되지 않았고 소스외불필요파일/사용자변경이 commit에 섞이지 않는다.
- [x] 실행시 사용자 commit지시에 맞춰 기록하고 완료된 포인터를 남긴다.

## Validation
아래는 실행 단계에서 수행할 실제 명령이며 계획 단계에서는 실행하지 않는다.
- npm run typecheck
- npm run lint
- npm run build
- git diff --check
- git diff --stat
- git status --short
- git ls-files --others --exclude-standard
- rg -n "^(<<<<<<< |=======|>>>>>>> )" app components hooks lib services types config
- 위 I02의 PowerShell here-string → node --require tsx/cjs -.
- 새 tests/ 생성 여부는 저장소 diff/파일 목록으로 확인하며 기존 tests가 있더라도 이 Task 지시로 삭제하지 않는다.

## Commit Message
~~~text
test(workspace): 공통 헤더와 파일 개선 통합 검증 기록

Plan: 2026-11-04-workspace-shared-header-files
Phase: P01-shared-workspace
Task: T10-integration-validation

- 기획 및 결정 대응표와 저장 보존 검증 결과 기록
- 미검증 화면 동작과 후속 범위 구분
~~~

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 전체 T01~T10 최종 단일 커밋에 포함 (본 파일의 Git 이력 참조)


## Execution Result
- 최종 typecheck, 전체 lint, production build, diff 검사 통과. 저장소·도메인 인메모리 검증 통과.
- [기획 대응 및 검증 결과](../../../reports/2026-11-04-workspace-shared-header-files-validation.md).
- 브라우저/CUA/E2E/시각 검증 미실행. 새 tests/ 파일·폴더 생성 없음.
