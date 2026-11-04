# Task: T05 동료 핀 UI와 프로젝트 코멘트 연결

## Status: done

## Goal
동료 제작 화면의 핀·팝업·답글·멘션·키보드 동작을 유지하면서 공통 작업 저장소에서 의견을 읽고 저장한다. 기존 코멘트 DB는 읽기 전용 보관함으로 남긴다.

## Decision Summary
- v2 body.canvasComments, canvas-command, projectCanvasSnapshot/canvasCapabilities, ProjectView.roundCreatedAt, 단일 선택 Provider를 사용한다.
- /workspace/write는 CommentsWorkspace를 유지한다. 새 ProductionWorkspace나 별도 편집 탭을 연결하지 않는다.
- 기존 CommentController를 repository adapter로 재사용한다. UI → TanStack Query → 서비스 → 트랜잭션 경계를 유지한다.

## Implementation

### I01. Repository bridge와 캐시
- Related Files:
  - lib/comments/workspace-repository.ts :: WorkspaceCommentRepository — new
  - hooks/workspace/use-canvas-comments.ts :: useCanvasComments — new
  - lib/comments/controller.ts :: CommentController — modify
  - lib/workspace/production/canvas-comments.ts :: projectCanvasSnapshot, canvasCapabilities — reuse
  - hooks/workspace/use-workspace-production.ts :: loadProjectView, useWorkspaceCommand — reuse
  - lib/workspace/production/query-keys.ts :: project — reuse

#### Details
~~~typescript
interface CanvasCommentBinding {
  projectId: string;
  round: number;
  snapshotId: string | null;
}
interface CanvasCommentRead {
  snapshot: CommentSnapshot;
  request: ProjectRequest;
  capabilities: CanvasCommentCapabilities;
}
interface WorkspaceCommentRepositoryOptions {
  binding: CanvasCommentBinding;
  identity: CommentIdentity;
  read(): Promise<CanvasCommentRead>;
  execute(request: ProjectRequest, command: CommentCommand): Promise<CanvasCommentRead>;
}
class WorkspaceCommentRepository implements CommentRepository {
  constructor(options: WorkspaceCommentRepositoryOptions);
  load(identity: CommentIdentity): Promise<CommentSnapshot>;
  execute(identity: CommentIdentity, command: CommentCommand): Promise<CommentSnapshot>;
  close(): void;
}
// CommentController 추가: discardDrafts(): void
// busy일 때는 거부하고 drafts/view/pendingPoint/editingMessageId/pinMode를 초기화한다.
~~~
- Binding은 controller 생성 시 고정한다. identity의 namespace/actor/project/표시 round와 조회 결과가 같아야 한다. close는 adapter 종료 플래그만 설정하고 공용 runtime/DB/service를 닫지 않는다.
- 새 identity.actor는 workspace runtime.identity.actor에서 id/name/isMock만 취한다. 기존 레거시 CommentIdentity의 actor나 role을 새 프로젝트 인증 원본으로 사용하지 않는다.
- read callback은 queryClient.fetchQuery의 기존 keys.project(projectId)를 사용한다. queryFn은 activeWorkspaceRead와 loadProjectView이며 캐시에는 항상 raw ProjectView를 넣는다. 같은 키에 CommentSnapshot을 저장하지 않는다.
- snapshotId가 있으면 selectSnapshotView를 적용한 뒤 projection한다. createdAt에는 선택 view.roundCreatedAt을 전달한다.
- adapter는 마지막으로 표시한 request={projectId,expectedRevision:raw.state.revision,expectedRound:raw.state.currentRound}를 보관한다. execute 직전에 최신 revision을 읽어 낡은 요청에 붙이지 않는다.
- execute callback은 useWorkspaceCommand().mutateAsync({...request,operation:{type:"canvas-command",command}})를 호출한다. 성공 후 Query로 재조회한 상태를 투영한다.
- snapshotId가 있거나 완료 상태, 다른 actor/scope, 표시 round와 현재 round 불일치, 닫힌 adapter이면 쓰기를 거부한다. UI 우회는 도메인에서 다시 거부한다.
- 컨트롤러가 생성 후 command.threadId를 선택하므로 ID를 재발급하지 않는다. 제출 중 추가 입력은 기존 draft revision 비교로 보존한다.
- useProjectWorkspace의 외부 갱신을 구독한다. 마지막 표시 revision과 달라졌을 때만 controller.load를 한 번 호출한다. dataUpdatedAt만 보고 무조건 load하면 fetchQuery → effect → load 루프가 생기므로 금지한다.
- busy 중 외부 갱신은 보류하고 종료 후 다시 비교한다. 배경 재조회와 충돌 처리에서 draft를 자동 폐기하지 않는다. controller epoch와 activeWorkspaceRead로 이전 scope의 응답을 무시한다.
- WorkspaceError 매핑: CONFLICT→conflict, FORBIDDEN/READ_ONLY→forbidden, NOT_FOUND→not_found, VALIDATION/LIMIT→invalid, DB_*/QUOTA/STORAGE→storage. 메시지는 유지하고 종료 범위의 CANCELLED는 표시하지 않는다.
- 충돌 시 초안을 유지하고 최신 내용 확인 및 기존 rebaseEdit 경로를 제공한다. 권한 박탈을 자동 재시도로 덮지 않는다.

### I02. Context·동료 UI·미저장 보호
- Related Files:
  - components/comments/CommentsProvider.tsx :: CommentsContextValue, CommentsProvider — modify
  - components/comments/ProjectCanvasCommentsProvider.tsx :: 범위별 controller 공급 — new
  - components/comments/CommentsWorkspace.tsx :: 핀/드래그/키보드 — modify
  - components/comments/CommentPopover.tsx :: 상태·입력·삭제 — modify
  - components/comments/CommentCreateButton.tsx :: 의견 추가 — modify
  - components/comments/CommentPin.tsx :: 이동 가능 props — 필요 시 modify
  - components/comments/CommentComposer.tsx :: 현재 멘션 후보 전달 — modify
  - components/comments/CommentActionsMenu.tsx, CommentMessage.tsx — 기존 표시/동작 재사용
  - hooks/workspace/use-workspace-draft-guard.ts, components/workspace/files/FileDiscardDialog.tsx — reuse

#### Details
~~~typescript
// CommentsContextValue의 기존 identity/state/controller에 추가한다.
interface CanvasCommentUiAccess {
  capabilities: CanvasCommentCapabilities;
  mentionUsers: CommentUser[];
}
// CanvasCommentCapabilities:
// readOnly,canCreate:boolean;
// replyThreadIds,moveThreadIds,statusThreadIds,deleteThreadIds,
// editableMessageIds,deletableMessageIds:string[].
~~~
- CommentsProvider는 레거시 identity 계산을 유지하지만 IndexedDbCommentRepository.load로 seed하는 이전 편집 경로는 중단한다. 신규 write는 공통 runtime/selection/view에서 만든 ProjectCanvasCommentsProvider를 사용한다.
- 다른 메뉴 및 미식별/로딩/접근오류 상태에서는 controller=null, 빈 권한 배열, canCreate=false를 제공한다. AppShell/헤더 children을 없애거나 다른 프로젝트의 핀을 대신 보여주지 않는다.
- scope key는 namespace/actor/projectId/표시round/snapshotId다. 범위 변경 때만 dispose한다. 단순 배경 refetch는 key를 바꾸지 않아 초안을 유지한다.
- 새 의견은 canCreate, 상태 버튼은 statusThreadIds, 메시지 편집/삭제는 해당 ID 배열, 전체 삭제는 deleteThreadIds, 이동은 moveThreadIds를 기준으로 조건부 렌더링/이벤트 등록한다.
- completed/과거 회차는 핀·팝업·본문·답글·상태를 읽을 수 있다. drag/keyboard move/compose/delete/resolve 이벤트는 등록하지 않는다.
- 좌표는 동료 작업 영역의 xRatio/yRatio다. 기존 clamp, 키보드 이동 간격, 팝업 배치를 유지한다. 슬라이드 없는 화면에 sectionId/slideId를 만들지 않는다.
- UI mentionUsers는 현재 catalog.members만 사용한다. projection.snapshot.users에는 과거 작성자·멘션 대상 검증용 항목도 있으므로 이를 멘션 후보로 사용하지 않는다. 새 command의 멘션은 도메인에서도 현재 멤버 여부를 검사한다.
- dirty는 새 의견/답글의 비공백 입력 또는 편집 초안의 원문 대비 text/mentions 차이로 계산한다. 빈 핀 설치만으로 dirty가 되지 않는다.
- useWorkspaceDraftGuard로 project/round/menu 이동, 완성/재작업을 보호한다. onDiscard에는 새 discardDrafts를 전달한다. closePopup은 초안을 유지하는 동작이므로 폐기 대신 호출하지 않는다.
- 여러 초안을 임의 순서로 일괄 저장하지 않는다. 폐기/편집 계속 확인을 사용하고 저장 실패 시 입력을 보존한다. overlay를 열기 전에 초안을 먼저 없애지 않는다.

### I03. 이전 의견 보관함
- Related Files:
  - components/workspace/production/comments/LegacyCommentsArchive.tsx :: LegacyCommentsArchive — modify
  - hooks/workspace/use-legacy-comments.ts :: useLegacyComments — reuse
  - components/comments/CommentsProvider.tsx :: useLegacyCommentIdentity — new export
  - lib/comments/repository.ts :: readExisting — read-only/reuse
  - lib/comments/domain.ts :: resolveCommentIdentity — reuse

#### Details
~~~typescript
function useLegacyCommentIdentity(): CommentIdentity | null;
~~~
- CommentsProvider 바깥 레거시 identity Context에 원래 resolveCommentIdentity(auth/session/profile) 결과를 보관한다. 프로젝트용 합성 namespace로 레거시 DB를 조회하지 않는다.
- CommentsWorkspace에 **이전 의견** 진입을 추가하고 LegacyCommentsArchive를 재사용한다. readExisting만 호출하여 kpc-pin-comments를 읽는다.
- 원본 thread/message/좌표/isSeed/시각을 보존한다. 데이터가 없으면 빈 상태이며 신규 project로 자동 이관하지 않는다. archive를 위해 load/seed/execute 또는 삭제를 호출하지 않는다.

## Acceptance Criteria
- [x] 동료 제작 화면·핀 위치·팝업·답글·멘션·키보드 동작을 유지한다.
- [x] project/round/namespace 간 의견이 섞이지 않고 이력은 읽기 전용이다.
- [x] 신규 저장 후 같은 threadId의 팝업을 열 수 있고 재조회 루프가 없다.
- [x] 미저장 입력은 이동 전에 보호하고 저장 충돌 시 유지한다.
- [x] 이전 DB를 seed하지 않고 기존 데이터만 이전 의견에서 조회한다.

## Validation
- npm run typecheck
- npx eslint components/comments components/workspace/production/comments/LegacyCommentsArchive.tsx hooks/workspace/use-canvas-comments.ts lib/comments/workspace-repository.ts lib/comments/controller.ts
- git diff --check
- 정적 검토: popup 상태/쓰기/삭제 조건, drag/key handler 권한, load effect의 revision 의존성, legacy readExisting 경로, 멘션 후보 제한.
- node --require tsx/cjs - stdin으로 adapter read/execute callback을 인메모리 stub으로 만들어 CommentController에 주입한다. 생성 threadId 그대로 반환/선택, rejected execute 후 drafts 유지, dispose 후 응답 무시, scope 불일치와 snapshot 쓰기 거부를 검증한다.
- fixture는 CommentSnapshot의 scope/surface/users/threads/messages를 사용한다. empty는 threads/messages=[], surface.nextNumber=1, surface.seedVersion=1, createdAt=고정 ISO다. identity.scope.surfaceId는 production-preview, namespace는 합성 namespace다. 실제 사용자 DB는 열지 않는다.
- 브라우저 드래그/포커스를 실행 검증한 것으로 보고하지 않는다.

## Commit Message
~~~text
feat(workspace): 동료 핀 UI를 프로젝트별 코멘트 저장소에 연결

Plan: 2026-11-04-workspace-shared-header-files
Phase: P01-shared-workspace
Task: T05-colleague-comment-bridge

- 기존 컨트롤러를 공통 저장 명령과 연결
- 프로젝트별 권한과 읽기 전용 보관함 유지
~~~

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 전체 T01~T10 최종 단일 커밋에 포함 (본 파일의 Git 이력 참조)


## Execution Result
- typecheck/lint/diff 및 adapter/controller 인라인 검증 통과. 초안 실패 보존·scope/과거 쓰기 거부·dispose 응답 무시 확인. 브라우저 미실행.
- 사용자 요청으로 개별 커밋 보류. 전체 완료 후 단일 커밋.
