# Task: T03 코멘트 상태 연결과 공용 헤더 정리

## Status: in_progress

## Goal

코멘트의 메모리 초안과 비동기 저장 상태를 앱 레이아웃 수명으로 관리하고, 모든 메뉴의 공용 헤더를 제거하면서 모바일 사이드바 열기와 기존 모달 포커스 복귀를 유지한다. 다음 UI Task가 저장소를 직접 조작하지 않고 동일한 controller를 쓰게 한다.

## Decision Summary

- Plan: 2026-10-29-production-pin-comments / Phase: P01-pin-comments. T01 도메인·T02 IndexedDB 저장소 완료가 전제다.
- 초안은 팝업/경로 전환 후 유지, 새로고침·계정 변경 시 제거. 등록 데이터만 DB 저장. 새 임시 핀은 최대1개.
- 헤더는 모든 메뉴에서 제거한다. 제작의 가용 영역 전체를 사용하되 다른 메뉴의 본문 스타일·인증·역할 판단과 프로필/토큰 상태는 보존한다.

## Prerequisite Contract

config/comments.ts와 domain.ts의 계약:

~~~typescript
type CommentStatus = "open" | "resolved";
interface CommentScope { namespace: string; surfaceId: "production-preview" }
interface CommentUser { id: string; name: string; isMock: boolean }
interface CommentIdentity { scope: CommentScope; actor: CommentUser }
interface CommentPoint { xRatio: number; yRatio: number }
interface CommentMention { userId: string; name: string; start: number; end: number }
interface CommentDraft { text: string; mentions: CommentMention[] }
interface CommentSurface extends CommentScope {
  seedVersion: 1; nextNumber: number; createdAt: string;
}
interface CommentThread extends CommentScope, CommentPoint {
  id: string; number: number; rootMessageId: string; authorId: string;
  status: CommentStatus; createdAt: string; updatedAt: string;
  resolvedAt: string | null; resolvedBy: string | null;
  revision: number; isSeed: boolean;
}
interface CommentMessage extends CommentScope, CommentDraft {
  id: string; threadId: string; kind: "root" | "reply";
  authorId: string; authorName: string; createdAt: string; updatedAt: string | null;
  revision: number; isSeed: boolean;
}
interface CommentSnapshot {
  scope: CommentScope; surface: CommentSurface; users: CommentUser[];
  threads: CommentThread[]; messages: CommentMessage[];
}
type CommentErrorCode =
  | "empty" | "invalid" | "forbidden" | "not_found" | "conflict"
  | "resolved" | "unidentified" | "db_unavailable" | "db_blocked" | "storage";
class CommentError extends Error {
  readonly code: CommentErrorCode;
  constructor(code: CommentErrorCode, message: string, options?: ErrorOptions);
}
type CommentCommand =
  | { type: "create-thread"; threadId: string; messageId: string; point: CommentPoint; draft: CommentDraft }
  | { type: "reply"; threadId: string; messageId: string; draft: CommentDraft }
  | { type: "edit-message"; messageId: string; expectedRevision: number; draft: CommentDraft }
  | { type: "delete-message"; messageId: string; expectedRevision: number }
  | { type: "delete-thread"; threadId: string; expectedRevision: number }
  | { type: "move-thread"; threadId: string; expectedRevision: number; point: CommentPoint }
  | { type: "set-status"; threadId: string; expectedRevision: number; status: CommentStatus };
function resolveCommentIdentity(input: {
  authEnabled: boolean; session: Session | null; displayName: string;
}): CommentIdentity | null;
function normalizeCommentDraft(draft: CommentDraft, users: readonly CommentUser[]): CommentDraft;
function canEditComment(message: CommentMessage, actorId: string): boolean;
function canManageThread(thread: CommentThread, actorId: string): boolean;
function getThreadMessages(snapshot: CommentSnapshot, threadId: string): CommentMessage[];
~~~

lib/comments/repository.ts의 계약:

~~~typescript
interface CommentRepository {
  load(identity: CommentIdentity): Promise<CommentSnapshot>;
  execute(identity: CommentIdentity, command: CommentCommand): Promise<CommentSnapshot>;
  close(): void;
}
interface IndexedDbCommentRepositoryOptions {
  dbName?: string; factory?: IDBFactory; now?: () => string;
}
class IndexedDbCommentRepository implements CommentRepository {
  constructor(options?: IndexedDbCommentRepositoryOptions);
  load(identity: CommentIdentity): Promise<CommentSnapshot>;
  execute(identity: CommentIdentity, command: CommentCommand): Promise<CommentSnapshot>;
  close(): void;
}
~~~

- load는 현재 scope에 최초 예시를 딱 한 번 저장하고 등록된 전체 snapshot을 반환한다. execute는 DB 최신 값에서 권한/revision/상태를 검사하고 transaction 완료 후 전체 snapshot을 반환한다.
- 정상 저장 실패는 CommentError이며 부분 저장 없음. first root/edit/delete 권한은 본인, move/status는 모두. reply는 open 대화에만. thread 전체 삭제는 첫 의견 작성자만.
- seed 두 대화와 네 메시지, 현재 사용자/김민수/이서연이 존재한다. 모든 날짜는 ISO UTC, 좌표는0~1, mentions는 UTF-16 start 포함/end 제외.
- CommentRepository는 UI 초안·선택 상태·팝업 크기를 모른다.

## Existing integration context

- components/providers.tsx: useAuthRuntime() → {authEnabled:boolean,session:Session|null}.
- components/profile/ProfilePreviewProvider.tsx: useProfilePreview() → profile.name, state.previewRole 및 기존 토큰 API. profile는 로그인 표시 이름 또는 개발 미리보기 정소담이다.
- app/(authenticated)/layout.tsx는 requireAppAccess() 뒤 FluentUiProvider > ProfilePreviewProvider > AppShell(children) + TokenDialogs를 렌더링한다.
- components/layout/AppShell.tsx는 SIDEBAR_ID=workspace-sidebar, AppHeader import/render, mainRef 경로 포커스, 메뉴 body scroll 잠금/Tab 순환, sidebarCollapsed CSS 변수220/54px를 가진다.
- components/layout/AppHeader.tsx의 모바일 Button ID는 workspace-sidebar-trigger. 760px 이하에서 표시되고 onMenuToggle을 호출한다.
- ProfilePreviewProvider.restoreTokenFocus와 AppShell.closeMenu가 위 ID를 포커스 복귀 대상으로 사용한다. 버튼을 단순 삭제하면 모바일에서 메뉴 접근과 모달 닫기 포커스가 깨진다.
- NavSidebar는 position:fixed/zIndex30, 모바일 backdrop은 zIndex20, 프로필 팝오버50, 기존 토큰 Dialog4000 이상이다.
- 현재 AppShell main은 maxWidth1320px, padding40px38px, 모바일 padding30px20px이다. 페이지별 새 viewport 고정 헤더를 만들어 기존 헤더를 대체하지 않는다.

## Implementation

### I01. 테스트 가능한 메모리 controller

- Related Files:
  - lib/comments/controller.ts :: CommentController, CommentControllerState, CommentOperationResult — new
  - tests/lib/comments/controller.test.ts :: state lifetime / async failures — new
  - lib/comments/repository.ts :: CommentRepository — read-only
  - lib/comments/domain.ts :: validation / permissions — read-only

#### Details

**Signatures & Types**

~~~typescript
type CommentView = { kind: "new" } | { kind: "thread"; threadId: string } | null;
interface CommentEditorDraft extends CommentDraft { revision: number; baseRevision: number | null }
interface CommentPopupSize { width: number; height: number }
interface CommentControllerState {
  status: "idle" | "loading" | "ready" | "error";
  snapshot: CommentSnapshot | null;
  error: { code: CommentErrorCode; message: string } | null;
  busy: boolean; pinMode: boolean; view: CommentView;
  pendingPoint: CommentPoint | null;
  drafts: Record<string, CommentEditorDraft>;
  editingMessageId: string | null;
  popupSize: CommentPopupSize;
}
type CommentOperationResult = { ok: true } | { ok: false; code: CommentErrorCode | "busy"; message: string };
interface CommentControllerOptions {
  identity: CommentIdentity;
  repositoryFactory: () => CommentRepository;
  createId?: () => string;
}
class CommentController {
  constructor(options: CommentControllerOptions);
  getSnapshot(): CommentControllerState;
  subscribe(listener: () => void): () => void;
  load(): Promise<void>;
  updateActor(actor: CommentUser): void;
  togglePinMode(): void;
  placePin(point: CommentPoint): void;
  movePendingPin(point: CommentPoint): void;
  openThread(threadId: string): void;
  closePopup(): void;
  suspendUi(): void;
  setDraft(key: string, draft: CommentDraft): void;
  startEdit(messageId: string): void;
  rebaseEdit(messageId: string): void;
  cancelEdit(): void;
  setPopupSize(size: CommentPopupSize): void;
  clearError(): void;
  submitNew(): Promise<CommentOperationResult>;
  submitReply(threadId: string): Promise<CommentOperationResult>;
  saveEdit(messageId: string): Promise<CommentOperationResult>;
  deleteReply(messageId: string): Promise<CommentOperationResult>;
  deleteThread(threadId: string): Promise<CommentOperationResult>;
  moveThread(threadId: string, point: CommentPoint): Promise<CommentOperationResult>;
  setStatus(threadId: string, status: CommentStatus): Promise<CommentOperationResult>;
  dispose(): void;
}
interface CommentsContextValue {
  identity: CommentIdentity | null;
  state: CommentControllerState;
  controller: CommentController | null;
}
function CommentsProvider(props: { children: React.ReactNode }): React.ReactElement;
function useComments(): CommentsContextValue;
~~~

위 코드의 CommentsProvider/useComments/CommentsContextValue는 I02 파일에 위치하고, 나머지 controller 타입은 controller.ts에서 export한다.

**Data & Schema Fields**

- state는 immutable object snapshot이다. getSnapshot()은 상태 변경 전까지 같은 참조를 반환해야 한다. subscribe는 정확히 unsubscribe를 반환한다.
- 초기값: status idle, snapshot/error null, busy/pinMode false, view/pendingPoint/editingMessageId null, drafts {}, popupSize {width:360,height:360}.
- drafts 키: 새 핀은 new, 답글은 reply:THREAD_ID, 수정은 edit:MESSAGE_ID. draft.revision은 로컬 입력 변경 세대, baseRevision은 수정 시작의 message revision이며 new/reply는 null.
- identity는 controller 생명주기 동안 같은 scope/actor ID다. updateActor는 동일 ID의 이름 갱신만 허용한다. scope 전환은 새 controller로 처리한다.
- createId는 기본 crypto.randomUUID. 테스트에서는 순차 ID 함수를 주입한다.
- controller는 DOM·React·storage globals를 직접 다루지 않는다. repositoryFactory와 createId를 주입받아 지연 repository 테스트가 가능해야 한다.

**Execution Flow / Logic**

1. Precondition & Validation:
   - ready/snapshot 존재 및 동기 잠금 해제인 상태에서만 저장 명령을 시작한다. 잠금은 React 렌더를 기다리지 않고 메서드 진입에서 즉시 잡는다.
   - input validation은 normalizeCommentDraft로 재사용한다. 수정은 canonical text/mentions가 이전 메시지와 달라야 한다. expectedRevision은 수정 초안의 baseRevision 또는 현재 대상 thread/message에서 얻는다.
   - 잘못된 key와 없거나 타인인 수정 대상은 오류로 처리한다. 임의 사용자 ID를 메서드 인자로 받지 않는다.
2. Core Processing — load/state:
   - load는 repository를 필요할 때 생성하고 status loading으로 변경한다. 성공하면 snapshot/ready, 실패면 error/오류정보. 재시도 가능하다.
   - load 동안 mutation을 받지 않는다. mutation 중 load는 실행하지 않아 늦은 read가 저장 결과를 덮지 않게 한다. 중복 load는 기존 요청을 재사용하거나 최신 세대 결과만 반영한다.
   - refresh load는 현재 초안·팝업 크기를 보존한다. 다른 탭에서 없어진 대상의 열린 view만 닫고, 복원할 수 없는 수정 초안은 안내 후 정리한다. 자동 실시간 동기화 기능은 만들지 않는다.
   - togglePinMode: 유효한 내용의 pendingPoint/new 초안이 있으면 그 팝업 재개. 아니면 모드를 토글한다. 기존 대화 popup을 닫아도 그 답글 초안은 유지한다.
   - placePin: 유효 좌표의 pendingPoint 저장, view new, pinMode false. 입력 초안은 new 키로 관리한다.
   - movePendingPin: 존재하는 임시 핀 좌표만 바꾸고 view·본문 초안은 유지한다. DB 저장은 하지 않는다.
   - openThread: 존재하는 ID만 열고 pinMode false. 다른 대화의 draft를 지우지 않는다.
   - closePopup/suspendUi: view=null, pinMode=false, editingMessageId=null. 본문이 없는 임시 새 핀만 제거. 내용이 있는 pending/new 및 reply/edit 초안과 popupSize는 유지한다.
   - startEdit: 본인 메시지에서 기존 edit 초안이 있으면 재개하고 없으면 본문+mentions/baseRevision을 복사. cancelEdit는 명시적 취소로 해당 edit 초안을 버리고 원문을 보존한다.
   - rebaseEdit: 사용자가 최신 저장 내용을 확인한 뒤 명시적으로 요청한 경우에만 기존 edit 초안의 본문을 유지하면서 baseRevision을 현재 message.revision으로 맞춘다. 본인 여부를 다시 검사한다. load가 이 동작을 자동 수행하지 않는다.
3. Core Processing — mutation:
   - submitNew는 새 thread/message ID를 생성하고 create-thread command. 성공하면 pendingPoint를 제거하고, 아직 해당 새 핀 작성창을 보고 있을 때만 새 thread view로 전환한다. 다른 핀을 보고 있다면 그 선택을 유지한다. 해당 new 초안만 정리한다.
   - submitReply는 view가 바뀌더라도 인자로 받은 대상에 저장하고, 성공한 대상의 reply 초안만 정리한다.
   - saveEdit는 edit 초안의 baseRevision으로 저장한다. 성공 시 해당 edit 상태 종료. createdAt은 바꾸지 않는다.
   - moveThread/setStatus/deleteThread/deleteReply는 최신 controller snapshot revision으로 command를 만든다. deleteReply는 reply만 허용한다.
   - DB 결과 snapshot을 한 번에 적용한다. 저장 중 입력이 바뀌었으면 제출할 때 캡처한 draft.revision과 비교해 새 입력을 비우지 않는다. 열린 view가 다른 핀으로 바뀌었다면 예전 저장 결과가 새 선택을 강제로 바꾸지 않는다.
   - thread 삭제 성공 시 해당 reply/edit 초안을 정리하고 삭제된 thread가 선택되어 있을 때만 닫는다. resolved로 바꿀 때 작성 중 답글은 보존하되 UI 전송은 막는다. 재개 후 이어 쓴다.
4. Error & Exception Handling:
   - 실패하면 DB snapshot, pendingPoint, 초안, 선택을 보존하고 error에 한국어 메시지/code 저장한다. busy 해제는 해당 실행 세대가 맞을 때만 수행한다.
   - conflict는 자동으로 사용자 글을 덮거나 재전송하지 않는다. 재시도 load로 최신 내용을 확인하게 한다. storage 실패를 ready 성공으로 위장하지 않는다.
   - class는 모든 public async operation에서 CommentOperationResult로 실패를 반환하여 UI에 unhandled rejection이 남지 않게 한다. load는 자체 상태로 오류를 전달한다.
5. State Transition & Return:
   - dispose는 요청 세대를 증가시키고 repository.close로 연결을 정리한다. 이전 요청의 성공/실패/finally가 새 상태에 영향을 주지 못한다.
   - React Strict Mode에서 cleanup 후 다시 load할 수 있도록 dispose 후 repository를 다시 만들 수 있어야 한다. 초기화 표식으로 샘플이 중복되지 않는다.
   - listener는 데이터 변경 시에만 통지하며 getSnapshot 참조가 무한히 바뀌어 렌더 루프를 만들지 않는다.

### I02. 레이아웃 Provider와 작성자 경계

- Related Files:
  - components/comments/CommentsProvider.tsx :: CommentsProvider, useComments, 내부 계정별 controller Provider — new
  - app/(authenticated)/layout.tsx :: AuthenticatedLayout — modify
  - components/providers.tsx :: useAuthRuntime — read-only
  - components/profile/ProfilePreviewProvider.tsx :: useProfilePreview, 기존 포커스 복귀 — read-only

#### Details

**Signatures & Types**: I01에 명시된 CommentsContextValue와 CommentsProvider/useComments를 export한다. Provider props는 children뿐이며 런타임 DB 구현은 repositoryFactory에서 생성한다.

**Execution Flow / Logic**

1. resolveCommentIdentity({authEnabled,session,displayName:profile.name})를 사용한다. displayName/관리자 미리보기 변경이 계정 key를 바꾸지 않게 한다.
2. 계정 key는 namespace+surfaceId+actor.id의 안정적인 조합. 내부 Provider를 이 key로 구분해 계정 변경 시 controller/메모리 초안을 분리한다.
3. useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)로 상태를 구독한다. 초기 서버 snapshot은 idle이며 window/IndexedDB를 읽지 않아 hydration 차이를 만들지 않는다.
4. pathname이 /workspace/write에 진입할 때 load한다. 다른 경로로 이동하면 suspendUi만 호출하고 layout Provider를 유지하여 초안을 보관한다. 이후 제작 재진입 시 refresh load.
5. identity=null이면 controller=null이며 unidentified 오류 상태를 제공한다. 실제 인증 상태에서 임의의 미리보기 사용자를 넣거나 다른 계정 DB를 열지 않는다.
6. 계정 이름이 변경되면 updateActor로 이름만 갱신한다. 권한·데이터 namespace는 동일하다.
7. 레이아웃 구조는 FluentUiProvider > ProfilePreviewProvider > CommentsProvider > [AppShell(children), TokenDialogs]로 한다. requireAppAccess/dynamic=force-dynamic 및 기존 인증 흐름은 유지한다.
8. effect cleanup에서 controller.dispose. 늦게 끝난 이전 계정 작업을 새 context에 적용하지 않는다. Context가 없는 useComments 호출은 명확한 개발 오류를 던진다.

### I03. 전체 헤더 제거와 모바일 열기 이동

- Related Files:
  - components/layout/AppShell.tsx :: AppShell, useStyles, closeMenu, onNavigate — modify
  - components/layout/AppHeader.tsx :: AppHeader — 사용처 제거 후 파일 제거
  - components/layout/NavSidebar.tsx :: 기존 닫기/접기 — read-only
  - components/profile/ProfilePreviewProvider.tsx :: restoreTokenFocus — read-only

#### Details

**Signatures & Types**

~~~typescript
// 기존 AppShell props와 NavSidebar 계약은 변경하지 않는다.
interface AppShellProps { children: React.ReactNode }
// 내부에서 useComments().controller?.suspendUi()를 사용한다.
~~~

**Execution Flow / Logic**

1. AppHeader import/render를 모든 메뉴의 공용 셸에서 제거한다. 경로 표시·헤더 높이72/64px·하단 구분선도 함께 없어져야 한다.
2. AppShell에 Fluent Button + NavigationRegular의 모바일 독립 버튼을 둔다:
   - id=workspace-sidebar-trigger, aria-controls=workspace-sidebar, aria-expanded=menuOpen, aria-label=메뉴 열기/메뉴 닫기.
   - desktop display none, 760px 이하 display inline-flex. fixed top16px/left16px, 최소40px 정사각형, 흰 배경/가벼운 경계, zIndex15.
   - backdrop20/sidebar30 아래에 위치한다. 버튼을 누르면 먼저 comment controller.suspendUi 후 menuOpen=true.
   - 새 상단 바나 전체 폭을 차지하는 헤더를 만들지 않는다.
3. 기존 mainColumn inert={menuOpen}, body overflow 잠금 복구, sidebar Tab 순환, Escape 우선순위, closeMenu의 trigger 포커스 복귀를 보존한다.
4. pathname===/workspace/write에만 production content class를 적용한다. maxWidth none, margin0, padding0, width100%, display flex/flexDirection column, minHeight100svh로 상단부터 가용 작업 공간을 만든다. 기존 footer는 그 뒤 문서 흐름에 유지한다.
5. 위 production padding0은 모바일 media 규칙에서도 명시하여 기존 30px20px padding이 다시 적용되지 않게 한다.
6. 다른 메뉴는 기존 본문 maxWidth1320/padding40px38px 및 모바일30px20px를 유지하되 모바일 독립 버튼과 제목이 겹치지 않도록 top 여백만 충분히 조정한다(최소64px).
7. sidebar 폭220/54 CSS 변수, skip link, mainRef 경로 변경 포커스, 프로필·토큰 UI/설정값은 바꾸지 않는다.
8. 셸 안의 모바일 사이드바 오픈 상태가 코멘트의 팝업/생성 모드를 남기지 않게 한다. 기존 프로필 팝오버/토큰 Dialog가 Esc를 처리하는 로직을 침범하지 않는다.

### I04. controller 검증과 헤더 회귀 확인

- Related Files:
  - tests/lib/comments/controller.test.ts :: 상태와 async lifecycle — new

#### Details

- store 구독이 불변 snapshot 참조를 유지하는지, 입력 변경만으로 DB를 호출하지 않는지 확인.
- close/reopen, thread 전환, suspendUi 후 새/reply/edit 초안 보존; 빈 새 핀 정리, nonempty 새 핀 재개; cancelEdit 명시적 폐기.
- 지연 Promise repository로 연속 클릭 두 번 중 첫 요청만 전송, 실패 시 초안·좌표 유지, 입력 revision이 달라지면 성공 후 새 글을 지우지 않는 동작 검증.
- reply 저장 중 다른 thread를 열어도 선택을 빼앗지 않음. dispose 후 늦은 성공/실패가 state를 바꾸지 않음. dispose→load 재개 가능.
- load 실패→재시도, mutation 중 load 무시, conflict/no permission/resolved 오류 전달, 완료 상태 답글 보존, 삭제 후 해당 대상 초안만 정리.
- 수정 충돌 후 load해도 edit 본문/baseRevision이 자동 덮이지 않고, 명시적 rebaseEdit 후에만 최신 revision을 기준으로 저장하는지 검증한다.
- 역할/표시 이름 갱신은 소유권을 바꾸지 않으며 새 계정 controller는 빈 메모리 상태로 시작.
- 브라우저에서는 공용 헤더가 사라졌는지, 모바일 메뉴 열기·닫기·Tab/Esc·포커스와 토큰 사용량/신청 모달 닫기 복귀가 정상인지 확인한다. 코멘트 UI는 T04에서 연결하므로 아직 핀 UI 완료로 기록하지 않는다.

## Acceptance Criteria

- [ ] Provider가 앱 레이아웃에 한 번 연결되고 경로 이동으로 초안이 소멸하지 않는다.
- [ ] 계정·비동기 요청 세대를 분리하여 이전 결과가 새 계정/새 입력을 덮지 않는다.
- [ ] 모든 메뉴의 헤더가 제거되고 모바일 탐색은 유지된다.
- [ ] workspace-sidebar-trigger ID와 기존 토큰 포커스 연결이 남아 있다.
- [ ] 제작 main은 기존 최대 폭/패딩 제한을 받지 않고 다른 메뉴의 본문 스타일은 유지된다.

## Validation

- npm.cmd test -- tests/lib/comments/controller.test.ts tests/lib/comments/repository.test.ts tests/lib/profile-preview.test.ts tests/lib/token-preview.test.ts — 의미 있는 controller·기존 상태 회귀 통과.
- npm.cmd run typecheck — Provider/레이아웃 계약 통과.
- npx.cmd eslint lib/comments/controller.ts components/comments/CommentsProvider.tsx components/layout/AppShell.tsx 'app/(authenticated)/layout.tsx' tests/lib/comments/controller.test.ts — 오류 없음.
- rg -n AppHeader app components — 사용처 없음(0건이면 rg exit1 정상). 실제 제거된 파일과 불필요한 import 확인.
- npm.cmd run dev -- --port 3100 — 별도 로컬 검증 서버가 필요할 때만 사용. .env·실계정 인증 설정을 바꾸지 말고 현재 앱 설정으로 확인.
- 브라우저 1440×900, 390×844에서 헤더 제거·사이드바 접기/열기·토큰 모달 포커스 검사. 기존 서버가 같은 작업 내용을 제공하면 재사용한다.
- git diff --check — 공백 오류 없음.

## Commit Message

~~~text
feat(comments): 코멘트 상태 연결과 공용 헤더 정리

Plan: 2026-10-29-production-pin-comments
Phase: P01-pin-comments
Task: T03-comment-state-and-shell

- 메모리 초안과 저장 요청 수명을 사용자별로 관리
- 전체 헤더를 제거하고 모바일 탐색과 포커스 연결 유지
~~~

## Progress

- [x] 구현 완료
- [ ] 검증 통과
- commit: git log -1 --format=%h --grep='Task: T03-comment-state-and-shell'

## Execution Result (2026-10-29)

- controller·CommentsProvider·레이아웃 연결·전체 AppHeader 제거·모바일 독립 메뉴 버튼 구현을 작업 트리에 보존했다.
- 지정 테스트 116개 통과: controller 13개, 저장소 및 기존 프로필·토큰 회귀 포함. typecheck와 대상 ESLint 통과. AppHeader 검색 0건, diff check 통과.
- 지연 저장 테스트로 중복 전송 방지, 새 입력/선택 보존, 실패 시 초안 보존, dispose 후 늦은 결과 무시, 수정 충돌의 명시적 rebase를 확인했다.
- 미완료: 1440×900/390×844 실제 브라우저의 헤더·모바일 메뉴·Tab/Esc·토큰 모달 포커스 검증.
- 브라우저 연결 inventory가 비어 있었고, Windows Chrome 화면 읽기에서 현재 URL을 충분히 확인할 수 없다는 Computer Use 안전 차단이 발생하여 이 턴의 UI 자동화가 종료됐다. 다른 자동화 경로로 우회하지 않았다.
- 로컬 3000/3001 listener를 확인했다. 3100 별도 dev server는 기존 .next/dev/lock으로 시작되지 않았고 기존 프로세스를 종료하거나 설정을 변경하지 않았다.
- 당시 필수 검증이 남아 done 처리·T03 커밋·T04 진행을 보류했다.

### 후속 실행 — 사용자 요청: 남은 작업 구현

- 사용자가 남은 구현을 명시적으로 요청하여 T04 구현도 진행했다. T03의 실제 브라우저 검증을 완료한 것으로 간주하지 않는다.
- jsdom 27.4.0을 테스트 전용 의존성으로 추가했다. 기존 AppShell·ProfilePreviewProvider·TokenDialogs를 실행하는 DOM 테스트 3개로 헤더 미노출, 메뉴 열기/닫기, inert/스크롤 복원, 코멘트 UI 중지, Escape 및 토큰 사용량/신청 모달의 트리거 포커스 복귀를 확인했다.
- 최종 전체 404개 테스트, typecheck, 전체 lint, 프로덕션 build 통과. 마지막 테스트 도우미 정리 후 해당 3개 테스트와 전체 lint도 다시 통과했다.
- 구현 체크포인트를 이 Task의 한국어 메시지로 커밋한다. Status는 실제 브라우저 검증 대기이므로 in_progress를 유지한다.
- 남은 확인: 실제 1440×900/390×844 렌더링과 모바일 Tab 순환. jsdom은 CSS 배치·Tabster의 실제 브라우저 포커스 동작을 보증하지 않는다. 기존 Tab 처리 로직은 유지했다.
