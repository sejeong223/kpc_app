# Task: T04 제작 핀과 코멘트 팝업 UI 완성

## Status: pending

## Goal

실제 제작 경로에서 핀 생성·드래그·호버 미리보기·첫 의견/답글·멘션·수정/삭제·완료/재개·팝업 크기 조절을 사용할 수 있게 하고, 실제 브라우저 저장과 기존 탐색 기능을 검증한다.

## Decision Summary

- Plan: 2026-10-29-production-pin-comments / Phase: P01-pin-comments. 선행 T01 모델, T02 저장소, T03 controller/Provider/헤더 정리 완료.
- HTML에서는 핀 디자인만 추출한다. 기능은 비모달 팝업이며 팝업 최대50vw×80vh, 자체 너비420px에 완료 라벨 전환. 모든 사용자 핀 이동/상태 변경, 본인 글만 수정/삭제.
- 메뉴 이동 초안 유지·새로고침 초안 소멸·등록 DB 복원. 추가 네트워크/API/실제 알림/프로필 집계 연동은 없다.

## Prerequisite Contract

config/comments.ts 모델 및 domain.ts CommentError:

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
~~~

lib/comments/repository.ts의 CommentRepository는 load(identity)/execute(identity,command):Promise<CommentSnapshot>, close():void이며 transaction 완료 뒤 반환한다. controller가 저장소를 소유하므로 UI에서 직접 생성하거나 쓰지 않는다.

lib/comments/controller.ts 및 components/comments/CommentsProvider.tsx:

~~~typescript
interface CommentRepository {
  load(identity: CommentIdentity): Promise<CommentSnapshot>;
  execute(identity: CommentIdentity, command: CommentCommand): Promise<CommentSnapshot>;
  close(): void;
}
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

- useComments()의 state는 useSyncExternalStore로 갱신되며 ready/snapshot/controller/identity가 있어야 조작 가능하다. status=error는 오류·재시도 UI를 보여준다.
- drafts 키: new, reply:THREAD_ID, edit:MESSAGE_ID. value는 {text,mentions,revision,baseRevision}. 비어 있으면 {text:"",mentions:[]}로 읽되 렌더 중 setDraft를 호출하지 않는다.
- view는 null/new/thread, pendingPoint는 새 임시 핀 좌표다. closePopup/suspendUi는 초안 보관, cancelEdit만 명시적으로 수정 초안 폐기.
- movePendingPin은 새 임시 핀의 좌표만 변경하며 popup 선택/초안은 바꾸지 않는다. 등록 핀은 moveThread로 DB에 저장한다.
- 모든 쓰기 메서드는 실패도 결과값으로 반환하고 state.error를 설정한다. 실패 시 저장된 snapshot과 초안 유지. busy 중 재전송을 받지 않는다.
- submitNew 성공은 임시 핀을 정식 번호 핀으로 교체한다. reply/edit 저장 성공은 해당 초안만 정리한다. 상태 완료는 새 답글만 막고 본인 기존 글 관리는 허용한다.
- 도메인 함수: normalizeCommentDraft(draft,users):CommentDraft, canEditComment(message,actorId):boolean, canManageThread(thread,actorId):boolean, getThreadMessages(snapshot,threadId):CommentMessage[].
- 멘션 함수: findMentionQuery(draft,selectionStart,selectionEnd):{start,end,query}|null; insertMention(draft,query,user):{draft,caret}; reconcileMentionEdits(previous,nextText):CommentDraft; splitCommentText(draft):({kind:"text",text}|{kind:"mention",text,userId})[].
- seed는 진행 중 본인 핀1(.25,.30), 완료된 김민수 핀2(.68,.58), 각각 첫 의견+답글과 멘션을 갖는다. 새 핀은3번부터.
- COMMENT_VISUALS: red #d7192f, gray #9ca3af, white #fff, pinSize24, pinFontSize10.5, pinFontWeight850, popupDefaultWidth/Height360, minWidth320/minHeight240, labelWidth420, mobileBreakpoint760.

## Existing code context and guardrails

- app/(authenticated)/workspace/[screen]/page.tsx: async params로 screen을 받고 getSidebarItemByScreen/notFound, authEnabled+requiredRole에서 requireRole, PreviewRoleBoundary로 감싼 안내 section을 반환한다. 이 권한 흐름을 유지하고 screen==="write"에서만 CommentsWorkspace로 분기한다.
- AppShell은 T03에서 전체 헤더 제거, 제작 main padding0/maxWidth none/minHeight100svh, footer는 이후 흐름 유지. 모바일 버튼 workspace-sidebar-trigger와 Sidebar220/54px 폭 및 overlay/backdrop z30/20 유지.
- CommentsProvider는 layout 수명으로 이미 한 번 마운트되어 있다. page에서 다시 Provider를 만들면 경로 이동 초안이 유실된다.
- 기존 ModalFrame은 modal Dialog/backdrop이고 코멘트 popup과 다르다. 코멘트는 작업 영역 안의 fixed 비모달 div로 배치하여 테마·inert 경계를 유지한다.
- Fluent UI v9 Button/makeStyles/mergeClasses와 icons를 사용한다. 설치된 CommentAdd20Regular, Send20Regular, MoreHorizontal20Regular, Checkmark16Regular, Dismiss16Regular를 확인했다. 드래그/리사이즈 라이브러리·contenteditable·새 전역 CSS 시스템을 추가하지 않는다.
- 원본 HTML: C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html, SHA256 52dc1322383f79b1e880f9c4b51fbc182d99aafedd40532a5c48acb2f4b011e3. CSS309~312/1637~1645의 핀만 참조하며 스크립트를 실행/삽입하지 않는다.

## Implementation

### I01. 좌표·크기·시각 순수 함수

- Related Files:
  - lib/comments/geometry.ts :: 좌표/가용 경계/팝업 크기 — new
  - lib/comments/format.ts :: 등록/수정 시각 — new
  - tests/lib/comments/geometry.test.ts :: 변환·경계·리사이즈 — new
  - tests/lib/comments/format.test.ts :: 고정 now 시각 표시 — new

#### Details

**Signatures & Types**

~~~typescript
interface PixelPoint { x: number; y: number }
interface CommentBounds { left: number; top: number; right: number; bottom: number }
interface PopupLimits {
  bounds: CommentBounds; minWidth: number; minHeight: number;
  maxWidth: number; maxHeight: number;
}
type ResizeEdge = "e" | "s" | "se";
interface PopupRect extends PixelPoint, CommentPopupSize {}
function clientPointToRatio(point: PixelPoint, surface: CommentBounds): CommentPoint | null;
function ratioToClientPoint(point: CommentPoint, surface: CommentBounds): PixelPoint;
function keepPinInsideSurface(point: PixelPoint, surface: CommentBounds): PixelPoint;
function getPopupLimits(viewport: CommentBounds, surface: CommentBounds): PopupLimits | null;
function clampPopupSize(size: CommentPopupSize, limits: PopupLimits): CommentPopupSize;
function placeCommentPopup(anchor: PixelPoint, size: CommentPopupSize, limits: PopupLimits): PopupRect;
function resizeCommentPopup(start: PopupRect, delta: PixelPoint, edge: ResizeEdge, limits: PopupLimits): PopupRect;
function formatCommentTime(createdAt: string, now: number): { label: string; full: string };
~~~

**Data & Schema Fields**

- CommentBounds는 client 좌표다. width=right-left, height=bottom-top. DOMRect/visualViewport를 읽는 책임은 UI, 순수 함수는 number만 받는다.
- 저장된 좌표는 surface 안0~1 비율, popup 좌표는 client px, pin style 좌표는 client point에서 surface.left/top을 뺀 local px다.
- viewport는 visualViewport가 있으면 offsetLeft/Top 및 width/height를 이용한다. 없으면 (0,0,innerWidth,innerHeight). 가로/세로의 동일 기준 좌표를 유지한다.
- 유효 교집합이 없거나 면적이0이면 null로 반환하여 화면을 벗어난 팝업을 억지로 표시하지 않는다.

**Execution Flow / Logic**

1. Precondition & Validation: finite 크기와 양의 면적 검사. clientPointToRatio는 영역 밖 입력을0~1로 clamp하고, 면적0이면 null이다. 저장 좌표에 viewport scroll offset을 더해 중복 보정하지 않는다.
2. Core Processing:
   - ratioToClientPoint는 surface 크기에 비례한 위치를 만든다.
   - keepPinInsideSurface는 44px 히트 영역이 surface 밖으로 나가지 않도록 tip을 각 경계22px 안으로 최소 보정한다. 영역이44px보다 작으면 중앙에 둔다. 저장된 상대 좌표는 바꾸지 않는다. viewport 기준으로 pin을 고정하지 않아 스크롤 때 본문과 같이 움직인다.
   - getPopupLimits는 viewport와 surface의 교집합에서12px 여백을 뺀 bounds를 구한다. desktop(viewport width>760) maxWidth=min(viewportWidth*.5,boundsWidth), mobile은 boundsWidth. maxHeight=min(viewportHeight*.8,boundsHeight).
   - minWidth=min(320,maxWidth), minHeight=min(240,maxHeight). 작은 화면에서 min이 max를 이기지 않는다. 기본360×360도 이 한도로 clamp한다.
   - placeCommentPopup는 pin 오른쪽16px 우선, 안 맞으면 왼쪽16px, 둘 다 부족하면 bounds 안으로 clamp. top은 tip.y-22 기준으로 맞추되 bounds를 벗어나지 않는다.
   - resize는 시작 rect를 고정하고 e는 너비, s는 높이, se는 둘 다 delta를 반영한다. min/max를 적용하고 top/left를 가용 경계 안에 보정한다. resize 중 앵커 좌우를 계속 재선택해 튀지 않게 한다.
3. Error & Exception Handling: 유효하지 않은 geometry에서는 생성/드래그를 저장하지 않는다. scroll로 핀이 viewport 교집합 밖으로 나가면 popup을 닫아 초안을 보관한다.
4. State Transition & Return: 불변 값만 반환한다. ResizeObserver/window resize/scroll/visualViewport 변화 때 새 측정값으로 다시 계산한다.
5. formatCommentTime: now를 주입받아 테스트한다. 1분 미만 방금,1시간 미만 N분 전,24시간 미만 N시간 전,이후 한국어 MM.DD HH:mm. full은 Asia/Seoul 기준 연월일 시분. 미래 시각의 음수 차이는0으로 제한, 잘못된 시각은 알 수 없음. 본문에 수정됨을 별도 표시하고 생성시각을 수정시각으로 바꾸지 않는다.

### I02. 제작 작업 영역과 번호 핀

- Related Files:
  - components/comments/CommentsWorkspace.tsx :: CommentsWorkspace, 측정/포인터 처리 — new
  - components/comments/CommentPin.tsx :: CommentPin — new
  - app/(authenticated)/workspace/[screen]/page.tsx :: WorkspaceScreenPage 제작 분기 — modify

#### Details

**Signatures & Types**

~~~typescript
function CommentsWorkspace(): React.ReactElement;
interface CommentPinProps {
  pinId: string; number: number; status: "draft" | CommentStatus;
  position: PixelPoint; selected: boolean; disabled: boolean;
  previewId?: string;
  onActivate(): void; onPreview(visible: boolean): void;
  onPointerDown: React.PointerEventHandler<HTMLButtonElement>;
  onKeyDown: React.KeyboardEventHandler<HTMLButtonElement>;
}
function CommentPin(props: CommentPinProps): React.ReactElement;
~~~

**Data & Schema Fields**

- Workspace는 useComments의 snapshot/상태를 소비한다. surface DOM ref, hoveredPinId, 진행 중 drag preview, 실제 측정한 surface/viewport bounds만 로컬 상태로 둔다.
- surface는 position relative, flex1, width100%, minHeight100svh, overflow visible. 도구 버튼/오류 안내에는 data-comment-control을 둬 빈 영역 클릭으로 오인하지 않는다.
- 생성 버튼은 제작에서만 fixed top16/right20, zIndex5, CommentAdd20Regular + 핀 생성 텍스트. 생성 모드면 aria-pressed=true와 빨간 테두리/연한 배경. 모바일에서도 sidebar 열기 버튼과 겹치지 않는다.
- loading/error 안내는 작업 영역 내부에서 보여주며 저장 전 접근을 막는다. error에는 controller.load 재시도 제공. 정상 빈 상태에는 간단한 의견 작성 안내만 둔다.
- busy는 새 저장·드래그를 막지만 기존 핀의 클릭 열람·선택 전환까지 막지 않는다. ready가 아닌 경우의 disabled와 구분한다.
- DOM 테스트 계약: data-comment-surface, data-comment-create, data-comment-pin=ID, data-comment-preview, data-comment-popup, data-comment-message=ID, data-comment-composer, data-comment-send, data-comment-resize=e/s/se. 사용자 식별정보/인증토큰을 data 속성에 넣지 않는다.

**Execution Flow / Logic**

1. route는 기존 item 검증/서버 requireRole/PreviewRoleBoundary를 그대로 유지하고 write일 때 CommentsWorkspace만 반환한다. 다른 screen의 안내를 변경하지 않는다.
2. 생성 버튼은 togglePinMode. 모드 활성 시 surface에 crosshair, 버튼/핀/팝업/입력/메뉴 요소는 생성 hit 대상에서 제외한다. surface click의 client 좌표를 ratio로 변환해 placePin.
3. 작업 영역 키보드 포커스에서 생성 모드의 Enter/Space는 중앙(.5,.5)에 임시 핀을 만들어 입력창으로 이동한다. Esc는 생성 모드만 취소하고 새 값을 저장하지 않는다.
4. 등록 thread와 pendingPoint를 각각 표시한다. 임시 번호는 snapshot.surface.nextNumber, 정식 번호는 thread.number. 첫 등록 성공 시 controller가 DB의 확정 번호로 교체한다.
5. 핀 시각:
   - 시각 본체24×24px, radius50%50%50%2px, border2px white, backgroundred, 숫자white10.5px/850, shadow0 2px 6px rgba(215,25,47,.35).
   - 투명 hit button44×44px와 내부 body를 분리한다. tip을 기준으로 원본 translate(-2px,-22px)를 재현하고, 선택 scale1.25는 내부 body에만 적용한다. transform-origin은 꼬리 쪽으로 잡아 선택 시 pin이 움직이지 않게 한다.
   - draft는 white 배경/red 글자·테두리, resolved는 gray/기본 shadow없음. 선택 시 반투명 red4px 링. 완료도 focus/click 가능하며 disabled HTML 속성으로 막지 않는다.
   - button aria-label은 코멘트 N + 진행 중/반영 완료/작성 중. selected와 popup 연결을 aria-expanded/controls로 표현한다.
6. 드래그:
   - pointerdown에서 pointerId/원래좌표/보이는 tip과 pointer 차이를 저장하고 setPointerCapture. pin에서만 touch-action none으로 하고 surface 전체의 터치 스크롤을 막지 않는다.
   - 이동거리5px 이상일 때 drag로 판단해 메모리 preview 위치만 갱신한다. capture 동안 window pointermove/up/cancel 이벤트 또는 동등한 React 처리와 cleanup을 사용한다.
   - pointerup에서 이동한 경우 한 번만 moveThread 또는 movePendingPin. drag 후 합성 click은 한 번 억제해 popup을 잘못 열지 않는다. 이동하지 않았으면 평소 click으로 연다.
   - pointercancel/Esc/계정 변경/언마운트는 preview를 버리고 원래 저장 위치로 복귀한다. 저장 실패도 snapshot 위치로 복귀하고 오류를 보여준다.
   - keyboard 대안은 pin에 포커스 후 Alt+Arrow로1%, Alt+Shift+Arrow로5% 이동, repeat 이벤트는 무시. 0~1로 제한하고 한 명령만 저장한다. 조작 설명을 접근 가능한 도움말로 제공한다.
7. sidebar 폭 변화, ResizeObserver, scroll/resize, visualViewport 변화에 대응해 위치를 재계산한다. 문서 scroll 이벤트의 capture 처리 시 popup 내부 메시지 스크롤을 외부 scroll로 오인해 닫지 않는다.

### I03. 호버 미리보기와 텍스트 표시

- Related Files:
  - components/comments/CommentPreview.tsx :: CommentPreview — new
  - components/comments/CommentMessage.tsx :: CommentMessageView, CommentBody — new
  - lib/comments/format.ts :: formatCommentTime — read-only
  - lib/comments/mentions.ts :: splitCommentText — read-only

#### Details

~~~typescript
interface CommentPreviewProps { message: CommentMessage; position: PixelPoint; now: number }
function CommentPreview(props: CommentPreviewProps): React.ReactElement;
interface CommentMessageViewProps {
  message: CommentMessage; now: number; showActions: boolean; disabled: boolean;
  onEdit(): void; onDelete(): void;
}
function CommentMessageView(props: CommentMessageViewProps): React.ReactElement;
function CommentBody(props: { draft: CommentDraft }): React.ReactElement;
~~~

- 미리보기는 해당 thread.rootMessageId의 최신 본문을 사용한다. 왼쪽 위 작성자, 오른쪽 위 등록 시간, 아래 본문3줄까지. 흰 배경/얇은 회색 테두리/12px radius, 최대너비280px 및 가용 영역 제한.
- hover 약200ms 후 표시, leave/blur/드래그/팝업 오픈 시 취소한다. focus에서도 동일한 내용에 접근할 수 있게 하고 pin aria-describedby로 연결한다. 열린 핀에는 중복 preview 없음.
- 미리보기는 작업 영역 안의 fixed 컨테이너 zIndex9, pointer-events none. 텍스트 전체는 popup에서 제공한다. 완료 pin도 미리보기 가능하다.
- 미리보기 role=tooltip, id는 comment-preview-THREAD_ID로 하고 실제 표시 중인 ID만 pin.previewId/aria-describedby로 연결한다. parent는 popup용 최소320px 규칙을 재사용하지 않고 미리보기 한도를 minWidth0/maxWidth=min(280,가용 너비)로 따로 계산하여 위치를 보정한다.
- 메시지 UI: 작성자12px/700, 시각11px/#74747d, 본문12px/line-height1.5, white-space pre-wrap, overflow-wrap anywhere. 생성시각 title에 정확한 시각 제공. updatedAt이 있으면 수정됨 표시.
- splitCommentText 결과를 React 텍스트와 span으로 렌더링하여 @이름만 red 색·연한 배경으로 강조한다. dangerouslySetInnerHTML을 사용하지 않는다.
- 첫 의견의 actions는 상단 메뉴가 담당하므로 showActions=false. 본인 답글만 showActions=true이며 개별 메뉴 제공. canEditComment로 판단하고 role/admin으로 우회하지 않는다.
- now는 Workspace/Popover에서1분 주기의 값을 공유하며 개별 메시지마다 timer를 만들지 않는다.

### I04. 멘션 검색과 작성·수정 입력창

- Related Files:
  - components/comments/CommentComposer.tsx :: CommentComposer — new
  - lib/comments/mentions.ts :: query/selection/edit reconciliation — read-only
  - lib/comments/domain.ts :: normalizeCommentDraft — read-only

#### Details

**Signatures & Types**

~~~typescript
interface CommentComposerProps {
  mode: "new" | "reply" | "edit";
  draft: CommentDraft; users: CommentUser[];
  disabled: boolean; submitDisabled: boolean; autoFocus?: boolean;
  onChange(draft: CommentDraft): void;
  onSubmit(): void;
  onCancel?: () => void;
}
function CommentComposer(props: CommentComposerProps): React.ReactElement;
~~~

**Data & Schema Fields**

- controlled textarea를 사용한다. placeholder는 모든 일반 작성창에서 정확히 의견 남기기 (@이름 멘션) · Enter 등록.
- 본문은 plain text, 선택된 멘션은 ranges로 별도 관리한다. textarea 내부의 복잡한 HTML 편집기를 만들지 않고 등록된 본문/미리보기에서 멘션을 강조한다.
- textarea 기본 최소 높이56px, 긴 입력은 최대120px 안에서 내부 스크롤. 좁고 낮은 popup에서는 최소40px까지 줄여 상단/전송 조작부가 사라지지 않도록 한다.
- send는32px 버튼, Send20Regular 흰색. 유효 내용 없음/수정 변화 없음/저장 중/완료 대화 답글은 disabled gray #9ca3af. 활성은red #d7192f. disabled opacity로 빨강이 흐려지는 기존 토큰 신청 버튼 스타일을 복사하지 않는다.
- autoFocus는 popup이 처음 열릴 때만 처리하며 이후 입력/사이즈 변경마다 focus를 빼앗지 않는다. 새 의견과 open thread는 입력창, resolved thread는 제목에 포커스한다.

**Execution Flow / Logic**

1. textarea onChange에서 reconcileMentionEdits(previous,nextText) 후 onChange. onSelect/click/keyup에서도 현재 caret을 읽어 findMentionQuery 결과를 갱신한다.
2. query가 있으면 users 중 이름의 대소문자 무시 부분 일치로 검색한다. 결과 최대6명, 이름 순서를 안정화한다. 결과 없음은 선택 불가능한 안내 한 줄이다. 입력창 위쪽에 자체 목록을 띄워 화면 아래로 넘치지 않게 한다.
3. textarea role=combobox, aria-autocomplete=list, aria-expanded/controls/activedescendant, 목록 role=listbox, 항목 role=option/aria-selected를 제공한다. 자동 선택 focus는 textarea에 유지한다.
4. 항목 pointerdown에서 default를 막아 caret을 보존하고 insertMention 결과 draft+caret를 반영한다. 다음 렌더 후 setSelectionRange와 focus({preventScroll:true})로 복구한다.
5. Keyboard 우선순위:
   - event.isComposing 또는 nativeEvent.isComposing/legacy keyCode229이면 Enter 등록/멘션 선택을 하지 않는다.
   - 목록이 열렸으면 ArrowUp/Down 선택 이동, Enter 항목 확정, Escape 목록만 닫기. 이 이벤트는 popup까지 전달하지 않는다.
   - 일반 Enter는 preventDefault 후 submitDisabled=false일 때만 onSubmit. Shift+Enter는 줄바꿈.
   - 목록이 없을 때 Escape는 popup으로 전달해 초안을 보관하며 닫는다.
6. 새 의견/답글은 normalize로 유효성 판단한다. 수정에서는 canonical text와 mentions가 원문과 다를 때만 전송 활성화한다. 정상화 실패는 제출을 막고 공백-only 입력에 오류 알림을 반복하지 않는다.
7. 저장 중에는 해당 작성창의 전송/수정 버튼을 막는다. controller가 추가로 동기 잠금을 적용하므로 마우스/Enter의 연속 입력도 한 번만 저장된다. 입력 변경을 허용하더라도 제출 세대 이후 글은 성공 콜백에서 지워지지 않는다.
8. 수정 mode에서는 send의 aria-label=수정 저장과 취소 버튼을 제공한다. 취소는 controller.cancelEdit. 팝업 X와 구분하여 취소만 초안을 명시적으로 버린다.

### I05. 대화 팝업·관리 메뉴·완료·크기 조절

- Related Files:
  - components/comments/CommentPopover.tsx :: CommentPopover, ResizeHandle, 삭제 확인 상태 — new
  - components/comments/CommentActionsMenu.tsx :: CommentActionsMenu — new
  - components/comments/CommentMessage.tsx :: 답글 메뉴 연결 — new
  - components/comments/CommentsWorkspace.tsx :: 앵커/닫기/포커스 연결 — modify (이 Task에서 생성한 파일)
  - lib/comments/geometry.ts :: 경계·리사이즈 — read-only

#### Details

**Signatures & Types**

~~~typescript
interface CommentPopoverProps {
  anchor: PixelPoint; limits: PopupLimits; onClose(): void;
}
function CommentPopover(props: CommentPopoverProps): React.ReactElement | null;
interface CommentActionsMenuProps {
  label: string; disabled: boolean; deleteLabel: string;
  onEdit(): void; onDelete(): void;
}
function CommentActionsMenu(props: CommentActionsMenuProps): React.ReactElement;
~~~

**Data & Schema Fields**

- popup은 context의 view로 대상을 결정한다. 같은 번호를 제목 코멘트 N으로 표시, new는 새 코멘트. view=null이면 렌더 없음.
- popup DOM id는 production-comment-popup으로 고정하고 열린 pin의 aria-controls와 연결한다.
- popup 컨테이너: 작업 영역 내부에 position fixed, zIndex10, role=dialog, aria-modal=false, aria-labelledby. 흰 배경, border1px #e6e7eb, radius12px, shadow0 18px 48px rgba(16,17,20,.16), 0 2px 6px rgba(16,17,20,.06). display flex/flexDirection column, boxSizing border-box, overflow hidden.
- document.body로 별도 portal을 만들지 않는다. 따라서 모바일 sidebar가 mainColumn을 inert로 만들면 코멘트도 상호작용 대상에서 빠지고 backdrop20보다 위로 탈출하지 않는다.
- header 최소48px/padding12px16px/flexShrink0, body flex1/minHeight0/overflowY auto, footer flexShrink0. body와 footer 중 적어도 본문/입력이 가용 높이 안에서 스크롤되어 작은 화면에서도 버튼이 잘리지 않아야 한다.
- header 버튼 순서: 본인 root의 ⋯ → 완료/다시 열기 → X. new popup은 등록 전이므로 X만 표시한다.
- action 버튼 높이30px, icon16~20px. 좁을 때 체크 아이콘, 실제 적용된 rect.width>=420px이면 체크 아이콘과 반영 완료/다시 열기 텍스트. aria-label은 항상 전체 동작명, 상태는 aria-pressed로 표현한다.
- popup 내부 메뉴는 inline absolute 컨테이너이며 외부 portal과 전역 modal trap을 사용하지 않는다.
- resize handles는 오른쪽(e), 아래(s), 오른쪽 아래(se)에 둔다. 모서리24px/시각손잡이10px, 가장자리 hit band8px 정도. footer/send와 겹치지 않도록 하단·오른쪽 여유를 둔다.

**Execution Flow / Logic**

1. 첫 의견과 답글은 getThreadMessages 순서로 표시한다. 최초 열기는 본문 상단부터, 자신이 답글을 보낸 성공 시 그 답글 위치로 스크롤한다. resize가 대화 스크롤/입력 상태를 초기화하지 않는다.
2. open 상태의 하단 composer는 reply 키와 submitReply(threadId)를 연결한다. resolved이면 답글 전송/입력을 비활성화하고 다시 열어 답글을 작성할 수 있다는 짧은 상태 안내를 보여준다. 보관된 답글 초안은 지우지 않는다.
3. 체크 버튼은 open이면 setStatus(resolved), resolved이면 setStatus(open). 다른 작성자의 thread에도 표시하고 조작 가능하다. DB 성공 후 핀 색/버튼 라벨을 바꾼다. popup은 유지한다.
4. ⋯는 본인 root에만 표시하고 첫 의견 수정/대화 전체 삭제를 제공한다. 본인 reply는 각 행 메뉴로 해당 답글 수정/삭제. 타인에게 관리자라는 이유로 메뉴를 보여주지 않는다.
5. CommentActionsMenu: 트리거 MoreHorizontal20Regular, role=menu/items, 수정/삭제 두 항목. ArrowUp/Down/Home/End, Enter/Space 선택, Escape 닫기 후 트리거 복귀. 메뉴 안 Esc는 popup을 닫지 않는다. 빈곳 클릭은 메뉴를 닫고 popup 내부 클릭이면 대화는 유지한다.
6. 수정 선택은 controller.startEdit(messageId). 선택된 메시지 본문 자리에 edit composer와 저장/취소를 표시하고 작성자/생성 시각은 유지한다. 해당 edit draft를 키로 사용한다. 다른 새 reply 입력은 edit 중 잠시 비활성화하여 동시에 저장 대상을 혼동하지 않게 한다.
7. 삭제 선택은 popup 내부 확인 영역(role=alertdialog, aria-modal=false)을 표시한다. thread는 이 핀과 첫 의견 및 답글 N개를 삭제한다는 범위를 명시하고 취소/삭제 제공. reply는 해당 답글만 삭제한다고 안내한다. 기본 포커스는 취소.
8. 확인 중 다른 write controls는 막고 X는 닫기로 동작한다. 실제 삭제 메서드는 명시적 삭제 버튼에서만 호출한다. 실패 시 확인 화면과 데이터 유지, 성공 시 thread는 popup 닫기/생성 버튼 포커스, reply는 목록에서 제거하고 적절한 인접 메시지나 입력창으로 포커스.
9. resize:
   - pointerdown 시 현재 PopupRect/좌표를 캡처하고 setPointerCapture, touchAction none을 해당 손잡이에만 적용한다.
   - 이동은 I01 함수로 제한된 rect를 그리며 controller.setPopupSize로 크기 상태를 갱신한다. 저장소 호출 없음.
   - 현재 gesture의 시작 rect를 고정해 좌우 위치 계산이 반복되지 않게 한다. resize 종료 후 같은 anchor에서는 수동 위치 보정을 유지하고 다음 anchor/viewport 변화 때 재배치한다.
   - pointercancel/Esc는 시작 크기로 되돌린다. resize 중 Esc는 popup 닫기까지 중복 처리하지 않는다.
   - 손잡이는 키보드 포커스를 받고 Arrow로16px, Shift+Arrow로32px 조절할 수 있어야 한다. e/s는 각 축만, se는 두 축 방향키를 처리한다. aria-label/설명으로 크기 조절을 알린다.
10. 바깥 클릭/닫기:
    - document의 pointerdown을 처리하되 data-comment-popup, 핀, 생성 버튼은 바깥 클릭에서 제외한다. 핀 전환과 생성 버튼은 자체 handler가 담당한다.
    - popup 외부의 빈 작업 공간 클릭은 onClose. popup 작성창·메뉴·resize handle 조작이 새 핀 생성으로 전파되지 않게 한다.
    - Esc는 event.defaultPrevented/isComposing을 확인하고 가장 안쪽 메뉴/멘션/resize가 처리한 경우 중복 처리하지 않는다.
    - X/Esc 닫기는 controller.closePopup 후 정식/임시 pin 버튼으로 포커스 복귀. 빈 임시 핀이 정리되면 생성 버튼. 바깥 클릭은 사용자가 클릭한 버튼의 포커스를 빼앗지 않는다.
    - 경로 이동·sidebar 열기에서 controller.suspendUi가 호출되면 별도 옛 pin 포커스 복귀를 수행하지 않는다.
11. 오류는 popup 및 작업 영역의 role=alert 안내로 표시한다. 실패한 전송/수정은 textarea를 비우지 않고 retry 가능. load 자체의 오류이면 새 핀/저장을 막고 다시 불러오기만 제공한다.
12. 수정 revision 충돌은 초안을 보관한 채 최신 내용 불러오기(controller.load)를 제공한다. 새 message.revision과 edit.baseRevision이 다르면 현재 저장 본문을 편집창 위에 보여주고 최신 내용 기준으로 수정 버튼을 제공한다. 이 버튼을 명시적으로 누를 때만 rebaseEdit로 baseRevision을 맞춘다. 그 전에는 수정 전송을 막으며 자동으로 타인의 최신 변경을 덮지 않는다. 취소는 기존 cancelEdit 동작이다.

### I06. 실제 브라우저와 회귀 검증

- Related Files:
  - tests/lib/comments/geometry.test.ts :: geometry — new
  - tests/lib/comments/format.test.ts :: dates — new
  - .memory/phases/2026-10-29-production-pin-comments/P01-pin-comments/T04-pin-comment-ui.md :: 실행 결과/스크린샷 경로/제한 기록 — modify
  - .memory/validation/2026-10-29-production-pin-comments/ :: 필요한 실제 캡처 산출물 — 실행 시 생성 가능

#### Details

**Automated**

- geometry: 1440×900/사이드바220 및54, desktop max720×720, popup420px 라벨 경계, 화면 오른쪽/아래 anchor의 뒤집기/clamp, mobile390/320폭에서 min이max보다 커지지 않음, 낮은 높이·visualViewport offset·면적0.
- 저장 비율→client→비율 round trip, sidebar 크기 변경 후 상대 좌표 보존, top/left 음수 scroll, 드래그0~1 경계, scale가 좌표에 들어가지 않음.
- resize e/s/se 축·최소/최대·취소 반환, 순수 함수 입력 불변.
- format: 고정 now 기준 방금/분/시간/날짜, 미래 값/invalid, Asia/Seoul 정확 시각.
- 전체 기존 tests를 최종 실행한다. 헤더나 버튼 CSS를 그대로 복사하는 무의미한 테스트를 추가하지 않는다.

**Browser matrix — 실제 구현 후 수행하고 증거를 기록한다**

| 화면 | 확인 |
| --- | --- |
| 1440×900 | 좌측220/54 접기 전후 pin 비율, seed 미리보기/대화, 모든 CRUD와 실제 IndexedDB 복원 |
| 1024×500 | 낮은 화면에서 popup 최대 높이와 header/footer/입력 접근, 본문 스크롤 |
| 390×844 | 모바일 메뉴 열기/닫기/포커스, popup 가용 너비, 터치 drag/resize, 멘션 목록 |
| 320×568 | 최소폭 보정·버튼 잘림 없음·긴 본문·키보드 사용 |

**검증 시나리오**

1. 처음 제작 진입은 예시2핀, 첫 의견·답글·멘션과 다른 작성자 메뉴 차이 확인. 새 핀 입력 후 Enter/버튼 각각 등록하여 중복이 없는지 확인.
2. 공백-only는 gray/white send, 유효 입력은 red/white. 수정창은 초기 gray, 변화 후red. 한글 조합 Enter는 조합 확정만 하고 등록하지 않음. Shift+Enter 줄바꿈.
3. @ 검색·마우스 선택·Arrow/Enter 선택·Esc 닫기·결과 없음·멘션 앞/내부 편집·emoji 앞 입력 후 저장과 복원.
4. hover 작성자/시간/본문 순서, click popup, 다른 pin 전환, outside/X/Esc/경로 이동과 각 초안 복원, 새로고침하면 미등록 초안 소멸.
5. 핀 drag 후 클릭이 오작동하지 않고 마지막 위치만 DB 저장. 창 resize/sidebar 접기/스크롤에서 상대 위치 유지. 외부 scroll로 pin이 안 보일 때 popup 닫기와 초안 보관. popup 본문 scroll은 popup을 닫지 않음.
6. 다른 작성자의 pin 이동·완료·재개 가능, 타인 내용 메뉴 없음. 완료 pin gray·hover/click 가능, reply 막힘, 재개 후 red·reply 가능.
7. 본인 root/reply 수정, own thread 삭제 시 답글 함께 삭제, 취소 시 유지. 오류나 busy 중 이중 제출 없음.
8. popup 손잡이와 키보드 resize, desktop 너비50%/높이80%,420px 전후 체크 라벨 전환, 작은 화면 예외. 입력/scroll 상태 유지.
9. 새로고침 및 같은 브라우저 창 재진입 후 실제 등록 값·좌표·완료·수정·삭제 복원. 최초 예시 수가 증가하지 않고 삭제한 본인 예시가 다시 나타나지 않음. 전체0개 후 seed 재생성 방지는 T02 저장소 테스트도 함께 증거로 남김.
10. 안전한 격리 테스트 데이터/테스트 context에서 DB 오류를 재현해 입력 보존과 안내 확인. 실제 사용자 DB를 무단 clear하거나 인증 우회용 앱 경로를 만들지 않는다.
11. 모든 메뉴에서 헤더가 없고 모바일 sidebar/프로필/사용량·토큰 신청 모달이 그대로 동작. 토큰 닫기 시 workspace-sidebar-trigger/main 등 유효 대상에 포커스. 새 DB가 프로필의 고정 개수/알림을 바꾸지 않음.
12. 콘솔·hydration 오류와 의도하지 않은 외부 요청이 없는지 확인. 실제 로그인이나 외부 서비스까지 확인하지 못한 경우 검증 범위를 구분하여 기록한다.

## Acceptance Criteria

- [ ] 제작 화면 전체에 생성 버튼과 위치 기반 핀을 제공하고 다른 메뉴에는 노출하지 않는다.
- [ ] 원본 핀의 색·모양·번호·선택/임시/완료 상태를 재현한다.
- [ ] 팝업·미리보기·답글·멘션·수정/삭제·완료/재개가 controller/DB와 연결된다.
- [ ] 상대 위치·drag/click 구분·키보드 입력·팝업 resize·420px 라벨·최대 크기·모바일 예외를 검증한다.
- [ ] 등록 데이터는 실제 브라우저에서 복원되며 미등록 초안의 수명이 결정과 일치한다.
- [ ] 모바일 탐색·기존 프로필/토큰 모달 포커스에 회귀가 없다.
- [ ] 최종 자동 검증 및 브라우저 증거와 한계를 이 Task Progress 아래에 기록한다.

## Validation

- npm.cmd test -- tests/lib/comments/geometry.test.ts tests/lib/comments/format.test.ts — 좌표/시각 테스트 통과.
- npm.cmd run typecheck — 전체 타입 통과.
- npm.cmd run lint — 전체 lint 통과.
- npm.cmd test — 전체 기존 및 신규 테스트 통과.
- npm.cmd run build — 실제 Next 프로덕션 빌드 통과.
- npm.cmd run dev -- --port 3100 — 필요 시에만 검증 서버. 현재 인증 설정을 유지하고 .env를 임의 수정하지 않는다.
- 실제 브라우저 위 matrix 수행. 기존 실행 서버가 현재 코드를 제공하면 재사용하고, 새 백그라운드 Windows 프로세스를 시작할 경우 숨김 창으로 실행한다.
- git diff --check — 공백 오류 없음.
- 최종 테스트 후 CSS/로직을 수정하면 그 수정에 영향을 받는 체크만 다시 실행하고 결과를 갱신한다.

## Commit Message

~~~text
feat(comments): 제작 핀과 코멘트 팝업 완성

Plan: 2026-10-29-production-pin-comments
Phase: P01-pin-comments
Task: T04-pin-comment-ui

- 핀 미리보기와 대화 및 멘션 입력 연결
- 이동과 크기 조절 및 완료와 수정 삭제 구현
- 브라우저 저장 복원과 반응형 탐색 회귀 검증
~~~

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
