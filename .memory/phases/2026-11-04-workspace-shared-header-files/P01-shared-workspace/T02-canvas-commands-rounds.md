# Task: T02 화면 코멘트 명령·권한·회차 보존

## Status: done

## Goal
프로젝트 참여자가 동료 핀 UI의 명령을 공통 작업 저장소에 안전하게 저장하고, 완성·재작업 시 화면 의견도 파일 및 슬라이드 의견과 함께 보존되게 한다.

## Decision Summary
- 선행 T01의 v2 RoundBody.canvasComments를 사용한다. 기존 슬라이드 comment-* 명령은 그대로 유지한다.
- 화면 핀 처리 상태는 작성자/PM/슈퍼 관리자만 변경한다. 자신의 본문·답글 수정/삭제, 스레드 작성자의 전체 삭제, 참여자의 핀 이동 등 기존 동료 동작은 유지한다.
- UI는 추후 Task에서 연결한다. 도메인 저장 검증은 UI와 무관하게 우회 요청을 거부해야 한다.

## Implementation

### I01. 명령·조회 투영·권한 계약
- Related Files:
  - types/workspace-production.ts :: WorkspaceOperation — modify
  - lib/workspace/production/schemas.ts :: publicOperations — modify
  - lib/workspace/production/canvas-comments.ts :: projectCanvasSnapshot, canvasCapabilities, applyCanvasCommand — new
  - lib/comments/domain.ts :: applyCommentCommand, commandSchema, normalizeCommentDraft — 기존 순수 로직 재사용; schema export만 필요 시 modify
  - config/comments.ts :: CommentCommand, CommentSnapshot, CommentIdentity — read-only
#### Details
~~~typescript
// WorkspaceOperation에 추가
type CanvasOperation = { type: "canvas-command"; command: CommentCommand };
interface CanvasCommentCapabilities {
  readOnly: boolean;
  canCreate: boolean;
  replyThreadIds: string[];
  moveThreadIds: string[];
  statusThreadIds: string[];
  deleteThreadIds: string[];
  editableMessageIds: string[];
  deletableMessageIds: string[];
}
function projectCanvasSnapshot(
  state: ProjectWorkspaceState, context: WorkspaceContext, createdAt: string
): CommentSnapshot;
function canvasCapabilities(
  state: ProjectWorkspaceState, context: WorkspaceContext, readOnly: boolean
): CanvasCommentCapabilities;
function applyCanvasCommand(
  state: ProjectWorkspaceState, command: CommentCommand,
  context: WorkspaceContext, createdAt: string, reservedIds: Set<string>
): { canvas: CanvasCommentState; createdIds: string[] };
~~~
- public 명령은 기존 CommentCommand의 create-thread/reply/edit-message/delete-message/delete-thread/move-thread/set-status를 그대로 내포한다. 생성 threadId/messageId는 컨트롤러가 생성한 값을 보존한다. authorId/role/회차 등 사용자 결정 필드는 명령에 추가하지 않는다.
- canvas scope는 {surfaceId:"production-preview", namespace:JSON.stringify([context.identity.namespace,state.projectId,state.currentRound])}. 저장된 프로젝트 범위와 동일성 비교용이며 인증 권한 대체물이 아니다. 레거시 DB namespace로 재사용하지 않는다.
- projection은 scope를 thread/message에 붙이되 canvas 전용 carriedFrom은 CommentThread projection에서 제거한다. strict CommentSnapshot에 저장 전용 필드를 넘기지 않는다.
- projection.users는 현재 멤버와 actor, 저장된 작성자·멘션 대상·resolvedBy 식별자의 합집합이다. 기존 validator가 과거 참조도 users에 존재하도록 요구하므로 탈퇴자도 조회 검증용으로 포함한다. authorName과 멘션 name은 저장값을 보존하며 이름 자료가 없는 resolvedBy는 “이전 참여자”로 둔다. 이 항목은 접근 권한이나 새 멘션 자격을 부여하지 않는다.
- 신규/편집/답글 command.draft는 applyCommentCommand 전에 현재 catalog.members만으로 normalizeCommentDraft를 검증한다. 탈퇴자를 포함한 projection.users를 새 멘션 허용 목록으로 쓰지 않는다. UI 멘션 후보도 현재 멤버만 사용한다.
- surface={...scope,seedVersion:1,nextNumber:canvas.nextNumber,createdAt}. createdAt은 해당 file round.createdAt; 보관 UI에서는 snapshot.createdAt을 사용한다. 실제 메시지 작성 시각을 이 값으로 대체하지 않는다.
- 공통 명령 schema를 재사용하되 WorkspaceIdSchema/finite point/기존 text·mention 제한을 모두 적용한다. 신규 IDs는 명령 내부와 현재/과거/undo/슬라이드 의견의 사용 ID 집합과 충돌하지 않아야 한다. 유효한 외부 생성 ID를 임의 재발급하지 않는다.
- applyCanvasCommand는 clone한 projection에 기존 applyCommentCommand를 적용하고 scope 필드를 제거해 새 canvas를 반환한다. surviving thread의 carriedFrom은 원본 map에서 유지하고 신규는 null이다. 전달한 state는 변경하지 않는다.
- 먼저 프로젝트 접근, writing/현재 회차를 확인한다. set-status에만 추가 author/PM/super 조건을 적용한다. 자기 댓글 수정/삭제 제한은 PM에게도 완화하지 않는다. resolved 스레드 답글 금지는 기존 로직을 따른다.
- CommentError를 WorkspaceError로 매핑한다: invalid/empty/resolved→VALIDATION, forbidden/unidentified→FORBIDDEN, conflict→CONFLICT, not_found→NOT_FOUND, db_unavailable/db_blocked/storage→대응 DB/STORAGE 오류. READ_ONLY는 projection 전에 발생시킨다. 모든 실패는 상태/파일/카운터를 변경하지 않는다.

### I02. 트랜잭션·회차·집계 연결
- Related Files:
  - lib/workspace/production/domain.ts :: applyWorkspaceMutation, snapshot, start-round — modify
  - lib/workspace/production/selectors.ts :: getCompletionSummary, selectSnapshotView — modify
  - services/workspace/IndexedDbWorkspaceRepository.ts :: execute, commitPrepared — 재사용/필요한 타입 수정
  - services/workspace/WorkspaceProductionService.ts :: execute — 재사용
  - lib/workspace/production/comment-domain.ts :: applyProjectComment — read-only
#### Details
- applyWorkspaceMutation은 이미 projectId/expectedRevision/expectedRound와 파일 회차를 확인한다. canvas-command는 기존 startsWith("comment-") 분기와 별개 switch case로 넣는다. canvas의 current round는 state.currentRound에서만 결정한다.
- used ID 수집에 현재/모든 snapshot/undo canvas thread/message ID를 추가한다. 정상 보관 복제로 중복된 ID는 Set에 중복 없이 등록할 뿐 오류로 보지 않는다. 새 ID와 기존 ID의 충돌만 거부한다.
- 성공 시 body.canvasComments 교체, 전체 workspace.revision 1 증가, inputRevision은 증가시키지 않는다(제안 콘텐츠/PPT 입력 변경이 아님). 기존 코멘트처럼 undo는 생성하지 않고 기존 undo 무효화 정책을 따른다. create-thread는 [threadId,messageId], reply는 [messageId]를 receipt.createdIds에 반환한다.
- complete는 기존 snapshot 생성으로 canvas까지 깊은 복사한다. start-round는 기존 파일 회차 전환과 같은 트랜잭션에서 처리한다.
- start-round에서 기존 회차의 미처리 canvas 스레드만 복사한다. thread와 모든 message에 새 ID, rootMessageId/threadId remap, carriedFrom={round:이전 회차,threadId:원본 ID}. 작성자/본문/멘션/isSeed/좌표/원래 작성·수정 시각은 보존하고 사본 revision은 1, status open/resolved 필드 null이다. 새 회차 번호는 기존 number를 보존하고 nextNumber도 이전값을 계승해 삭제 번호를 재사용하지 않는다.
- 완료 의견은 새 canvas에서 제외하되 snapshot에 남긴다. 이전 회차 snapshot.body와 File Blob은 변경하지 않는다. 미완성 재작업도 kind=unfinished snapshot을 먼저 생성한다.
- getCompletionSummary.openComments에 canvas open 개수를 더한다. slide/review/canvas를 한 번씩만 센다. selectTocRows의 section별 수에는 canvas를 더하지 않는다.
- selectSnapshotView는 기존 읽기 전용 계약으로 당시 body.canvasComments를 반환한다. 전달한 보관 투영을 저장 명령의 현재 state로 사용하지 않는다.

## Acceptance Criteria
- [x] 프로젝트/namespace/회차를 넘긴 요청과 stale revision 요청은 거부되며 부분 쓰기가 없다.
- [x] 남의 상태 변경은 일반 참여자에게 거부되고 작성자/PM/슈퍼 관리자에게 허용된다. 남의 본문 편집은 여전히 금지된다.
- [x] ID·멘션·좌표 조작, resolved 답글, 완료 상태 쓰기를 거부한다.
- [x] 재작업은 미처리 핀/답글만 새 ID로 계승하고 원본 및 기존 슬라이드 연결을 보존한다.
- [x] 전체 의견 수에는 화면 핀을 포함하고 임의 소목차에는 더하지 않는다.

## Validation
- npm run typecheck
- npx eslint lib/workspace/production lib/comments/domain.ts types/workspace-production.ts services/workspace/IndexedDbWorkspaceRepository.ts services/workspace/WorkspaceProductionService.ts
- git diff --check
- 최종 Task의 인라인 도메인 검증을 이 Task의 구현 상태에 맞춰 canvas/회차 부분부터 수행한다. 명령은 PowerShell here-string을 node --require tsx/cjs - 로 전달하며 파일을 만들지 않는다.
- 필수 시나리오: 두 프로젝트에 같은 round=1; 다른 actor의 set-status 거부; PM의 상태 처리 성공/본문 편집 거부; 핀 이동 유지; duplicate client ID 거부; 회차 전환 시 unresolved 1/resolved 1의 계승; 파일 snapshot과 canvas snapshot 불변; stale revision 실패. 실제 검증한 assert/결과를 Progress에 기록한다.

## Commit Message
~~~text
feat(workspace): 화면 코멘트 명령과 회차별 의견 보존 연결

Plan: 2026-11-04-workspace-shared-header-files
Phase: P01-shared-workspace
Task: T02-canvas-commands-rounds

- 화면 코멘트 명령·권한·회차 보존
- 기존 데이터 및 사용자 확정 정책 보존
~~~

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 전체 T01~T10 최종 단일 커밋에 포함 (본 파일의 Git 이력 참조)


## Execution Result
- typecheck/lint/diff와 코멘트 권한·ID/좌표/멘션·충돌·완성/미완성 회차 계승 인라인 검증 통과.
- 사용자 요청으로 개별 커밋 보류. 전체 완료 후 단일 커밋.
