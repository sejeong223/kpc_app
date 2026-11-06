# Task: T01 슬라이드에 연결된 핀 저장·생성·표시

## Status: done

## Goal

제작 화면의 핀을 생성한 슬라이드에 저장하고 실제 슬라이드 면에만 표시한다. 핀 생성 버튼을 각 슬라이드 아래 왼쪽에 배치하고, 다른 영역의 십자 커서 및 이전 의견 버튼을 제거한다. 기존 연결 없는 의견은 자료를 보존하면서 화면에서 숨긴다.

## Decision Summary

- 프로젝트/회차당 기존 provider/controller 하나를 유지하고, thread·새 핀 초안에 `slideId`를 추가한다. UI 표시 필터와 전체 저장 상태를 분리해 기존 의견을 잃지 않는다.
- 기본·HTML 예시·Template의 실제 슬라이드 면을 핀 표면으로 사용한다. 팝업은 별도 portal에 표시한다. 중앙 카드·편집 높이 변경은 다음 T02다.

## Implementation

### I01. 데이터 모델과 이전 저장 형식 호환

- Related Files:
  - `config/comments.ts` :: `CommentThread`, `CommentCommand` — 공용 의견의 연결 정보; modify
  - `lib/comments/domain.ts` :: `snapshotSchema`, `CommentCommandSchema`, `applyCommentCommand` — 검증 및 생성 결과의 필드 보존; modify
  - `types/workspace-production.ts` :: `CanvasCommentThread` — 제작 저장 모델; modify
  - `lib/workspace/production/canvas-schemas.ts` :: `thread`, `CanvasCommandSchema`, `CanvasCommentStateSchema`, `canvasReferenceErrors` — 이전 자료 해석·생성 요청 검증; modify
  - `lib/workspace/production/state-compatibility.ts` :: `StoredWorkspaceStateSchema`, `upgradeWorkspaceState` — v1→v2 경로 확인; read-only
  - `lib/workspace/production/schemas.ts` :: `RoundBodySchema`, `WorkspaceStateSchema`, `WorkspaceOperationSchema`에 해당하는 `canvas-command` 분기 — 내포된 schema 재사용 확인; read-only
  - `services/workspace/workspace-records.ts` :: `readWorkspaceBundle` 및 `services/workspace/IndexedDbWorkspaceRepository.ts` :: `load`, `execute` — 저장 경계 확인; read-only

#### Details

- **Signatures & Types** — 아래는 청사진의 계약이며 이 계획 단계에서 소스에 작성하지 않는다.

  ```typescript
  // config/comments.ts: 기존 필드에 추가. legacy 의견의 입력 형태를 유지한다.
  interface CommentThread extends CommentScope, CommentPoint {
    // 기존 필드 유지
    slideId?: string | null;
  }
  // CommentCommand의 create-thread 분기에만 추가:
  // slideId?: string | null

  // types/workspace-production.ts
  interface CanvasCommentThread
    extends Omit<CommentThread, keyof CommentScope | "slideId"> {
    slideId: string | null;
    carriedFrom: { round: number; threadId: string } | null;
  }
  ```

- **Data & Schema Fields**:
  - 공용 `CommentThread.slideId`: 선택 필드, `string | null`. 예전 별도 의견 저장소의 자료도 읽으므로 누락 허용. 제공된 string은 빈 문자열·공백·400자 초과를 거부한다.
  - 공용 `create-thread.slideId`: 같은 선택 필드. 범용 의견 schema는 legacy를 읽을 수 있어야 하지만 제작용 `CanvasCommandSchema`에서는 새 생성에 유효한 string을 필수로 검사한다.
  - 제작 `CanvasCommentThread.slideId`: 정규화 후 반드시 `string | null`. `thread` schema에 기존 id 규칙의 `id.nullable().default(null)`을 사용한다. 누락만 null로 정규화하고 잘못된 타입·빈 ID는 오류로 처리한다.
  - 기존 thread 필드 보존: `id`, `rootMessageId`, `authorId`: string; `number`, `revision`: 양의 안전한 정수; `status`: open/resolved; `xRatio`, `yRatio`: 유한한 0~1; `createdAt`, `updatedAt`: ISO 날짜 string; `resolvedAt`, `resolvedBy`: string|null; `isSeed`: boolean; `carriedFrom`: 위 타입.
  - `CanvasCommentState`: `nextNumber: number`, `threads: CanvasCommentThread[]`, `messages: CanvasCommentMessage[]` 유지. 메시지의 threadId 연결·본문·멘션·revision과 최대 개수 제한을 변경하지 않는다.
  - `slideId`는 동일 프로젝트의 해당 body에 있는 `ProposalSlide.id`를 참조한다. 기존 자료 보존을 위해 읽기 schema에서는 삭제된 슬라이드의 ID도 허용하되 쓰기 시 존재를 검사한다.
  - `schemaVersion: 2`, IndexedDB 버전/저장소, `COMMENT_DB_VERSION`, 기존 namespace `JSON.stringify([namespace, projectId, round])`는 유지한다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 공용 snapshot의 strict thread schema와 create-thread schema 양쪽에 새 필드를 추가한다. 한쪽만 수정하면 검증에서 필드가 거부되거나 사라진다.
  2. Core Processing: `applyCommentCommand`의 새 thread 생성에 전달받은 slideId를 보존한다. 이후 reply/edit/move/status는 기존 thread 객체를 수정하므로 연결 ID를 변경하지 않는다. 제작 schema의 default는 현재 body·모든 snapshots.body·undo.previousBody에서 동일하게 적용된다.
  3. Error & Exception Handling: 손상된 v2를 빈 자료로 치환하지 않는다. 현재 v1→v2 변환도 그대로 유지한다. 잘못된 요청은 `CanvasCommandSchema.safeParse` 실패로 `WorkspaceError("VALIDATION", ...)`가 된다.
  4. State Transition & Return: 이전 canvas thread는 값과 메시지를 모두 유지한 채 `slideId: null`로 읽힌다. 새 생성 명령의 누락/null/잘못된 ID는 거부한다. 기존 번호와 nextNumber는 재설정하지 않는다.

### I02. 전체 자료 보존, 생성 대상 검증 및 표시 가능 대상

- Related Files:
  - `lib/workspace/production/canvas-comments.ts` :: `canvasCapabilities`, `projectCanvasSnapshot`, `applyCanvasCommand`, `carryCanvasComments`, 신규 `visibleCanvasThreads` — 전체 저장 자료와 화면 대상 구분; modify
  - `components/comments/comments-context.ts` :: `inactiveComments` — 새 capability 기본값; modify
  - `hooks/workspace/use-canvas-comments.ts` :: `useCanvasComments` — 전체 snapshot 전달·확정 receipt 반환 유지; read-only
  - `lib/comments/workspace-repository.ts` :: `CanvasCommentBinding`, `WorkspaceCommentRepository` — 현재 project/round/snapshot 범위와 revision 검사 유지; read-only
  - `lib/workspace/production/domain.ts` :: `canvas-command`, `start-round`, `remove-slide`, `batch-slides`, `undo` — 기존 트랜잭션/이월/복원 호출 유지; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export function visibleCanvasThreads(body: RoundBody): CanvasCommentThread[];

  export interface CanvasCommentCapabilities {
    // 추가: 현재 조회 body에 존재하며 핀을 표시할 수 있는 모든 slide ID.
    // 읽기 전용 보관본도 해당 보관본의 slide ID를 반환한다.
    slideIds: string[];
    readOnly: boolean;
    canCreate: boolean;
    replyThreadIds: string[];
    moveThreadIds: string[];
    statusThreadIds: string[];
    deleteThreadIds: string[];
    editableMessageIds: string[];
    deletableMessageIds: string[];
  }
  export function canvasCapabilities(
    state: ProjectWorkspaceState, context: WorkspaceContext, readOnly: boolean
  ): CanvasCommentCapabilities;
  export function projectCanvasSnapshot(
    state: ProjectWorkspaceState, context: WorkspaceContext, createdAt: string
  ): CommentSnapshot;
  export function applyCanvasCommand(
    state: ProjectWorkspaceState, command: CommentCommand,
    context: WorkspaceContext, createdAt: string, reservedIds: Set<string>
  ): { canvas: CanvasCommentState; createdIds: string[] };
  export function carryCanvasComments(
    source: CanvasCommentState, round: number, newId: () => string
  ): CanvasCommentState;
  ```

- **Data & Schema Fields**:
  - `visibleCanvasThreads`: `slideId !== null`이고 `body.slides`에 같은 ID가 있는 thread만 반환. 입력을 수정하지 않는다. 정렬·번호를 바꾸지 않는다.
  - `slideIds`는 상태의 slides에서 얻는다. `inactiveComments.capabilities.slideIds`는 `[]`다. 프로젝트 접근 불가 상태에서 ID를 노출하지 않는다.
  - 기존 권한 규칙 유지: writing+프로젝트 참여자만 생성/답글/이동, 처리 상태는 작성자/PM/슈퍼관리자, 메시지 수정·삭제는 작성자. 슬라이드 본문 편집 권한과 의견 권한을 새로 동일시하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 기존 writing·프로젝트 접근·revision·회차 검증을 유지한다. create-thread는 요청 slideId가 현재 body.slides에 있는지 검사한다. 없는 ID는 `NOT_FOUND`. 다른 프로젝트 ID도 현재 body에 없으므로 거부한다.
  2. Core Processing: 비생성 명령은 threadId 또는 messageId→threadId로 원래 thread를 찾는다. 연결 없음/삭제된 slide/없는 thread에는 `NOT_FOUND`를 반환한다. 각 operation의 기존 소유권·상태·멘션 검증은 그대로 적용한다.
  3. 전체 snapshot 보존: `projectCanvasSnapshot`은 **연결 없는 thread와 삭제된 slide의 thread도 포함한 전체 자료**를 반환한다. `applyCanvasCommand`도 이 전체 snapshot에 명령을 적용하고 모든 thread/message를 다시 저장 모델로 변환한다. thread 변환 시 `slideId: t.slideId ?? null`, 기존 carriedFrom을 보존한다. UI 조회 결과를 저장 자료로 사용하지 않는다.
  4. `canvasCapabilities`의 thread·message ID 배열은 표시 가능한 thread와 그 자식 메시지에 대해서만 산출한다. `canCreate` 자체는 기존 프로젝트 권한을 나타내고, 버튼은 여기에 slideIds와 실제 미리보기 준비 상태를 함께 검사한다.
  5. Error & Exception Handling: 기존 `CommentError`→`WorkspaceError` 매핑을 유지한다. 실패 시 기존 데이터와 초안 유지. hook은 mutate 이후 재조회가 아닌 확정 receipt에서 snapshot을 반환하는 현재 방식을 유지해 중복 제출을 막는다.
  6. State Transition & Return: `carryCanvasComments`는 기존 규칙대로 open 의견을 다음 회차로 이월하되 slideId와 null을 보존한다. 과거 snapshot도 유지한다. 연결 없는 의견을 재배정·삭제·완료 처리하지 않는다.

### I03. 단일 controller 안에서 생성 대상을 고정

- Related Files:
  - `lib/comments/controller.ts` :: `CommentControllerState`, `createCommentControllerState`, `CommentController` — 생성 대상과 새 핀의 슬라이드 연결; modify

#### Details

- **Signatures & Types**:

  ```typescript
  interface CommentControllerState {
    // 기존 state 필드 유지
    pinModeSlideId: string | null; // 생성 모드 대상
    pendingSlideId: string | null; // 아직 등록하지 않은 핀/초안의 대상
  }
  // CommentController public methods
  togglePinMode(slideId: string): void;
  placePin(point: CommentPoint, slideId: string): void;
  suspendSlide(slideId: string): void;
  // movePendingPin/openThread/closePopup/discardDrafts/submitNew 등 시그니처 유지
  ```

- **Data & Schema Fields**:
  - 새 두 필드는 기본값 null이며 비영속 UI 상태다. 기존 `pinMode: boolean`, `pendingPoint`, `view`, `drafts.new`, `reply:<id>`, `edit:<id>` 구조는 유지한다.
  - `pendingPoint`와 `pendingSlideId`는 함께 생성·유지·정리한다. thread view의 대상은 snapshot의 thread.slideId에서 찾는다.
  - 새 의견의 대상은 전역 선택값이 아니라 핀 위치를 찍을 당시의 pendingSlideId다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: ready·busy·유효 ID·0~1 좌표 검증을 유지한다. 새 대상에 작성 중인 `drafts.new`를 덮어쓰지 않는다. UI의 전환 guard를 우회해 다른 slide로 생성 대상을 바꾸려 하면 `CommentError("invalid", "작성 중인 의견을 먼저 확인해 주세요.")`로 기존 초안을 유지한다.
  2. Core Processing: 아래 전이표대로 처리한다. 같은 대상의 작성 중 핀을 다시 열 때는 기존 text/point를 보존한다. 다른 대상의 빈 pendingPoint는 새 생성 시작 시 정리한다.

  | 동작 | 상태 전이 |
  | :--- | :--- |
  | A 버튼 활성화 | pinMode=true, pinModeSlideId=A, view=null. 이미 A에 작성 중인 새 초안이 있으면 mode 대신 그 new view를 다시 연다. |
  | A 버튼으로 모드 해제 | pinMode=false, pinModeSlideId=null. |
  | A 생성 모드 중 B 버튼 | guard 통과 후 대상만 B로 전환. 두 모드가 동시에 켜지지 않는다. |
  | A 면 클릭/키보드 생성 | pendingPoint와 pendingSlideId=A 설정, view=new, pinMode=false, pinModeSlideId=null. |
  | 기존 pending 핀 재선택 | 동일 pendingSlideId의 위치로만 new view 재개. 다른 slide ID로 변경 금지. |
  | 기존 thread 열기/수정 | view=해당 thread, 생성 모드와 mode ID 해제. 저장 중인 새 초안이 있으면 원래 pendingSlideId와 함께 보존. |
  | 팝업 닫기/Esc | 생성 모드 해제. 새 초안에 글이 있으면 point/slideId/draft 유지, 없으면 함께 정리. |
  | 전체 초안 폐기 | drafts/view/pendingPoint/pendingSlideId/pinMode/pinModeSlideId/editingMessageId 모두 정리. |
  | submitNew 성공 | 명령에 pendingSlideId 포함. 제출 후 수정된 초안이 없으면 pendingPoint/slideId 제거, 새 thread view로 전환. |
  | submitNew 실패 | 대상·위치·본문 그대로 유지. |

  3. `placePin`은 활성 mode ID가 일치할 때 새 위치를 받는다. 기존 pending 핀을 다시 여는 경우에는 pendingSlideId 일치를 허용한다. 생성 모드도 기존 핀도 없는 외부 호출은 거부한다.
  4. `suspendSlide(id)`는 해당 slide가 활성 생성 대상이거나 현재 view의 소유 slide일 때만 `closePopup` 동작을 한다. 다른 slide의 모드/팝업을 닫지 않는다. 단순 언마운트나 스크롤 숨김이 초안을 삭제하지 않게 한다.
  5. Error & Exception Handling: `ui()`/`mutate()`의 error, epoch, busy, 초안 revision 보호를 유지한다. 생성 중 B를 선택해도 A의 저장 응답이 B 핀으로 표시되지 않도록 제출 command의 ID를 사용한다.
  6. State Transition & Return: controller는 여전히 프로젝트/회차 단위로 하나만 존재한다. snapshot 전체 자료와 existing prune 규칙을 유지해 UI에서 숨긴 의견 때문에 초안이 사라지지 않게 한다.

### I04. 기존 초안 보호와 버튼 연결

- Related Files:
  - `components/comments/comments-context.ts` :: `CommentsContextValue`, `inactiveComments` — 생성 대상 전환 API; modify
  - `components/comments/ProjectCanvasCommentsProvider.tsx` :: `ScopedComments` — 기존 guard 재사용; modify
  - `components/comments/CommentCreateButton.tsx` :: `CommentCreateButton` — 대상·표면별 버튼; modify
  - `hooks/workspace/use-workspace-draft-guard.ts` :: `useWorkspaceDraftGuard` — 현재 전환 확인·busy 차단 재사용; read-only
  - `components/comments/CommentsProvider.tsx` :: `CommentsProvider` — 기존 route/provider 연결 유지; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  interface CommentsContextValue {
    // 기존 값 유지
    requestPinMode(slideId: string): void;
  }
  interface CommentCreateButtonProps {
    slideId: string;
    surfaceId: string; // 실제 슬라이드 면 DOM의 useId 기반 id
    buttonId: string;
    disabled?: boolean;
  }
  function CommentCreateButton(props: CommentCreateButtonProps): React.ReactElement | null;
  ```

- **Data & Schema Fields**: 비활성 context의 requestPinMode는 noop. ScopedComments의 정상 context에는 `{ ...value, requestPinMode }`로 메서드를 제공하고, 실패/roundConflict context에서는 비활성 함수를 사용한다. 기존 `roundConflict`, identity namespace, snapshot key는 유지한다. useCanvasComments는 저장 bridge를 반환하는 기존 계약 그대로 둔다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 실제 현재 controller state의 ready/busy 및 context의 canCreate/slideIds를 검사한다. render 당시의 오래된 캡처 값으로 바뀐 프로젝트·회차에 생성하지 않는다.
  2. Core Processing: 다른 slide에 새 의견 초안이 있고 본문이 비어 있지 않다면 기존 `guard.request(() => controller.togglePinMode(slideId))`로 전환한다. `FileDiscardDialog`의 계속 작성은 원래 대상 유지, 버리기는 기존 onDiscard 후 새 대상 활성화다. 같은 대상 재개나 새 초안 없는 전환에는 확인창을 띄우지 않는다.
  3. 버튼의 active/aria-pressed는 `pinMode && pinModeSlideId === slideId`일 때만 true. `aria-controls`는 surfaceId. `data-comment-create`에 slideId를 넣고 buttonId로 같은 슬라이드 버튼에 돌아올 수 있게 한다.
  4. 생성 모드 활성화 후 포커스는 해당 surfaceId에만 이동한다. guard로 비동기 확인을 거친 경우도 처리하도록 실제 mode 상태를 관찰하는 표면 effect에서 포커스를 옮긴다. 전역 첫 `[data-comment-surface]` 검색을 제거한다.
  5. Error & Exception Handling: 취소·busy·권한 상실은 상태를 바꾸지 않는다. 다중 선택 상태에서 핀 버튼을 누르는 것은 본문 선택 상태를 변경하지 않는다.
  6. State Transition & Return: 같은 controller/guard가 여러 슬라이드 표면을 조율한다. 표면마다 provider/controller를 생성하지 않는다.

### I05. 실제 슬라이드 전용 표면과 팝업

- Related Files:
  - `components/comments/SlideCommentSurface.tsx` :: `SlideCommentSurface` — 슬라이드 면의 위치·이벤트·핀·버튼; new
  - `components/comments/CommentsWorkspace.tsx` :: 기존 `Measurement`, `PinGesture`, effect 및 pin rendering — 이 파일의 로직을 새 표면으로 이동; modify
  - `components/comments/CommentPin.tsx` :: `CommentPinProps`, aria-describedby — 여러 표면의 도움말 ID; modify
  - `components/comments/CommentPopover.tsx` :: `Props`, `deleteConfirmed` — 동일 표면으로 포커스 복귀; modify
  - `lib/comments/geometry.ts` :: `clientPointToRatio`, `ratioToClientPoint`, `keepPinInsideSurface`, `getPopupLimits`, `placeCommentPopup` — 현재 수학 로직 재사용; read-only
  - `components/providers/DadamThemeScope.tsx` 및 `components/comments/CommentPreview.tsx` — portal 테마·호버 UI 재사용; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  interface SlideCommentSurfaceProps {
    slideId: string;
    enabled: boolean; // 실제 전체 크기 미리보기가 준비되었을 때만 true
    children: React.ReactNode; // 실제 슬라이드 한 면만 전달, 안내·로딩 제외
  }
  function SlideCommentSurface(props: SlideCommentSurfaceProps): React.ReactElement;
  interface Measurement {
    surface: CommentBounds;  // 실제 면, 좌표 변환용
    viewport: CommentBounds; // 팝업 배치용
    visible: CommentBounds | null; // 중앙 scroller와 viewport 및 면의 교집합
  }
  // 기존 PinGesture의 id/pointerId/origin/offset/point/moved/element를 유지한다.
  // CommentPinProps에 helpId?: string 추가, 기본 comment-pin-help fallback 유지.
  // CommentPopover Props에 onThreadDeleted(): void 추가.
  ```

- **Data & Schema Fields**:
  - 표면 DOM은 `position: relative`, padding/border/background 없음, width 100%, min-width 0, overflow visible. 내부 children의 실제 면 높이가 표면 높이가 되어야 한다.
  - 표면 밖 형제 요소로 버튼 행을 렌더한다. 버튼 행이 좌표용 bounding rect 높이에 포함되지 않도록 한다. 버튼 행은 flex 왼쪽 정렬, 현재 control-gap 사용.
  - `data-comment-surface={slideId}`, `useId()`로 surfaceId/buttonId/helpId 생성. 영속 slide ID를 CSS selector 문자열에 직접 삽입하지 않는다.
  - 표시 핀: `snapshot.threads.filter(t => t.slideId === slideId)`. pending 핀은 pendingSlideId 일치 시만 표시한다. 실제 표시에는 capabilities.slideIds와 enabled/가시성 검사도 적용한다.
  - 선택 view가 new이면 pendingSlideId, thread이면 thread.slideId가 이 표면과 일치할 때만 팝업을 표시한다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: ready·busy·canCreate·slideIds 포함·enabled·양수 실제 면 크기·해당 mode ID 일치를 모두 확인한다. 면의 blank space, 텍스트, 이미지 클릭은 허용하고 `[data-comment-pin]`, 버튼, 링크, 입력·contenteditable·separator·popup의 이벤트는 제외한다.
  2. 생성 클릭은 client 좌표가 면의 left/right/top/bottom 안에 있는지 먼저 검사한다. `clientPointToRatio`는 밖의 좌표도 0~1로 clamp하므로 이것만 호출하면 면 밖 클릭이 가장자리 핀을 만든다. 면 밖은 아무 처리도 하지 않는다. 키보드 Enter/Space는 이벤트 target이 표면 자체이고 해당 mode일 때만 (0.5, 0.5)를 생성한다.
  3. `cursor: crosshair`와 2px dashed outline, offset 3px는 활성 대상 표면에만 적용한다. 색은 현재 앱 토큰을 사용한다. 핀 버튼 자체의 grab/pointer 및 팝업 입력 커서는 유지한다.
  4. 기존 5px drag 임계값, pointer capture, 클릭 억제, pointercancel/Esc 취소, Alt+방향키 0.01/Shift 0.05 이동을 보존한다. drag는 clientPointToRatio로 **같은 면**의 경계 안에 clamp하며 다른 slide로 옮기지 않는다. gesture 종료 시 생성 대상/권한/ready 상태가 여전히 같은지 재검사한다.
  5. 핀의 left/top은 keepPinInsideSurface(ratioToClientPoint(..., surface))에서 surface.left/top을 뺀 값이다. 페이지 전체 rect나 안내 문구 높이·HTML outer frame의 양옆 여백을 사용하지 않는다.
  6. ResizeObserver로 면과 가장 가까운 `[data-production-scroll]`을 관찰한다. resize, capture scroll, visualViewport resize/scroll을 기존 RAF 방식으로 처리한다. 미세한 레이아웃 변경을 영속 좌표 저장으로 처리하지 않는다.
  7. 팝업 한계는 `getPopupLimits(viewport, viewport)`로 계산한다. 실제 슬라이드 rect를 두 번째 인자로 주면 작은 화면에서 의견 입력칸이 슬라이드 크기에 갇힌다. hover/popover는 `createPortal(<DadamThemeScope>...</DadamThemeScope>, document.body)`로 렌더해 중앙 overflow 및 HTML `container-type`의 고정 위치 기준에 갇히지 않게 한다. SSR 중 document 접근 금지, mount 이후에만 portal 사용.
  8. 면과 viewport와 중앙 scroller 교집합에 핀 앵커가 없으면 해당 표면의 팝업/생성 모드를 닫는다. CSS로 숨겨진 모바일 pane, 0 크기 면, 표면 unmount에서도 suspendSlide를 호출한다. 다른 표면의 팝업을 닫는 effect를 만들지 않는다. dirty 초안은 유지한다.
  9. document outside-click/Esc는 이 표면이 현재 view 또는 mode를 소유할 때만 처리한다. 기존 popup/pin/create 및 modal·IME 예외를 유지한다. 이벤트를 처리한 표면만 preventDefault하여 여러 effect가 연쇄 처리하지 않게 한다.
  10. 팝업 닫기 후 해당 pin 또는 buttonId로 focus 복귀. thread 삭제 후에는 CommentPopover의 기존 전역 `[data-comment-create]` 검색 대신 `onThreadDeleted`를 호출해 같은 표면 버튼에 focus한다. helpId는 CommentPin에 전달한다. 팝업은 전역 controller의 view 하나만 렌더하므로 현재 popup DOM ID를 유지할 수 있다.
  11. Error & Exception Handling: 사용자 입력·저장 오류는 기존 CommentPopover/전역 오류 안내를 유지한다. drag/observer/listener/timer/portal cleanup을 빠짐없이 수행한다. 좌표 측정 실패 시 생성·팝업을 중단하되 저장 자료는 수정하지 않는다.
  12. State Transition & Return: 기본/HTML/Template에 동일 표면을 재사용하고 thumbnail 또는 enabled=false에서는 핀·버튼·생성 이벤트 없이 children만 렌더한다.

### I06. 제작 화면에 표면 연결 및 전체 표면 제거

- Related Files:
  - `components/workspace/production/BasicSlidePreview.tsx` :: `BasicSlidePreview` — 실제 `.frame`만 감싸기; modify
  - `components/workspace/production/HtmlDemoSlidePreview.tsx` :: `HtmlDemoSlidePreview` — `.frame` 안의 실제 `.slide`만 감싸기; modify
  - `components/workspace/production/ProductionPreview.tsx` :: `ProductionPreview` — 성공한 Template 면만 감싸기; modify
  - `components/workspace/production/ProductionWorkspace.tsx` :: `ActiveSlide`, `center`, 삭제 확인 안내 — 중복 렌더·오해를 부르는 안내 제거; modify
  - `components/workspace/production/ProductionPanels.tsx` :: 중앙 section — 스크롤 경계 marker; modify
  - `components/comments/CommentsWorkspace.tsx` :: `CommentsWorkspace` — 헤더·전체 상태 안내만 담당; modify
  - `components/admin/templates/workbench/TemplateSlidePreview.tsx`, `components/workspace/production/HtmlDemoSlidePreview.module.css`, `app/(authenticated)/workspace/[screen]/page.tsx` — 기존 구조 확인; read-only
  - `components/workspace/production/comments/LegacyCommentsArchive.tsx` — 진입점만 제거하고 자료 읽기 코드는 보존; read-only

#### Details

- **Signatures & Types**: `ActiveSlide`의 기존 props에 `showPreview: boolean` 추가. 호출부에서 `showPreview={!multiple}`. 렌더러 public props는 그대로 유지할 수 있다. `SlideCommentSurface`는 I05의 계약을 사용한다.
- **Data & Schema Fields**: 새 영속 필드 없음. `data-production-scroll`은 ProductionPanels 중앙 section에 추가하는 DOM 표식이다. 헤더, 프로젝트 상태, 좌우 패널 토글 및 선택 query는 유지한다.
- **Execution Flow / Logic**:
  1. Basic: 기존 frame ref/ResizeObserver/960×540 scale·본문 overflow 계산을 유지한다. full이며 scale>0일 때만 표면을 활성화하고, frame을 children으로 감싼다. overflow 안내는 표면 밖에 둔다.
  2. HTML: `.frame`에 max-width 860px, margin auto, container-type이 있다. 그 frame **안쪽**에서 `.slide`를 표면으로 감싼다. frame 전체보다 넓은 래퍼에 핀을 찍지 않는다. 버튼도 같은 최대 너비에 맞춘다. thumbnail은 기존 markup을 그대로 사용한다.
  3. Template: query 성공·연결된 templateSlide 존재·자산 접근 가능 시에만 실제 role=img 영역을 표면 children으로 사용한다. 내부 inert/pointer-events:none은 유지한다. 경고 목록·안내 p·로딩/오류 placeholder는 표면 밖이다. 관리자용 공용 TemplateSlidePreview를 수정하지 않는다.
  4. 다중 선택 시 현재 ActiveSlide는 초안 보호를 위해 숨겨진 채 남을 수 있다. showPreview=false로 **미리보기만** 렌더하지 않고 편집 세션·DraftProtection은 유지한다. 여러 장 목록에는 각 슬라이드 미리보기를 한 번씩만 렌더한다. dirty 상태로 다중 선택이 된 경우에도 중복 핀 표면이 생기면 안 된다.
  5. CommentsWorkspace에서 전체 section의 data-comment-surface, tabIndex, crosshair, 생성 click/key handler 및 핀/hover/popup 렌더·geometry effect를 제거한다. `ProjectHeader title="제작"`, data-production-header, theme, ProductionScreen, loading/error/retry와 roundConflict 초안 보호 안내는 유지한다.
  6. 헤더 아래 canvasTools의 CommentCreateButton/LegacyCommentsArchive와 빈 행을 제거한다. 핀 모드 안내는 해당 SlideCommentSurface의 버튼 근처로 옮긴다. 예전 저장소·legacy identity provider를 삭제하지 않는다.
  7. 외부 변경으로 슬라이드가 삭제되어 새 초안 또는 reply/edit 초안의 대상이 capabilities.slideIds에 없으면 CommentsWorkspace에 복사 가능한 텍스트 안내를 표시한다. new는 pendingSlideId, reply/edit는 snapshot의 thread 연결로 판별한다. roundConflict가 있으면 기존 회차 안내를 우선한다. 새로운 보관함 버튼을 추가하지 않는다. 정상 사용자 전환은 기존 runtime.navigate/guard가 처리한다.
  8. 슬라이드 삭제 확인창의 `작업 영역 코멘트는 유지합니다`를 `연결된 핀 의견은 화면에서 숨겨집니다. 삭제를 되돌리면 다시 표시됩니다.`로 바꾼다. 기존 15초 되돌리기 설명은 유지한다.
  9. Error & Exception Handling: 읽기 전용·권한 상실·실패 placeholder에서 핀 생성 버튼이 나오지 않게 한다. 기존 saved preview·본문 내용·자산 접근 정책은 바꾸지 않는다.
  10. State Transition & Return: 현재 route는 그대로 CommentsWorkspace를 렌더한다. 중앙 카드의 미관 변경은 아직 하지 않는다.

### I07. 삭제·복원·복사·회차 및 수치 일치

- Related Files:
  - `lib/workspace/production/selectors.ts` :: `selectTocRows`, `selectDeletionImpact`, `getCompletionSummary` — 새 슬라이드 의견 집계; modify
  - `lib/workspace/production/domain.ts` :: `remove-slide`, `batch-slides`, `remove-section`, `remove-chapter`, `start-round`, `undo` — canvas를 삭제하지 않는 현재 동작 확인; read-only
  - `lib/workspace/production/clipboard.ts` :: `cloneClipboardSlide` — 새 slide ID, 의견 비복제 유지; read-only

#### Details

- **Signatures & Types**: 기존 selector 인자·반환 타입 유지. I02의 `visibleCanvasThreads(body)`를 import한다. 이 helper는 selectors를 import하지 않아 순환 의존을 만들지 않는다.
- **Data & Schema Fields**: canvas에는 sectionId를 중복 저장하지 않는다. 현재 body.slides에서 slideId→sectionId를 계산한다. 기존 body.threads/reviews의 계산은 그대로 두고 canvas의 표시 가능한 open thread를 더한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: slide 존재 조건은 현재 body를 기준으로 하고 보관본은 `selectSnapshotView`가 선택한 body를 기준으로 한다.
  2. Core Processing: selectTocRows는 해당 소목차 집합에 속한 visible canvas open 수, selectDeletionImpact는 삭제 대상 slide ID 집합에 속한 visible canvas open 수를 추가한다. getCompletionSummary는 기존 무조건 canvas 전체 계산을 visible canvas 계산으로 바꾼다. 기존 thread/review와 ID가 겹치지 않는 검증은 유지한다.
  3. 삭제는 canvas 원문을 제거하지 않는다. 읽기 schema에서 없는 slide 참조를 허용했으므로 전체 자료는 유효하고 UI·집계에서만 제외된다. undo로 동일 slide가 돌아오면 다시 보인다. 복사/붙여넣기는 새 slide ID이므로 기존 의견을 보여 주지 않는다. 소목차 이동은 ID가 유지되므로 새 소목차의 집계에 포함된다.
  4. Error & Exception Handling: 숨긴 의견을 해결 완료로 바꾸거나 다음 번호를 줄여 수치를 맞추지 않는다. 완료·재작업 액션의 권한/acknowledged 규칙을 변경하지 않는다.
  5. State Transition & Return: 모든 화면에 같은 범위의 미처리 수를 사용하되 기존 의견 체계의 전면 통합은 하지 않는다.

## Acceptance Criteria

- [x] 중앙 슬라이드마다 아래 왼쪽에 핀 생성 버튼이 있고 이전 의견 버튼은 없다.
- [x] A에서 생성한 의견은 A에서만 보이며 새로고침·재정렬·소목차 이동·다음 회차에도 대상이 유지된다.
- [x] 헤더·편집·출처·목록·미리보기 안내·면 바깥 여백은 생성 클릭/십자 커서 대상이 아니다.
- [x] 다중 선택에서 생성 모드와 팝업은 하나씩이며 같은 slide의 표면이 중복되지 않는다.
- [x] 기존 연결 없는 의견·메시지·보관본·되돌리기 자료가 유지된다. 다른 의견 저장 후에도 유실되지 않는다.
- [x] 새 생성의 slideId 누락/없는 ID/다른 프로젝트 대상이 거부된다. 기존 소유권·읽기 전용·회차 충돌 검증이 유지된다.
- [x] 삭제된 slide의 의견은 숨기고 undo 시 복구한다. 복사한 slide에는 기존 의견이 붙지 않는다. 집계에서 숨겨진 canvas 의견을 제외한다.
- [x] A 새 초안 작성 중 B 생성 버튼은 기존 확인 흐름을 거치고, 취소 시 A의 위치·본문이 유지된다.
- [x] 포커스·Esc·키보드 생성/이동·드래그 취소·팝업 크기 조절·멘션·답글 기능이 유지된다.
- [x] 팝업은 중앙 스크롤/HTML container에 잘리지 않으며 실제 면 바깥에 놓아도 viewport 안에서 사용할 수 있다.

## Validation

프로젝트 루트 PowerShell에서 다음을 실행한다. tests/ 또는 검증 파일을 생성하지 않는다.

- `npm.cmd run typecheck` — 타입 오류 0.
- `npm.cmd run lint` — 오류 0; 불필요해진 import/effect 제거 확인.
- `npm.cmd run build` — production build 성공; SSR 중 document 접근 오류 없음.
- `git diff --check` — 공백 오류 0.

stdin 검증은 PowerShell literal here-string의 JS를 `node --import tsx`에 전달한다. 예: 아래 최소 schema 검증은 청사진의 추가 계약을 직접 확인한다.

```powershell
@'
const assert = require('node:assert/strict');
const { CanvasCommentStateSchema, CanvasCommandSchema } = require('./lib/workspace/production/canvas-schemas.ts');
const at = '2026-11-05T00:00:00.000Z';
const root = { id:'m1', threadId:'t1', kind:'root', authorId:'u1', authorName:'사용자', text:'기존 의견', mentions:[], createdAt:at, updatedAt:null, revision:1, isSeed:false };
const thread = { id:'t1', number:1, rootMessageId:'m1', authorId:'u1', status:'open', xRatio:.3, yRatio:.4, createdAt:at, updatedAt:at, resolvedAt:null, resolvedBy:null, revision:1, isSeed:false, carriedFrom:null };
const old = { nextNumber:2, threads:[thread], messages:[root] };
const parsed = CanvasCommentStateSchema.parse(old);
assert.equal(parsed.threads[0].slideId, null);
assert.deepEqual(parsed.messages, old.messages);
assert.equal('slideId' in old.threads[0], false);
const create = { type:'create-thread', threadId:'t2', messageId:'m2', point:{xRatio:.5,yRatio:.5}, draft:{text:'새 의견',mentions:[]} };
assert.equal(CanvasCommandSchema.safeParse(create).success, false);
assert.equal(CanvasCommandSchema.safeParse({...create,slideId:null}).success, false);
assert.equal(CanvasCommandSchema.safeParse({...create,slideId:'slide-a'}).success, true);
assert.equal(CanvasCommandSchema.safeParse({...create,slideId:' '}).success, false);
console.log('canvas schema compatibility passed');
'@ | node --import tsx
```

추가 동작 검증도 같은 stdin 방식으로 수행하고 결과를 완료 보고서에 기록한다. 아래는 반드시 실제 구현을 호출할 시나리오이며 같은 로직을 재구현한 테스트로 대체하지 않는다.

| 검증 대상 | 준비 및 실제 호출 | 기대값 |
| :--- | :--- | :--- |
| 저장 보존 | u1을 PM으로 가진 테스트 context, A/B 두 slide, null 연결 의견+각 slide 의견을 가진 state에서 applyCanvasCommand(create/reply/edit/move/status/delete) | 대상 외 thread/message/slideId/carriedFrom/nextNumber 보존; 다른 대상 삭제 없음 |
| 저장 읽기 | v1, slideId 없는 v2, 새 v2를 StoredWorkspaceStateSchema.parse; body/snapshot/undo 각각 확인 | 기존 자료 유지, 누락만 null, 잘못된 타입 거부 |
| 쓰기 범위 | applyCanvasCommand로 없는 slide 생성·숨긴 thread 수정·외부 project·읽기 전용·중복 ID·낡은 revision | NOT_FOUND/FORBIDDEN/READ_ONLY/VALIDATION/CONFLICT 중 해당 오류, 원본 불변 |
| controller | fake CommentRepository에 실제 applyCommentCommand를 연결하고 load→togglePinMode(A)→placePin→setDraft→submitNew | command.slideId=A; 성공/실패/저장 도중 초안 변경의 기존 보존 규칙 유지 |
| controller 전환 | A 초안 상태에서 B 직접 전환, closePopup, suspendSlide(B), suspendSlide(A), discardDrafts | 다른 대상 덮어쓰기 없음, B 정리가 A에 영향 없음, 정상 폐기 시 두 target 필드 null |
| lifecycle | createHtmlDemoBundle의 격리된 메모리 자료로 remove/batch-remove/undo/move/copy/start-round 및 selector 실행 | 삭제 시 숨김/복원 시 재등장/복사 시 비복제/이월 시 연결 유지/수치 일치 |
| 실제 React UI | jsdom/createRoot/React.act, ResizeObserver와 rect를 지정하고 SlideCommentSurface 두 개를 실제 render | 버튼 A/B mode 하나, 면 밖 생성 0, 면 안 1, popup 하나, 같은 대상 focus |
| 면 기준 | Basic/HTML/Template 실제 renderer를 각 full/thumbnail로 render; 자산 query만 fixture로 대체 | 경고·버튼 영역 제외, HTML frame 여백 제외, thumbnail·loading·error 생성 없음 |
| 입력 보호 | 실제 ScopedComments/context guard와 버튼을 연결해 A 초안→B 버튼의 취소/폐기 | 취소 A 유지, 폐기 후 B 생성 모드, 잘못된 slide 저장 없음 |
| 숨김·충돌 | popup 상태에서 scroller rect 바깥 이동, CSS 숨김에 해당하는 0 rect, 외부 round/slide 삭제 | 해당 UI만 닫힘, copy 가능한 초안 유지, 다른 popup 오동작 없음 |

jsdom 검증은 실제 브라우저의 렌더 결과를 보증하지 않는다. 완료 보고서에는 타입/lint/build 및 DOM·좌표 모의 검증 범위를 명시한다. 브라우저/CUA/E2E/dev server/스크린샷 검증은 수행하지 않는다.

## Commit Message

```text
제작 의견 핀을 슬라이드별 생성 영역과 저장 대상으로 연결

Plan: 2026-11-05-production-slide-pin-layout
Phase: P01-slide-pin-layout
Task: T01-slide-bound-comments

- 기존 의견 자료를 보존하고 새 핀의 슬라이드 연결과 쓰기 범위 검증 추가
- 실제 슬라이드 내부 생성·이동 및 슬라이드 아래 핀 버튼 배치
- 다중 선택·초안 보호·팝업 포커스와 삭제 복원 집계 유지
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: af5279e

완료 후 Status를 done으로 바꾸고 검증 결과·커밋을 기록한다. 상위 phase.md를 done 1/2로 갱신하고 `.memory/current.md`의 Active Task를 `T02-compact-editor-layout.md`로 이동한다. current.md 강제 stage 금지. 요청하지 않은 코드 정리·다른 DB 작업·push·배포 금지.

## Execution Result (2026-11-06)

- 슬라이드 연결 저장·기존 자료 보존·쓰기 권한 검증, 단일 controller의 생성 대상, 실제 면의 핀/팝업/하단 버튼, 관련 집계를 구현했다.
- npm.cmd run typecheck / lint / build 및 git diff --check 통과.
- stdin 검증 164개 통과: 도메인/controller 69, 실제 핀 표면 UI 36, 실제 렌더러 38, 초안 보호 provider 13, 단일/다중 선택 통합 8.
- DOM/ResizeObserver/좌표를 모의 처리했고 실제 관련 React 컴포넌트와 controller를 호출했다. 실제 브라우저 시각 검증은 수행하지 않았다. tests/ 또는 검증 파일을 만들지 않았다.
- 청사진의 읽기 대상으로 지정했던 lib/workspace/production/state-compatibility.ts도 수정했다. 누락 slideId를 null로 정규화하는 schema의 입력/출력 타입 차이를 처리하기 위해 최종 엄격 검증 앞에 identity preprocess를 사용했다. 손상된 v2를 v1로 복구하거나 자료를 제거하지 않는다.
- 기존 별도 ProjectComments 체계는 계획대로 유지했다. 추가 범위 밖 수정 없음.
