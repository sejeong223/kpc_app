# Task: T01 화면 핀 저장 모델과 기존 데이터 호환

## Status: done

## Goal
기존 프로젝트·파일·슬라이드 의견·보관본을 그대로 읽으면서, 화면 전체 핀을 별도 컬렉션에 저장할 수 있는 v2 작업 모델을 만든다. 이 Task에서는 UI와 코멘트 저장 명령을 아직 바꾸지 않는다.

## Decision Summary
- 화면 핀은 소목차/슬라이드와 연결하지 않는다. 기존 body.threads와 reviews는 원래 의미를 유지한다.
- 작업 레코드만 schemaVersion 2로 변경한다. 파일 레코드 schemaVersion 1, IndexedDB 버전 2, object store/index는 유지한다.
- v1은 검증 후 메모리에서 변환하고 다음 정상 쓰기에서 v2로 저장한다. 읽기만으로 원본 레코드를 덮어쓰지 않는다.

## Implementation

### I01. Container 타입과 화면 핀 스키마
- Related Files:
  - types/workspace-production.ts :: RoundBody, ProjectWorkspaceState, RoundSnapshot, WorkspaceUndo — modify
  - config/comments.ts :: CommentScope, CommentThread, CommentMessage — read-only; 기존 필드 타입 재사용
  - lib/workspace/production/canvas-schemas.ts :: CanvasCommentStateSchema — new
  - lib/workspace/production/schemas.ts :: RoundBodySchema, WorkspaceStateSchema — modify

#### Details
Signatures & Types:
~~~typescript
interface CanvasCommentThread extends Omit<CommentThread, keyof CommentScope> {
  carriedFrom: { round: number; threadId: string } | null;
}
type CanvasCommentMessage = Omit<CommentMessage, keyof CommentScope>;
interface CanvasCommentState {
  nextNumber: number;
  threads: CanvasCommentThread[];
  messages: CanvasCommentMessage[];
}
// RoundBody의 다른 필드는 유지하고 canvasComments: CanvasCommentState 추가.
// ProjectWorkspaceState.schemaVersion: 2
type LegacyRoundBody = Omit<RoundBody, "canvasComments">;
interface LegacyRoundSnapshot extends Omit<RoundSnapshot, "body"> {
  body: LegacyRoundBody;
}
interface LegacyWorkspaceUndo extends Omit<WorkspaceUndo, "previousBody"> {
  previousBody: LegacyRoundBody;
}
interface LegacyProjectWorkspaceState extends Omit<
  ProjectWorkspaceState, "schemaVersion" | "body" | "snapshots" | "undo"
> {
  schemaVersion: 1;
  body: LegacyRoundBody;
  snapshots: LegacyRoundSnapshot[];
  undo: LegacyWorkspaceUndo | null;
}
function emptyCanvasComments(): CanvasCommentState;
function upgradeWorkspaceState(state: LegacyProjectWorkspaceState): ProjectWorkspaceState;
~~~
- CanvasCommentThread 필드: id, number, rootMessageId, authorId, status(open/resolved), xRatio/yRatio, createdAt/updatedAt, resolvedAt/resolvedBy(nullable), revision, isSeed, carriedFrom(nullable). 프로젝트와 회차는 부모 레코드/보관본에서 결정하며 별도 상충 필드를 저장하지 않는다.
- CanvasCommentMessage 필드: id, threadId, kind(root/reply), authorId/authorName, text, mentions, createdAt, updatedAt(nullable), revision, isSeed. mentions는 기존 {userId,name,start,end} 배열 계약이다.
- 신규 상태 기본값은 {nextNumber:1,threads:[],messages:[]}. 신규 댓글은 isSeed:false. canvasComments 자체는 v2에서 필수이며 default로 누락을 숨기지 않는다.
- 식별자는 기존 WorkspaceIdSchema 기준(1~400자, 공백 없음), 좌표는 finite 0~1, number/revision/nextNumber는 양의 정수, 시간은 ISO, 불필요한 속성은 strict 거부한다. 텍스트·멘션 길이 제한은 기존 comments 계약을 공유한다.
- rootMessageId가 같은 thread의 kind=root를 가리키는지, thread당 root 1개, message의 thread 참조, root author=thread author, thread/message ID 중복 및 thread number 중복을 검사한다. nextNumber는 모든 현재 번호보다 커야 한다.
- open이면 resolvedAt/resolvedBy 둘 다 null, resolved이면 둘 다 유효해야 한다. carriedFrom은 유효한 양의 round와 threadId를 가진다.
- 현재/보관본/undo 안의 canvas를 각각 검증한다. 현재와 동일 회차 보관본에 같은 ID가 나타나는 정상 스냅샷 복제는 허용한다. 하나의 body 내부 및 같은 body의 슬라이드 의견과의 ID 충돌은 거부한다.
- carriedFrom은 해당 프로젝트의 더 이른 회차 보관본에 존재하는 화면 핀을 가리켜야 한다. 새 회차의 사본 ID는 원본과 달라야 한다. 초기 빈 상태에는 backreference가 없다.
- 기존 bodyReferenceErrors의 슬라이드·출처·설정 검사와 전체 상태의 회차/버전/PPT 참조 검사를 삭제하지 않는다. 기존 v1 validator는 LegacyWorkspaceStateSchema로 유지하고 canonical v2 검증과 공통 참조 검사를 공유한다. Zod의 refinements가 붙은 object에 무분별하게 omit/extend해서 검증을 잃지 않는다.

### I02. 저장 읽기 경계와 신규 생성
- Related Files:
  - lib/workspace/production/state-compatibility.ts :: upgradeWorkspaceState, StoredWorkspaceStateSchema — new
  - lib/workspace/production/storage-schemas.ts :: WorkspaceRecordSchema, StoredWorkspaceRecordSchema — modify
  - services/workspace/workspace-records.ts :: readWorkspaceBundle — modify
  - lib/workspace/production/domain.ts :: emptyRoundBody, createWorkspaceState — modify
  - services/workspace/IndexedDbWorkspaceRepository.ts :: load, commitPrepared — read/필요한 타입 수정
  - services/workspace/IndexedDbFileRepository.ts :: loadViewContext, readOriginal, 레코드 쓰기 — modify
  - services/workspace/WorkspaceDatabase.ts :: open — read-only
#### Details
- StoredWorkspaceStateSchema는 검증한 v1 또는 canonical v2만 수락하고 출력은 ProjectWorkspaceState로 통일한다. 알 수 없는 버전/손상 v2를 v1 기본값으로 회복하지 않는다.
- upgradeWorkspaceState는 structuredClone 후 현재 body, 모든 snapshot.body, undo.previousBody에 각각 독립적인 빈 canvas를 추가한다. revision/inputRevision/currentRound/grants/파일 참조/PPT 참조/슬라이드 의견 및 nextCommentNumber는 바꾸지 않는다. 원본 인자를 mutate하지 않는다.
- StoredWorkspaceRecordSchema의 namespace/projectId/state는 읽기 전용 변환 경계다. WorkspaceRecordSchema는 canonical v2 쓰기 전용 계약을 유지한다. 레코드 projectId, state.projectId, 선택 projectId가 일치해야 한다.
- readWorkspaceBundle은 레코드가 아예 없을 때만 createWorkspaceState를 호출한다. 검증 실패면 STORAGE, 파일-작업 회차 불일치면 기존 오류를 유지한다. 빈 seed로 덮어쓰거나 DB를 지우지 않는다.
- 파일만 수정해도 v2 작업 레코드를 쓸 수 있도록 두 Repository 경로를 함께 확인한다. DB transaction 실패 시 v1 원본과 Blob이 그대로 남는다.
- readOriginal은 readWorkspaceBundle을 거치지 않고 workspaces를 직접 읽는다. 이곳의 WorkspaceRecordSchema.parse(saved)도 StoredWorkspaceRecordSchema로 바꾼다. 읽기만으로 v1이 유지되는 동안 원본 다운로드가 canonical v2 검사에서 거부되지 않아야 한다. 기존 workspaceFileReferences의 snapshot 원본 보호를 유지한다.
- emptyRoundBody는 canvas를 생성하고 createWorkspaceState는 버전 2를 반환한다. canonical RoundBody 리터럴/직접 fixture 생성 위치는 rg로 찾아 필수 필드를 보완한다. 다른 도메인 동작을 바꾸지 않는다.

## Acceptance Criteria
- [x] v1의 현재/보관/undo를 읽은 뒤 원본 입력이 불변이고 기존 데이터가 모두 남는다.
- [x] v2 누락·잘못된 핀 참조·중복 메시지·미래 backreference는 거부한다.
- [x] 신규 프로젝트 화면 핀은 비어 있으며 기존 production-preview DB를 읽거나 seed하지 않는다.
- [x] 파일 쓰기와 작업 쓰기 모두 canonical v2를 사용하고 DB 버전/스토어를 바꾸지 않는다.

## Validation
실행 단계에서만 수행한다. tests/와 임시 검증 파일, 브라우저 사용 금지.
- npm run typecheck
- npx eslint types/workspace-production.ts lib/workspace/production services/workspace
- git diff --check
- 다음 PowerShell stdin 검증을 실행한다. 모든 assert 통과가 기대값이다.
~~~powershell
@'
const assert = require("node:assert/strict");
const { createWorkspaceState } = require("./lib/workspace/production/domain.ts");
const { createEmptyFileProject } = require("./lib/workspace/files/domain.ts");
const { StoredWorkspaceStateSchema } = require("./lib/workspace/production/state-compatibility.ts");
const { WorkspaceStateSchema } = require("./lib/workspace/production/schemas.ts");
let n=0;
const context={identity:{namespace:"files:entra:oid:pm",actor:{id:"entra:oid:pm",name:"PM",role:"user",isMock:false}},project:{id:"p",number:"P",name:"검증",departmentId:null,pmId:"entra:oid:pm",pmName:"PM",memberIds:["entra:oid:pm"]},members:[{id:"entra:oid:pm",adminUserId:"entra:oid:pm",name:"PM",departmentId:null,departmentName:"",email:null,role:"user"}],now:"2026-11-04T00:00:00.000Z",newId:()=>"id-"+(++n)};
const files=createEmptyFileProject(context);
const state=createWorkspaceState(context,files);
assert.equal(state.schemaVersion,2);
assert.deepEqual(state.body.canvasComments,{nextNumber:1,threads:[],messages:[]});
const legacy=structuredClone(state);
legacy.schemaVersion=1;
delete legacy.body.canvasComments;
const before=JSON.stringify(legacy);
const migrated=StoredWorkspaceStateSchema.parse(legacy);
assert.equal(JSON.stringify(legacy),before);
assert.deepEqual(migrated,state);
const broken=structuredClone(state);
delete broken.body.canvasComments;
assert.equal(WorkspaceStateSchema.safeParse(broken).success,false);
assert.equal(StoredWorkspaceStateSchema.safeParse(broken).success,false);
assert.equal(StoredWorkspaceStateSchema.safeParse({...state,schemaVersion:3}).success,false);
console.log("v1/v2 상태 호환 검증 통과");
'@ | node --require tsx/cjs -
~~~
- snapshot/undo 필드 보존 및 손상 레코드 처리까지 정적 검토하고 결과를 Task Progress에 기록한다. 최종 T10에서 독립 IDBFactory의 실제 read/write 트랜잭션 검증을 수행한다.

## Commit Message
~~~text
feat(workspace): 화면 핀 저장 모델과 v1 작업 데이터 호환 추가

Plan: 2026-11-04-workspace-shared-header-files
Phase: P01-shared-workspace
Task: T01-canvas-state-compatibility

- 화면 핀 저장 모델과 기존 데이터 호환
- 기존 데이터 및 사용자 확정 정책 보존
~~~

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 전체 T01~T10 최종 단일 커밋에 포함 (본 파일의 Git 이력 참조)


## Execution Result
- typecheck/lint/diff 및 v1/v2·snapshot·undo 보존 인라인 검증 통과. 검증 fixture를 기존 identity 규약에 맞게 수정.
- 사용자 요청으로 개별 커밋 보류. 전체 완료 후 단일 커밋.
