# Task: T03 현재 제작 화면과 전체 슬라이드 조작 통합

## Status: done

## Goal

현재 `/workspace/write`의 헤더·코멘트를 유지하고 T01 편집기와 T02 미리보기·출처를 세 패널로 연결한다. 전체 프로젝트 슬라이드의 선택·추가·복제·삭제·복사·붙여넣기·이동·저장을 기존 명령으로 수행한다. T01/T02 완료 후 실행하며 AI 요청 노출은 T04에서 마무리한다.

## Decision Summary

- 현재 라우트는 CommentsWorkspace를 유지한다. 본문만 삽입하고 헤더·코멘트 대상·저장소를 교체하지 않는다.
- 전체 목록과 중앙/출처는 같은 선택·회차를 사용한다. 현재 Dadam/레이아웃 토큰을 쓰고 새 공용 UI·DB 스키마·패키지·tests 폴더를 만들지 않는다.

## Implementation

### I01. 헤더 없는 본문 조회 경계와 화면 삽입

- Related Files:
  - `components/workspace/production/ProductionScreen.tsx` :: `ProductionScreen`, 내부 `ActiveProductionScreen` — 본문 진입점; new
  - `components/comments/CommentsWorkspace.tsx` :: `CommentsWorkspace` — 기존 intro와 핀 사이에 본문 삽입; modify
  - `components/workspace/shared/WorkspaceFlow.tsx` :: `WorkspaceFlow` — 제작 branch의 본문 계약; modify
  - `app/(authenticated)/workspace/[screen]/page.tsx` — write→CommentsWorkspace 유지; read-only
  - `components/comments/ProjectCanvasCommentsProvider.tsx`, `components/common/ProjectHeader.tsx`, `components/workspace/WorkspaceScreen.tsx` — 기존 대상/헤더/scene; read-only
  - `hooks/workspace/use-workspace-selection.ts`, `use-workspace-production.ts` — 기존 provider 조회; read-only

#### Details

- **Signatures & Types**:

```typescript
export default function ProductionScreen(): React.ReactElement;
// 기존 scene 형태를 사용한다.
interface WorkspaceSceneProps {
  view: ProjectView; liveView: ProjectView;
  selection: WorkspaceSelection;
  choose(selection: WorkspaceSelection): Promise<void>;
  selector: React.ReactNode;
}
// 기존 호출 호환성을 위해 readOnlyError는 optional로 추가한다.
WorkspaceFlow(props: WorkspaceSceneProps & {
  screen: "toc" | "write"; readOnlyError?: string | null;
}): React.ReactElement;
```

- **Data & Schema Fields**:
  - WorkspaceSelection의 projectId/sectionId/slideId/snapshotId는 모두 string|null. 선택·URL·복원은 기존 context가 소유한다.
  - `useWorkspaceSelection()`은 selection/projects/pending/error/notice/choose/commitSelection을 반환한다. choose는 초안 보호 포함, commitSelection은 보호를 통과한 실제 선택 반영이다.
  - `useProjectWorkspace(projectId|null)`의 data는 ProjectView. `selectSnapshotView(data,snapshotId)`는 해당 body/round를 선택하고 phase=completed, 편집 capabilities를 비활성화하는 기존 함수다.
  - provider 없음/loading/error/no-project/ready를 구분한다. 새 runtime·임의 프로젝트 선택·초기 데이터 생성은 하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: ProductionScreen은 useOptionalWorkspaceRuntime으로 존재를 확인하고, runtime이 있을 때 내부 ActiveProductionScreen을 렌더해 필수 훅을 호출한다. 인증/provider 배치를 변경하지 않는다.
  2. choice.error면 project query를 null로 비활성화한다. pending/error/no-project는 본문 상태만 표시한다. WorkspacePage/ProjectHeader를 추가하지 않는다. choice.notice와 기존 선택 바로잡기 경로를 사용한다.
  3. Core Processing: ready에서 liveView=query.data, view=selectSnapshotView(liveView,snapshotId), selector=null인 scene을 만들고 WorkspaceFlow screen=write에 전달한다. 일시적인 조회 갱신 실패 시 마지막 본문을 즉시 unmount하지 않고 readOnlyError로 오류를 전달하여 초안을 보존하고 쓰기를 막는다. FORBIDDEN이면 캐시의 저장본·자료를 계속 공개하지 않고 접근 오류로 대체한다. 현재 사용자에게 이미 있던 미저장 입력만 로컬 보호 상태로 보존하고, 다른 사용자 scope로 넘기지 않는다.
  4. projectId/snapshotId는 안정적인 화면 scope로 쓰되 revision/currentRound/권한을 React key에 넣지 않는다. 댓글 저장이나 외부 회차 변경마다 편집기를 새로 만들면 초안이 사라진다. 명시적 프로젝트/보관본 이동은 기존 guard를 사용한다.
  5. CommentsWorkspace의 기존 intro(헤더·의견 생성·이전 의견·회차 충돌 안내)는 그대로 두고 그 다음, 기존 핀/팝업 sibling 전에 ProductionScreen을 한 번 삽입한다. 본문 여백은 --layout-page-inset, surface ref/좌표/핀 목록은 유지한다.
  6. intro에 크기 관찰용 data-production-header 표식만 추가할 수 있다. 본문 전체에 data-comment-control을 붙이지 않는다. 편집기/메뉴/핸들 같은 실제 제어만 제외해야 정적 슬라이드 표면에 핀을 놓을 수 있다.
  7. 부모 클릭 제외 selector에 [contenteditable='true'],[role='separator']를 보완하고 기존 button/a/input/textarea/select/data-comment-control 조건을 유지한다. 코멘트 provider/controller/geometry와 저장 좌표는 변경하지 않는다.
  8. WorkspaceFlow의 toc branch는 기존 헤더/PPT/AI 흐름을 유지한다. write는 헤더 없는 ProductionWorkspace로 연결하고 actions/이전 의견/ProjectCommentPins를 넘기지 않는다. 이 Task에서는 write onPropose를 노출하지 않고 T04에서 중앙 슬롯으로 연결한다.
  9. Error & Exception Handling: 접근 불가·없는 보관본·저장소 오류를 빈 화면으로 감추지 않는다. 기존 query.refetch/runtime.reconnect로 재시도한다. readOnlyError가 있으면 부모 명령·AI 시작까지 차단한다.
  10. State Transition & Return: 현재 헤더와 코멘트가 각각 한 번만 존재하는 본문 구조를 반환한다. 라우트 파일은 변경하지 않는다.

### I02. 전체 목록과 명령의 단일 선택 기준

- Related Files:
  - `components/workspace/production/ProductionWorkspace.tsx` :: `ProductionWorkspace`, `ActiveSlide` — 본문 전용 조립; modify
  - `components/workspace/production/SlideNavigator.tsx` :: `SlideNavigator` — 전체 행·메뉴; modify
  - `components/workspace/production/ProductionToolbar.tsx` :: `ProductionToolbar` — 소목차/작성 상태; modify
  - `lib/workspace/production/presentation.ts` :: `selectProductionSlides` — T02 순서; read-only
  - `hooks/workspace/use-slide-clipboard.ts` :: `useSlideClipboard` — 내부 클립보드/이미지; read-only
  - `lib/workspace/production/selectors.ts` :: `selectDeletionImpact` — 삭제 영향; read-only

#### Details

- **Signatures & Types**:

```typescript
export interface ProductionWorkspaceProps extends WorkspaceSceneProps {
  onPropose?(request: MockRequest): void;
  aiFeedback?: React.ReactNode;
  aiBusy?: boolean;
  readOnlyError?: string | null;
}
export default function ProductionWorkspace(props: ProductionWorkspaceProps): React.ReactElement;
export interface SlideNavigatorProps {
  view: ProjectView; rows: readonly ProductionSlideRow[];
  activeId: string | null; selectedIds: readonly string[];
  snapshotId: string | null; busy: boolean;
  onSelect(id: string, mode: "single" | "toggle" | "range"): void;
  onCommand(operation: WorkspaceOperation): void;
  onCopy(ids: string[]): void;
  onPaste(sectionId: string, afterId: string | null): void;
  onRemove(ids: string[]): void;
  onMove(ids: string[], sectionId: string): void;
  canCopy(ids: readonly string[]): boolean;
  canPaste: boolean;
}
export default function SlideNavigator(props: SlideNavigatorProps): React.ReactElement;
```

- **Data & Schema Fields**:
  - local selectedIds:string[], anchorId:string|null, contextSlideId:string|null. 정렬·존재 검사는 전체 rows를 기준으로 한다.
  - WorkspaceOperation: add-slide(sectionId,afterId,template:null), duplicate-slide(id,targetSectionId,afterId), move-slide(id,sectionId,beforeId), save-slide(id,content,template), set-section-state(id,state:writing|done), unlock-section(id).
  - ProjectRequest={projectId:string,expectedRevision:number,expectedRound:number}; WorkspaceReceipt={state,createdIds:string[],undoId:string|null,notices?:string[]}.
  - SlideBatchRequest extends ProjectRequest={operation:move|remove,slideIds:string[],sectionId:string|null,beforeId:string|null}.
  - 명령은 useWorkspaceCommand().mutateAsync({...requestFor(fresh),operation}), batch는 useWorkspaceAction<WorkspaceReceipt,SlideBatchRequest>((runtime,input)=>runtime.service.editSlides(input)).
  - clipboard.copy.mutateAsync({projectId,slideIds})→{token,count}; paste.mutateAsync({...ProjectRequest,sectionId,afterId,token})→WorkspaceReceipt; getToken()→string|null. 기존 유효기간·사용자 범위·자산 접근 검사를 유지한다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 하나의 rows에서 활성 slide/section/번호/선택집합/권한을 계산한다. 한 섹션 필터로 별도 번호·범위를 만들지 않는다. 선택 버튼과 더보기 버튼을 분리하고 썸네일 내부 조작 버튼을 중첩하지 않는다.
  2. Core Processing: 단일 클릭은 집합을 1건으로, Ctrl/Command는 toggle, Shift는 anchor부터 클릭까지 전체 범위로 만든다. 섹션을 가로질러 동작한다. 우클릭 대상이 기존 집합 안이면 집합을 유지하고 아니면 해당 1건으로 바꾼 뒤 메뉴를 연다.
  3. 선택/메뉴 변경도 runtime.navigate 안에서 실행한다. navigate는 취소 시에도 resolve하므로 .then(setSelected)로 성공을 추정하지 않는다. 보호를 통과한 callback 안에서 같은 context의 commitSelection을 사용하여 이중 guard를 피한다.
  4. 모든 변경은 navigate 후 loadProjectView(runtime,projectId)를 읽고 최신 snapshot/round/대상/권한을 확인하여 requestFor(fresh)를 사용한다. 화면이 읽기 전용이면 호출하지 않는다. 작업 중 scope가 달라지면 결과를 새 화면에 반영하지 않는다.
  5. 추가·복제·붙여넣기 후 receipt.createdIds[0]의 실제 slide를 receipt.state에서 찾아 그 sectionId도 함께 선택한다. 옛 sectionId를 유지한 채 다른 섹션의 slideId만 넣지 않는다. 내부 붙여넣기는 명시한 sectionId/afterId로 실행한다.
  6. 위/아래 이동은 같은 섹션의 이웃을 기준으로 beforeId를 계산한다. 다른 섹션 이동은 대상 섹션을 명시한 batch 확인을 사용한다. 기존 선택 순서를 보존하고 새 드래그 정렬 엔진은 만들지 않는다.
  7. 삭제/이동은 기존 ModalFrame에 대상 수·슬라이드 귀속 의견 영향·15초 undo를 표시한다. canvasComments를 삭제하지 않는다. 마지막 slide 삭제를 허용하는 현 도메인을 따르고 빈 섹션에 추가 경로를 제공한다. 섹션을 자동 삭제하지 않는다.
  8. 명령·복사·붙여넣기·이미지·AI의 busy를 합쳐 중복 변경을 막는다. 완성/snapshot/고정/권한을 전체 선택에서 확인한다. 일부를 몰래 빼고 성공시키지 않는다.
  9. 목록 단축키는 목록에 포커스가 있을 때만 처리한다. isTypingTarget, IME, ModalFrame, 코멘트 popup/pin과 다른 제어를 제외한다. Delete가 코멘트 삭제를 가로채지 않으며 Ctrl+S는 ActiveSlide에서만 처리한다.
  10. 중앙 toolbar는 장/소목차 선택과 작성 상태를 표시한다. 회차/완성/PPT/프로젝트 설정/검토 요청/이전 의견 버튼을 중복하지 않는다. 작성 상태와 고정 해제는 기존 command/capabilities를 사용한다.
  11. Error & Exception Handling: 실패 시 선택·입력·확인창을 보존하고 오류를 표시한다. empty catch만 두어 권한 오류를 숨기지 않는다. 성공은 receipt.notices와 WorkspaceUndoNotice를 사용한다.
  12. State Transition & Return: 각 조작 성공 뒤 실제 응답에 맞춰 선택을 복원한다. 명령 취소 후 UI만 먼저 바뀌지 않는다.

### I03. 저장본 표시와 미저장 편집 세션 보호

- Related Files:
  - `components/workspace/production/ProductionWorkspace.tsx` :: `ActiveSlide`, 편집 세션 — T01 연결; modify
  - `components/workspace/production/ProductionPreview.tsx`, `SourcePanel.tsx` — T02 임시 호환 props 제거; modify
  - `hooks/workspace/use-slide-draft.ts`, `use-workspace-draft-guard.ts` — 초안/보호; read-only
  - `components/workspace/shared/WorkspaceUi.tsx` :: `DraftProtection` — 기존 확인; read-only

#### Details

- **Signatures & Types**:

```typescript
interface EditingSession {
  slideId: string; round: number; snapshotId: string | null;
  lastSlide: ProposalSlide; dirty: boolean;
}
interface ActiveSlideProps {
  view: ProjectView; slide: ProposalSlide; snapshotId: string | null;
  externalConflict: string | null; busy: boolean;
  onDirtyChange(dirty: boolean): void;
}
```

- **Data & Schema Fields**: 부모 session은 마지막으로 확인한 저장 slide와 dirty만 보존하며 두 번째 영속 원본이 아니다. ActiveSlide는 useSlideDraft, T01 DocumentEditorState, resetKey:number=0, localError:string|null을 가진다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: ActiveSlide key는 projectId/snapshotId/slideId이고 권한/currentRound/revision을 넣지 않는다. dirty 중 외부 회차·삭제·권한 변경 시 lastSlide와 입력을 보존하고 externalConflict를 표시한다.
  2. Core Processing: dirty=false이거나 사용자가 명시적으로 폐기/최신 이동을 승인한 경우에만 session을 현재 선택에 맞춘다. 대상이 삭제되어도 기존 입력을 복사할 수 있게 남기고 저장 불가와 현재 선택으로 이동하는 경로를 제공한다.
  3. dirty=editor.draft.dirty || documentState.dirty. 저장은 편집 권한, snapshot=null, 외부 충돌 없음, 문서 오류 없음, composing=false, busy=false를 모두 확인한다. 저장 가능할 때만 guard의 onSave를 제공한다. 권한 회수된 초안도 바로 지우지 않는다.
  4. editor.save 성공 후 Query의 저장 slide로 중앙/썸네일을 갱신한다. ProductionPreview에 draft를 넘기지 않는다. 반영 전에는 미반영 변경 표시를 두고, 저장 중 입력을 잠가 응답이 중간 입력을 지우지 않게 한다.
  5. 명시적 discard는 editor.discard와 resetKey 증가를 함께 수행한다. Template 연결 UI는 접힌 보조 설정에 SlideTemplatePicker를 재사용하고 현재 draft content/template을 편집한다. 아직 반영하지 않은 Template을 저장본 미리보기로 보여주지 않는다.
  6. DraftProtection에 합성 dirty/busy와 가능한 save/discard를 연결한다. 다중 선택/AI 모드로 바꾸기 전에도 보호한다. 이미지 삽입은 기존 clipboard.image API를 사용하고 미저장 문서를 무단 저장하지 않는다.
  7. T02 ProductionPreview의 content/template/dirty/overlay 호환 props와 SourcePanel의 onSlide/comments를 모든 호출부와 함께 제거한다. 기존 ProjectComments/ProjectCommentPins를 mount하지 않지만 파일 자체를 삭제하지 않는다.
  8. Error & State Transition: 원시 DOM 오류와 서비스 오류를 구분하고 실패 시 입력을 유지한다. readOnlyError 동안도 세션을 보존하며 새 명령·저장을 막는다.

### I04. 패널 배치와 사용자 설정

- Related Files:
  - `components/workspace/production/ProductionPanels.tsx` :: `ProductionPanels` — 배치·너비·반응형; modify
  - `hooks/workspace/use-production-panels.ts` :: `useProductionPanels` — 저장 범위 전환; modify
  - `app/layout-tokens.css`, `lib/ui/dadam-theme.ts` — 공통 값; read-only

#### Details

- **Signatures & Types**: 기존 ProductionPanels({namespace,left,center,right})와 hook의 state/update/resize/reset 계약을 유지한다. state는 leftOpen/rightOpen:boolean, leftWidth/rightWidth:number, mobilePanel:slides|editor|sources.
- **Data & Schema Fields**: 기본 좌/우 열림=true, 왼쪽240/오른쪽320, mobilePanel=editor. 허용 폭은 좌200~320, 우280~420. 저장 key는 기존 kpc-production-panels:+runtime.identity.namespace.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 1180px 이상 가용 컨테이너는 3열, 761~1179는 출처 overlay, 760 이하에서는 목록/편집/출처 전환을 사용한다. 접힌 패널의 열기 버튼은 남긴다. 출처 라벨에서 의견을 제거한다.
  2. Core Processing: 페이지/섹션/카드 12px, 제어 간격8px는 기존 --layout-* 변수로 참조한다. 새 전역 CSS를 만들지 않는다. min-width/flex-shrink/overflow로 가로 페이지 넘침을 막는다.
  3. 패널 상단 rect.top과 visualViewport/innerHeight로 남은 높이를 계산하되 최소420px을 확보한다. window resize와 data-production-header의 ResizeObserver로 재측정하고 동일 값은 state 갱신하지 않는다. 목록/중앙/출처는 내부 스크롤, 바깥 comment surface는 overflow:visible이다.
  4. separator는 data-comment-control, role=separator, aria-valuenow/min/max, 키보드 좌우±10px/Home 초기화를 제공한다. pointerId/이전clientX를 ref로 관리하고 movementX에 의존하지 않는다. pointercancel/lostpointercapture도 정리한다.
  5. namespace가 바뀌면 이전 사용자 state를 새 key에 쓰지 않는다. ready를 namespace와 함께 관리하여 기본값→대상key 검증→ready 순으로 처리한다. localStorage 실패는 기본 배치로 복구하고 문서 저장 오류로 취급하지 않는다.
  6. Error & Exception Handling: 잘못된 저장값은 기존 Zod schema로 거절한다. resize 중 취소해도 포인터 상태가 남지 않는다.
  7. State Transition & Return: 작은 화면의 패널 전환은 편집 세션을 unmount하지 않고 표시만 바꾼다. 기존 핀/팝업은 내부 overflow 밖에 유지한다.

## Acceptance Criteria

- [x] 현재 제작 경로에 헤더1개·코멘트 시스템1개와 세 본문 영역이 연결된다.
- [x] 전체 장/소목차의 순서·번호가 일치하고 섹션을 넘는 단일/다중/범위 선택을 지원한다.
- [x] 추가/복제/붙여넣기 후 실제 응답의 slide/section을 선택하고 삭제/이동은 전체 권한·undo를 사용한다.
- [x] navigate 취소 후 선택·mutation이 실행되지 않고 문서·IME·코멘트 입력에 목록 단축키가 개입하지 않는다.
- [x] 외부 회차·삭제·권한 변경으로 dirty 입력을 버리지 않고 저장 불가를 안내한다.
- [x] 반영 성공 후 중앙은 저장본을 표시하고 출처도 동일 활성 slide에 연결된다.
- [x] 실제 제어만 핀 생성에서 제외하며 정적 미리보기의 작업 영역 핀은 유지한다.
- [x] 반응형·사용자별 설정을 구현하고 이전 사용자 값을 새 key에 쓰지 않는다.

## Validation

- `npm.cmd run typecheck` — route/scene/컴포넌트의 모든 호출이 일치한다.
- `npx.cmd eslint components/comments/CommentsWorkspace.tsx components/workspace/production/ProductionScreen.tsx components/workspace/production/ProductionWorkspace.tsx components/workspace/production/SlideNavigator.tsx components/workspace/production/ProductionToolbar.tsx components/workspace/production/ProductionPanels.tsx components/workspace/production/ProductionPreview.tsx components/workspace/production/SourcePanel.tsx components/workspace/shared/WorkspaceFlow.tsx hooks/workspace/use-production-panels.ts` — 변경 파일 오류0.
- 인라인 `npx.cmd tsx`와 기존 fake-indexeddb 또는 타입을 만족하는 메모리 repository로 2개 섹션의 추가/복제/이동/삭제, 마지막 slide 삭제 후 섹션 유지, 권한 혼합 batch 전체 거절, snapshot 쓰기 거절, 실패 시 쓰기 없음, canvasComments 불변을 assert한다. 테스트 파일/폴더를 만들지 않는다.
- 정적 확인: ProjectHeader/CommentsWorkspace 재귀·중복 mount 없음, 새 본문에 ProjectCommentPins/ProjectComments/PptControls 없음, 읽기 전용 변경 제어 차단, 목록 버튼 내부 버튼 없음, 편집 key에 회차/revision/권한 없음, 취소 후 .then(setSelected) 없음.
- `git diff --check`. 브라우저·스크린샷·E2E·dev server·tests 폴더를 사용하지 않는다. 실제 핀 위치·IME·드래그 검증을 통과했다고 기록하지 않는다.

## Commit Message

```text
feat(write): 기존 코멘트 화면에 제작 패널과 슬라이드 조작 통합

Plan: 2026-11-05-production-editor-panels
Phase: P01-production-editor
Task: T03-screen-integration

- 헤더와 작업 영역 코멘트를 유지하며 전체 슬라이드 목록 연결
- 문서 반영과 출처 조회 및 권한에 맞는 슬라이드 조작 제공
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 파일과 함께 커밋한 Task: T03-screen-integration 구현 커밋

완료 후 Task/phase와 한국어 커밋을 기록하고 local ignored current를 T04로 전진한다. 현재 포인터 강제 stage, 기존 의견 파일 삭제, push는 하지 않는다.

## Execution Record

- CommentsWorkspace의 헤더/핀을 유지하고 ProductionScreen → WorkspaceFlow → 본문 전용 ProductionWorkspace 연결.
- 전체 슬라이드 목록·다중/범위 선택·메뉴·추가/복제/복사/붙여넣기/이동/삭제와 기존 undo 연결.
- 선택 및 명령 후처리는 navigate callback 안에서만 수행. 회차/삭제/권한 변화 중 dirty 편집 세션 유지. 원시 입력·IME 시작 시 초안 revision도 고정.
- 접근 오류 시 저장본 목록/미리보기/출처를 숨기되 이미 작성 중인 입력과 guard는 같은 컴포넌트에서 보존.
- 반응형 내부 스크롤·분리 핸들·사용자 namespace별 패널 저장 복원 구현. 재연결도 초안 guard 적용.
- 검증: typecheck, 변경 10개 파일 ESLint 및 후속 변경 파일 재검사, git diff --check 통과. 슬라이드 명령/권한/회차/불변성/정적 통합 인라인 27개 assertion 통과.
- 실제 핀/IME/드래그/반응형 실측은 수행하지 않음. tests/ 생성 없음. 범위 밖 발견: 특이사항 없음.
