# Task: T02-atomic-local-storage 기존 파일 보존과 통합 회차 저장

## Status: done

## Goal
기존 자료함 데이터를 보존하며 파일/목차/제작 상태를 동일 IndexedDB 트랜잭션으로 저장하고 재접속 복원한다.

## Decision Summary
- 선행 P01-T01의 순수 전이와 계약 사용. 실제 DB는 추가적 v2 업그레이드이며 cloud 연결 없음.
- 파일 GC와 제작 Blob 분리, 과거 기록 불변, revision 충돌과 롤백이 핵심.

- 선행 Task가 완료된 상태에서 이 파일만 읽고 실행한다. 아래에 필요한 타입·동작을 다시 기재한다. 기존 함수 구현은 지정 심볼에서 연결하되 인터뷰를 재시작하지 않는다.
- 한국어 UI/주석, 내부 any/unknown 추가 금지(외부 라이브러리 경계의 불가피한 예외만 좁게), Zod 런타임 검증, Container/Pick/Omit 타입 패턴, TanStack Query 사용.
- 기존 Dadam 컴포넌트·tw: Tailwind·공통 여백 재사용. 관리자 전용 메뉴·서버 인증 경계를 약화하지 않는다.
- tests/ 생성·복원 및 브라우저/CUA/E2E/스크린샷/검증용 dev server 금지. 구현 커밋 전에 이 Task의 자동·정적 검증을 수행하고 실패를 done 처리하지 않는다.
- 실제 서버·AI·Cosmos/Blob 연결, 관리자 카탈로그 전체 영속화, 실제 알림 전송은 범위 밖. 코드 변경 전 AGENTS.md의 지속 규칙을 유지한다.

## Implementation

### I01. 기존 DB를 보존하는 공유 연결과 저장 계약
- Related Files:
  - `services/workspace/WorkspaceDatabase.ts` :: WorkspaceDatabase — new
  - `services/workspace/IndexedDbWorkspaceRepository.ts` :: IndexedDbWorkspaceRepository — new
  - `lib/workspace/production/storage-schemas.ts` :: WorkspaceRecordSchema/WorkspaceBlobRecordSchema — new
  - `types/workspace-production.ts` :: 아래 저장 계약 — modify
  - `config/workspace-projects.ts` :: createWorkspaceProjectCatalog — modify
  - `services/workspace/IndexedDbFileRepository.ts` :: open/transact/close 공통화 — modify

#### Details
- **Signatures & Types**:
```typescript
interface WorkspaceProjectDirectory extends FileProjectCatalog { members(projectId:string):readonly WorkspaceMember[] }
interface WorkspaceBundle { state:ProjectWorkspaceState; files:FileProjectState }
interface WorkspaceBlobInput { id:string; kind:"template"|"ppt"|"image"; blob:Blob; filename:string; sha256:string }
interface StoredWorkspaceBlob extends WorkspaceBlobInput { namespace:string; projectId:string; byteLength:number; createdAt:string }
interface FileRoundControl { workspaceRevision:number; phase:"writing"|"completed"; canStartRound:boolean }
interface FileViewContext { files:FileProjectState; control:FileRoundControl }
interface WorkspaceRepository {
 load(projectId:string):Promise<WorkspaceBundle>;
 execute(input:WorkspaceMutation):Promise<WorkspaceReceipt>;
 commitPrepared(input:PreparedWorkspaceMutation,blobs:readonly WorkspaceBlobInput[],assertAccess:()=>void):Promise<WorkspaceReceipt>;
 readBlob(projectId:string,blobId:string):Promise<StoredWorkspaceBlob>;
 readSelection():Promise<string|null>;
 saveSelection(projectId:string):Promise<void>;
 close():void;
}
interface WorkspaceRepositoryOptions { identity:FileIdentity; catalog:WorkspaceProjectDirectory; database?:WorkspaceDatabase; factory?:IDBFactory; dbName?:string; now?:()=>string; newId?:()=>string }
type WatchRequest = <T>(request:IDBRequest<T>,receive:(value:T)=>void)=>void;
class WorkspaceDatabase {
 constructor(options?:{factory?:IDBFactory;dbName?:string});
 transact<T>(stores:readonly string[],mode:IDBTransactionMode,run:(tx:IDBTransaction,done:(result:T)=>void,watch:WatchRequest)=>void,signal?:AbortSignal):Promise<T>;
 close():void;
}
class IndexedDbWorkspaceRepository implements WorkspaceRepository { constructor(options:WorkspaceRepositoryOptions); /* 위 계약 메서드 */ }

```
- 선행 계약: ProjectWorkspaceState는 schemaVersion=1/projectId/revision/inputRevision/currentRound/phase/grants/body/snapshots/pins/pptVersions/reviews/undo를 가진다. `createWorkspaceState(context,files)`로 빈 작업을 만들고 `applyWorkspaceMutation(state,input,context,files)`는 `{receipt:{state,createdIds,undoId},files}`를 반환한다. 권한과 스키마는 domain에서 이미 검사하지만 저장 경계에서도 대상·ID·scope를 다시 검증한다.
- **Data & Schema Fields**:
  - DB 이름 `kpc-workspace-files`, 버전 2. 기존 projects=[namespace,projectId]/{state:FileProjectState}, blobs=[namespace,projectId,id], preferences=[namespace,key]를 삭제·재생성·키 변경하지 않는다.
  - 신규 workspaces=[namespace,projectId]/{namespace,projectId,state:ProjectWorkspaceState}, byNamespace index.
  - 신규 workspaceBlobs=[namespace,projectId,id]/{namespace,projectId,id,kind,blob,filename,sha256,byteLength,createdAt}, byProject index=[namespace,projectId].
  - Blob은 File과 분리해 저장한다. 기존 files의 GC가 제작/PPT/템플릿 Blob을 삭제하지 못하도록 별도 store를 사용한다.
  - Directory.members는 현재 seed active/nondeleted 참여자를 id로 매핑한다. u-self→identity.actor.id, 다른 user id→mock:원래id. 이름·부서명·email과 원 adminUserId를 함께 반환한다. 기존 list/get 결과와 권한 범위 유지.
- **Execution Flow / Logic**:
  1. onupgradeneeded에서 objectStoreNames.contains 검사 후 누락된 store/index만 추가한다. oldVersion=0은 기존3개+신규2개를 생성, oldVersion=1은 신규2개만 생성한다. 네트워크/async await를 upgrade transaction 안에서 하지 않는다.
  2. WorkspaceDatabase는 기존 transact의 request callback 기반 원자성과 generation 검사를 유지한다. 완료 이벤트에서만 resolve; abort/request error 시 reject. 입력 signal은 해당 transaction만 abort한다.
  3. DB_BLOCKED/DB_UNAVAILABLE/QUOTA/STORAGE/CANCELLED를 구분한다. open 실패를 빈 프로젝트로 취급하거나 메모리 성공으로 대체하지 않는다.
  4. 주입된 공유 DB는 repo.close에서 닫지 않고 repo AbortController만 취소한다. repo가 직접 만든 DB는 함께 close. Runtime이 공유 DB를 최종 소유한다.

### I02. 원자적인 load·명령·Blob 저장·회차 전환
- Related Files:
  - `services/workspace/IndexedDbWorkspaceRepository.ts` :: load/execute/commitPrepared/readBlob — new
  - `lib/workspace/production/domain.ts` :: 기존 순수 전이 — read-only
  - `lib/workspace/files/schemas.ts`, `domain.ts` :: 기존 FileProjectStateSchema/advanceFileRound — read-only

#### Details
- **Signatures & Types**: I01 계약. context는 검증된 identity+catalog project/members+현재now/newId에서 생성한다. caller에게 actor/createdAt를 받지 않는다.
- **Execution Flow / Logic**:
  1. load는 projects+workspaces readwrite에서 files 없으면 createEmptyFileProject, workspace 없으면 createWorkspaceState를 만든다. files.currentRound>1이어도 workspace는 그 번호에서 시작하고 snapshots=[]이다.
  2. 저장값이 있는데 schema/namespace/projectId가 틀리면 STORAGE, 초기화 금지. files.currentRound!==workspace.currentRound이면 자동 수리하지 않고 STORAGE.
  3. execute는 public WorkspaceMutation만 받는다. pin-assets/apply-proposal/register-ppt는 commitPrepared에서만 받는다. 모든 값 strict schema 후 같은 transaction에서 최신 files+workspace를 읽는다.
  4. prepared blob 해시·PPT 파싱 등 await 작업은 transaction 전에 서비스에서 수행한다. transaction 안에서는 동기 assertAccess()와 역할·revision·round 재검사, 참조 대상 blob 존재 검사, 순수 전이 후 두 metadata와 Blob add를 수행한다.
  5. blobId가 다른 project/namespace에 있는 경우 거부. template/image/ppt blob 참조는 pins, current body, snapshots, pptVersions, reviews/undo의 실제 관계를 통해 확인한다. 임의 blobId만으로 다운로드하지 않는다.
  6. complete는 파일 현재 회차 sealedAt=null을 유지하여 v1 schema를 보존한다. completed일 때 모든 파일 쓰기를 차단한다. start-round는 양쪽 상태를 함께 바꾸고 이전 파일 회차를 봉인한다.
  7. oncomplete 이전에는 UI 성공/알림을 발생시키지 않는다. 중간 add/put/권한 검사 실패 시 Blob과 양쪽 metadata 전체 롤백. 오래된 페이지/타 탭의 revision은 CONFLICT.
  8. snapshot/pin/PPT 버전/undo가 참조하는 Blob을 정리하지 않는다. 이번에는 제작 이력 자동 GC/만료 정책을 추가하지 않는다.
  9. readSelection/saveSelection은 기존 preferences의 selected-project 키를 공유한다. 탭 간 선택 강제 이동은 하지 않는다.

### I03. 기존 파일 명령의 통합 경계
- Related Files:
  - `types/workspace-files.ts` :: FileMutation/FileWorkspaceView/FileRepository — modify
  - `services/workspace/IndexedDbFileRepository.ts` :: execute/loadViewContext — modify
  - `services/workspace/WorkspaceFileService.ts` :: loadProject — modify
  - `lib/workspace/files/schemas.ts` :: FileMutationSchema — modify
  - `lib/workspace/files/selectors.ts` :: selectFileWorkspace — modify
  - `components/workspace/files/FilesWorkspace.tsx` :: ActionConfirmation/execute — 최소 계약 연결 modify
  - `components/workspace/files/FileRuntimeProvider.tsx` :: 새 Directory 타입 연결 — modify

#### Details
- **Signatures & Types**:
```typescript
// 기존 필드에 추가. 일반 파일 수정에는 선택적이고 start-round에는 필수로 검증한다.
interface FileMutation { projectId:string; expectedRevision:number; expectedRound:number; expectedWorkspaceRevision?:number; operation:FileOperation }
interface FileWorkspaceView { /* 기존 필드 유지 */ workspaceRevision:number; phase:"writing"|"completed" }
interface FileRepository { /* 기존 메서드 유지 */ loadViewContext(projectId:string):Promise<FileViewContext> }
function selectFileWorkspace(state:FileProjectState,project:WorkspaceProject,identity:FileIdentity,control?:FileRoundControl):FileWorkspaceView;
```
- 기존 load는 그대로 파일 상태를 반환한다. loadViewContext는 같은 transaction의 files/workspace와 canProjectAction(rework)를 반환하여 UI 메타데이터 혼합을 막는다.
- 파일 execute의 transaction에 workspaces를 포함한다. 일반 변경은 phase=writing 확인 후 기존 applyFileMutation 사용, 성공 시 workspace.revision 및 inputRevision 증가. refs에 연결된 삭제 자료를 과거 snapshot에서 제거하지 않는다.
- start-round를 기존 파일 전용 전이로 실행하지 않는다. expectedWorkspaceRevision을 필수로 확인하고 동일 applyWorkspaceMutation(start-round) 경로를 사용한다. 파일/제작 회차 중 한쪽만 증가하는 우회 경로를 없앤다.
- selectFileWorkspace는 completed이면 canAdd/canReorder/모든resource.canManage=false, 모든 round readOnly=true. canStartRound는 통합 rework 권한. writing의 과거 round.readOnly는 유지.
- FilesWorkspace는 confirmation에 workspaceRevision을 캡처하고 start-round 요청에 전달한다. 후속 P03-T05에서 전체 공통 확인 UI로 교체하지만 이 Task도 타입 검사와 기존 자료함 작업이 동작해야 한다.
- 다른 파일 권한(등록자만 수정, PM/슈퍼 전체)과 50MiB·30개·15초 undo를 넓히지 않는다. 권한이 있는 rework 위임자가 개별 타인 파일 편집 권한까지 얻지 않는다.


## Acceptance Criteria
- [x] v1 기존 데이터/Blob/선택 키가 바이트·참조 그대로 남고 v2로 열린다.
- [x] 파일과 제작 회차 전환은 함께 성공 또는 함께 실패한다.
- [x] completed 파일 변경과 파일 전용 start-round 우회가 차단된다.
- [x] 재접속·사용자 격리·오류/충돌·DB 폐기 경로가 검증된다.

## Validation
- `npm run typecheck`; `npx eslint services/workspace config/workspace-projects.ts lib/workspace/production lib/workspace/files types/workspace-files.ts types/workspace-production.ts components/workspace/files/FilesWorkspace.tsx`; `git diff --check`.
- 아래 인라인 명령으로 v1→v2 보존·회차 원자성·다중 인스턴스 충돌을 검증한다. 기존 데이터가 손상되면 실패해야 한다.
```powershell
@'
const assert=require('node:assert/strict'); const {IDBFactory}=require('fake-indexeddb');
const {createEmptyFileProject}=require('./lib/workspace/files/domain.ts');
const {IndexedDbWorkspaceRepository}=require('./services/workspace/IndexedDbWorkspaceRepository.ts');
(async()=>{
const factory=new IDBFactory(), dbName='workspace-migration-check';
const identity={namespace:'verify',actor:{id:'pm',name:'PM',role:'user',isMock:true}};
const project={id:'p',number:'P',name:'검증',departmentId:null,pmId:'pm',pmName:'PM',memberIds:['pm']};
const members=[{id:'pm',adminUserId:'u-self',name:'PM',departmentId:null,departmentName:'',email:null}];
const catalog={list:()=>[project],get:id=>id==='p'?project:null,members:()=>members};
const files=createEmptyFileProject({identity,project,now:'2026-11-03T00:00:00.000Z',newId:()=> 'file-id'});
await new Promise((resolve,reject)=>{const r=factory.open(dbName,1);r.onerror=()=>reject(r.error);r.onupgradeneeded=()=>{r.result.createObjectStore('projects',{keyPath:['namespace','projectId']}).createIndex('byNamespace','namespace');r.result.createObjectStore('blobs',{keyPath:['namespace','projectId','id']}).createIndex('byProject',['namespace','projectId']);r.result.createObjectStore('preferences',{keyPath:['namespace','key']});};r.onsuccess=()=>{const db=r.result,tx=db.transaction(['projects','preferences'],'readwrite');tx.objectStore('projects').put({namespace:'verify',projectId:'p',state:files});tx.objectStore('preferences').put({namespace:'verify',key:'selected-project',projectId:'p'});tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};});
const a=new IndexedDbWorkspaceRepository({identity,catalog,factory,dbName}), b=new IndexedDbWorkspaceRepository({identity,catalog,factory,dbName});
const first=await a.load('p');assert.deepEqual(first.files,files);assert.equal(await a.readSelection(),'p');
const stale=await b.load('p');
await a.execute({projectId:'p',expectedRevision:first.state.revision,expectedRound:1,operation:{type:'start-round',expectedFileRevision:files.revision,acknowledged:true}});
await assert.rejects(b.execute({projectId:'p',expectedRevision:stale.state.revision,expectedRound:1,operation:{type:'add-chapter',title:'충돌',afterId:null}}),e=>e.code==='CONFLICT');
const after=await b.load('p');assert.equal(after.state.currentRound,2);assert.equal(after.files.currentRound,2);assert.equal(after.state.snapshots[0].kind,'unfinished');
a.close();b.close();console.log('DB 이관·회차·충돌 검증 통과');
})().catch(e=>{console.error(e);process.exitCode=1});
'@ | node --import tsx
```
- 동일 방식으로 기존 File Blob byte equality, metadata invalid 복원 금지, prepared 중간 failure/Quota rollback, namespace 격리, completed 파일 쓰기 차단, 다른 탭 versionchange/close, undo가 과거 자료를 삭제하지 않음을 확인한다. 실제 브라우저 용량 검증으로 보고하지 않는다.

## Commit Message
```text
feat(workspace): 자료함 보존과 통합 회차 저장 구현

Plan: 2026-11-03-workspace-toc-production
Phase: P01-project-foundation
Task: T02-atomic-local-storage

- 기존 파일 보존과 통합 회차 저장
- 권한·원본 보존·실패 경계를 검증하고 진행 기록 갱신
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 본 계획의 최종 단일 커밋에 포함 (`Plan: 2026-11-03-workspace-toc-production`)
- 2026-11-03: typecheck·범위 ESLint·diff 검사 통과. v1→v2 이관/충돌 기본 시나리오, 통합 저장 20건, DB 차단·손상·versionchange·close 4건 통과.
- 참조 중인 파일의 과거 설정 버전이 GC로 사라지지 않도록 보존 참조와 원본 조회를 확장했다.
- 공유 트랜잭션의 request 오류를 명시적으로 abort할 때 기본 abort까지 실행되는 중복 경로를 차단했다. 중복 원본/Quota 실패에서 전체 롤백을 확인했다.
- 청사진의 검증용 사용자 ID만 실제 Entra namespace 규칙에 맞게 보정했다. 그 외 비대상 변경 없음.
