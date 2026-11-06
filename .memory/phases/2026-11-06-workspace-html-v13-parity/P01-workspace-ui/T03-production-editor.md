# Task: T03 제작 중앙 편집과 코멘트 도구 통합

## Status: done

## Goal

제작 중앙을 HTML v13처럼 `대목차·소목차 선택 / 코멘트 추가·작성 상태 / 입력창`의 고정 영역과 저장된 슬라이드의 스크롤 영역으로 나눈다. 다중 선택 요청·선택 해제도 HTML 구조로 제공하며 기존 draft·권한·코멘트 좌표와 저장 동작을 유지한다.

## Decision Summary

- T01은 공통 헤더, T02는 밀착된 좌우 패널·목록·출처와 폭 저장을 적용한다. T02의 중앙은 기존 스크롤 구조이므로 이 Task에서 마지막으로 분리한다.
- 사용자 확정: UI 구성·문구·조작만 HTML대로 변경하고 현재 프로젝트 데이터 유지. 설정 알림/로그와 RFP 원문 신규 연결은 제외한다. `tests/` 생성·복원 및 브라우저 검증은 금지다.
- 원본 read-only: `C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html`, SHA256 `3501501DE7DE50A2BE2F7FA06F6ED8B59657CFAC993DD62C5DF7E8BA5270E326`. 기준: `wsWrite` L3442, `openSecPick` L3767, `multiPrompt/multiStack` L3888–3902, `productionCommentButton` L6021, `.ed-h/.ed-wrap` L290, `.sl-prompt/.sl-body` L1530. 최종 `.ed-wrap .slide` L1356은 `max-width:none`이다.

## Implementation

### I01. 섹션 도구와 선택 팝오버

- Related Files:
  - `components/workspace/production/ProductionToolbar.tsx` :: `ProductionToolbar`, 신규 `ProductionToolbarProps` — 섹션 breadcrumb·선택·상태; modify
  - `components/workspace/production/ProductionWorkspace.tsx` :: `ProductionWorkspace`, `guarded`, `selectIds` — navigation 연결; modify
  - `lib/workspace/production/selectors.ts` :: `outlineNumbers` — 소목차 번호; read-only
  - `lib/workspace/production/presentation.ts` :: `selectProductionSlides` — T02 `openComments` 포함; read-only
  - `lib/workspace/production/routing.ts` :: `workspaceHref` — 목차 관리 이동; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  interface ProductionToolbarProps {
    view: ProjectView; sectionId: string | null; busy?: boolean;
    onSection(id: string): void;
    onState?(state: "writing" | "done"): void;
    onUnlock?(): void;
    onManageToc(): void;
    commentActionSlot: React.ReactNode;
  }
  function ProductionToolbar(props: ProductionToolbarProps): React.ReactElement;
  ```

- **Data & Schema Fields**:
  - 기존 `Section`: id/chapterId/title:string, assigneeIds/reviewerIds:string[], state writing|done, locked:boolean. `ProjectView.capabilities.editableSectionIds/unlockableSectionIds`가 권한 근거다.
  - 상단: 작은 `I. 대목차명 ›` breadcrumb → 굵은 `1.1 소목차명`+chevron 버튼 → spacer → 코멘트 slot → `작성 중/작성 완료` select. breadcrumb 11px, 제목16px/700, row gap6px, select height30px/font12px/width auto. 긴 제목 min-width0/ellipsis/title, 좁으면 wrap한다.
  - chapter 번호는 배열 순서의 로마숫자 I~X, 이후 숫자 문자열로 표시하고 section 번호는 `outlineNumbers(view.state)[section.id]`를 사용한다. 제목 선택 버튼 자체는 선택값을 수정하는 input이 아니다.
  - 팝오버 width380px/max-width `calc(100vw - 32px)`, max-height `min(480px, calc(100svh - 100px))`, overflow auto. chapter별 그룹 제목, section row의 번호·제목·미처리 의견·담당자·작성 상태, 맨 아래 `목차 관리`. 현재 섹션 체크/aria-pressed를 제공한다. 담당자는 `view.members`에서 assigneeIds로 찾고 없으면 `미지정`이다.
  - 소목차의 미처리 의견은 T02 rows에서 해당 section의 `openComments` 합계다. 사용자/섹션/슬라이드 예시 수치는 만들지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: current section이 없으면 `소목차 선택` disabled/빈 목록 안내. busy 중 선택/상태/고정 해제 차단. read-only view에서는 이동/조회는 허용하되 state 변경을 허용하지 않는다.
  2. Core Processing: 기존 native section select를 Fluent Popover+button 목록으로 바꾼다. 선택은 기존 guarded `commitSelection({...selection,sectionId:id,slideId:null})` 경로를 사용한다. 성공한 sectionId prop 변경을 관찰해 팝오버를 닫는다. 동일 section 클릭은 즉시 닫기, guard 취소/실패는 강제로 닫지 않는다. 오류는 부모의 기존 `WorkspaceErrorText`에 남는다.
  3. Error & Exception Handling: 기존 `execute({type:"set-section-state",id,state})`, `execute({type:"unlock-section",id})`를 유지한다. 고정·비담당자·완성/보관본에는 잘못된 editable select를 노출하지 않는다. 상태가 done이어도 editable 여부는 HTML의 느슨한 조건 대신 앱 capabilities로 결정한다.
  4. State Transition & Return: 목차 관리는 `runtime.navigate(async () => { if (runtime.isActive()) router.push(workspaceHref("toc",selection)); })`를 호출하며 오류를 기존 fail 경로로 전달한다. draft guard를 거치지 않는 location 대입은 금지한다. Escape/외부 클릭·trigger 포커스 복귀를 제공한다.

### I02. 중앙 고정 도구·입력·슬라이드 스크롤

- Related Files:
  - `components/workspace/production/ProductionPanels.tsx` :: 중앙 section — 스크롤 소유권 이동; modify
  - `components/workspace/production/ProductionWorkspace.tsx` :: `ActiveSlide`, `ProductionWorkspace`, `EditingSession` — 단일 draft와 중앙 렌더; modify
  - `components/workspace/production/SlideContentEditor.tsx` :: `useStyles`, `SlideContentEditor` — 입력 외관; modify
  - `components/workspace/production/ProductionAiPanel.tsx` :: `ProductionAiPanel` — 다중 입력 외관; modify
  - `hooks/workspace/use-slide-draft.ts`, `components/workspace/shared/WorkspaceUi.tsx` :: `DraftProtection`, `requestFor` — 저장 보호; read-only
  - `components/workspace/shared/WorkspaceFlow.tsx`, `components/workspace/production/ProposalReview.tsx` — 제안 생성/비교/적용; read-only
  - `lib/workspace/production/document-editor.ts` — rich content 변환/붙여넣기 검증; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  interface ProductionEditorParts {
    editor: React.ReactNode; preview: React.ReactNode; dirty: boolean;
  }
  // ActiveSlide의 기존 view/slide/snapshotId/externalConflict/busy/accessDenied,
  // onDirtyChange/onBusyChange/aiFeedback/showPreview 계약에 다음만 추가:
  interface ActiveSlideLayoutProps {
    commentCreateTarget: HTMLElement | null;
    renderLayout(parts: ProductionEditorParts): React.ReactNode;
  }
  interface DocumentEditorState { dirty: boolean; composing: boolean; error: string | null }
  interface SlideContent {
    title: string; lead: string; blocks: ContentBlock[];
  }
  type ContentBlock =
    | { id:string; kind:"text"; text:string }
    | { id:string; kind:"list"; items:string[] }
    | { id:string; kind:"table"; columns:string[]; rows:string[][] }
    | { id:string; kind:"image"; blobId:string; alt:string; width:number; height:number; mime:"image/png"|"image/jpeg" };
  ```

- **Data & Schema Fields**:
  - `SlideContentEditorProps`는 기존 value/readOnly/error/onChange/onSave/busy/resetKey/onEditorStateChange를 유지한다. title/lead/blocks의 문서 구조를 평문 하나로 바꾸지 않는다.
  - `EditingSession`은 기존 slideId/round/snapshotId/lastSlide/dirty를 유지한다. 단일 `useSlideDraft` 소유자는 `ActiveSlide` 하나다. 레이아웃 변경을 이유로 key를 매 렌더 생성하지 않는다.
  - 중앙 최상위 flex column/min-height0/overflow hidden. 상단 흰 고정 도구 영역 padding14px 22px 10px/하단1px 선. 높이가 작은 화면에서도 캔버스를 완전히 가리지 않도록 max-height55%/overflow-y auto와 flex-shrink0 적용. 하단 캔버스만 flex1/min-height0/overflow-y auto/overscroll contain/padding20px 22px 30px, 배경 기존 --kpc-bg. 좁은 컨테이너에서는 좌우 padding12px로 축소한다.
  - 단일 입력 shell margin-top10px/border1/radius14px/흰 배경/미세 shadow; paper min-height48/max-height180/padding12px 52px 12px 16px/font13px/line-height1.7. 전송 버튼 right10/bottom10/30×30/원형/브랜드색. 빈 본문 placeholder `이 슬라이드에 들어갈 내용을 입력하세요`, aria-label `슬라이드에 반영`. 기존 title/lead 안내는 의미를 유지한다.
  - 다중 입력은 같은 shell로 맞추며 `N장 선택`+슬라이드 번호 chip, textarea rows2/maxLength4000/placeholder `선택한 슬라이드에 한 번에 요청하세요`, 우하단 원형 전송이다. 임의 빠른 요청 chip을 추가하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: `ActiveSlide`의 dirty/IME/composing/conflict/accessDenied/readOnlyReason/canSave/lastSlide 보호 계산을 유지한다. `ProductionPanels` 중앙 section에서 `overflow-y-auto`, padding, `data-production-scroll`을 제거하고 flex column/overflow hidden으로 만든다. 모바일 hidden/block 분기는 flex 표시와 충돌하지 않도록 일관되게 수정한다.
  2. Core Processing: ActiveSlide는 기존 editor 노드와 단일 preview 노드를 만들고 `renderLayout({editor,preview,dirty})`로 전달한다. 부모의 단일 `renderCenter` 함수는 상단에 오류/알림/toolbar/단일 editor 또는 다중 AI input을 놓고 하단에 `<div data-production-scroll>`와 preview/undo를 둔다. Ctrl+S 핸들러와 DraftProtection은 ActiveSlide 내부에 유지한다. editingSlide가 없으면 같은 renderCenter에 빈 editor/preview를 넘겨 `목차가 비어 있습니다` 또는 `이 소목차에는 슬라이드가 없습니다`를 표시한다.
  3. Error & Exception Handling: 다중 선택 때도 dirty한 단일 editor를 unmount하지 않는다. 기존처럼 `hidden`과 안내를 사용해 dirty 입력은 보이게 보관한다. accessDenied에서도 dirty 문서는 복사 가능하게 남기고 권한 없는 새 데이터/preview를 보여주지 않는다. 저장 실패/외부 revision 변경/회차 변경 경고와 resetKey 동작은 유지한다.
  4. State Transition & Return: 입력 전송은 기존 save()의 실제 저장과 validation을 호출한다. 다중 전송은 `onPropose({...requestFor(view),kind:"polish",instruction,slideIds,sectionIds:[]})`; 모든 대상 editable·phase writing·busy·빈 입력 검사를 유지한다. WorkspaceFlow의 비교/선택 적용 절차를 거쳐 반영하며 HTML `setTimeout` 시연처럼 즉시 원문을 교체하지 않는다. IME 중 Enter 전송하지 않고 Shift+Enter는 줄바꿈이다.
  5. 미리보기: 실제 Basic/HtmlDemo/Template 선택 로직과 16:9 콘텐츠를 유지한다. 중앙 preview wrapper는 width100%/min-width0이며 최종 HTML처럼 폭 전체를 쓰고 새 860px 제한을 걸지 않는다. preview의 모서리/외곽선만 조정할 수 있으나 슬라이드 좌표를 재는 surface의 바깥에 넣어야 한다. 코멘트가 잘리지 않도록 surface/portal에는 overflow hidden을 추가하지 않는다. 기존 접근/원본 오류와 출력 제약 안내는 남긴다.

### I03. 코멘트 생성 버튼을 상태 선택 왼쪽으로 이동

- Related Files:
  - `components/comments/CommentCreateButton.tsx` :: props/compact style/문구 — 기존 요청 훅 재사용; modify
  - `components/comments/SlideCommentSurface.tsx` :: props/버튼 렌더 — 실제 surface 소유권을 유지하는 portal; modify
  - `components/workspace/production/ProductionPreview.tsx` :: `ProductionPreviewProps` — 버튼 target 전달; modify
  - `components/workspace/production/BasicSlidePreview.tsx` :: `BasicSlidePreviewProps` — target 전달; modify
  - `components/workspace/production/HtmlDemoSlidePreview.tsx` :: props — target 전달; modify
  - `components/workspace/production/ProductionWorkspace.tsx` :: target slot/단일·다중 preview — active slide만 도구 출력; modify
  - `components/comments/ProjectCanvasCommentsProvider.tsx`, `components/comments/CommentPopover.tsx`, `lib/comments/controller.ts`, `lib/comments/geometry.ts` — 상태·좌표·draft 소유권; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  // ProductionPreviewProps, BasicSlidePreviewProps, HtmlDemoSlidePreview props에 추가
  interface CommentCreateTargetProp { commentCreateTarget?: HTMLElement | null }
  interface SlideCommentSurfaceProps {
    slideId: string; enabled: boolean; children: React.ReactNode;
    commentCreateTarget?: HTMLElement | null;
  }
  interface CommentCreateButtonProps {
    slideId: string; surfaceId: string; buttonId: string; disabled?: boolean;
    compact?: boolean;
  }
  // target 의미: undefined=기존 surface 하단, null=도구 미출력,
  // HTMLElement=해당 슬롯으로 createPortal. 미지정과 null을 합치지 않는다.
  ```

- **Data & Schema Fields**:
  - ProductionWorkspace에 `const [commentCreateTarget,setCommentCreateTarget]=useState<HTMLDivElement|null>(null)`을 둔다. toolbar `commentActionSlot`은 `<div ref={setCommentCreateTarget} data-comment-control />`; DOM 위치는 상태 select 바로 왼쪽이다. 값 자체를 저장소에 기록하지 않는다.
  - ActiveSlide 단일 preview에는 target을 전달한다. 다중 선택 stack에서는 active slide preview만 target, 나머지는 명시적 null을 전달한다. thumbnail은 surface가 없으며 target을 사용하지 않는다. parent scope 변경 시 ref가 null로 정리된다.
  - compact 생성 버튼 height/min-height30px/padding0 10px/radius8px/font12px/line-height20px/gap4px/icon14px, 문구 `코멘트 추가`, active면 `코멘트 추가 취소`. default 렌더에서도 명확한 문구를 적용하되 다른 곳의 크기는 기존 스타일을 유지한다.
  - `buttonId/surfaceId`는 SlideCommentSurface의 기존 useId로 생성하고 portal에서도 동일하게 쓴다. 단순 고정 DOM id를 모든 슬라이드에 복사하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 기존 `available`, capabilities.canCreate, slideIds 포함, ready/state.busy/controller, visible 조건을 그대로 사용한다. button 위치 변경을 핀 생성 권한 변경으로 해석하지 않는다.
  2. Core Processing: Surface가 직접 CommentCreateButton을 소유하되 target이 HTMLElement면 `createPortal(button,target)`으로 toolbar에 출력한다. undefined일 때만 기존 하단 tools에 버튼을 출력한다. null이면 버튼을 생략한다. active 생성 안내는 기존 surface 근처 `role=status`에 남긴다. 레이아웃을 잡기 위해 빈 toolbar 슬롯은 둬도 되나 보이지 않는 중복 버튼을 추가하지 않는다.
  3. Error & Exception Handling: actual surface가 준비되지 않거나 보이지 않으면 버튼 disabled. preview 오류/권한 해제/unmount 시 portal이 사라지고 기존 `controller.suspendSlide(slideId)`가 작동해야 한다. 생성은 `requestPinMode(slideId)`를 사용해 다른 슬라이드 새 코멘트 draft 보호를 유지한다. 직접 controller.togglePinMode로 우회하지 않는다.
  4. State Transition & Return: Escape/팝오버 닫기/삭제 후 `document.getElementById(buttonId)` 포커스 복귀가 toolbar의 실제 버튼을 찾는다. 선택된 핀이 남아 있으면 해당 핀 우선, 핀이 없으면 자신의 생성 버튼, 생성 버튼이 없는 비active 다중 선택 슬라이드는 자신의 surface 순서로 fallback한다. disabled 버튼은 건너뛴다. surfaceId를 aria-controls로 연결한다. `data-comment-create` 속성을 유지해 외부 pointerdown이 자기 버튼 클릭을 닫기 처리하지 않게 한다. 좌표 계산/핀 번호/drag/resize/멘션/답글/삭제/완료 기능을 이식하거나 재작성하지 않는다.
  5. 누락 방지: BasicSlidePreview, HtmlDemoSlidePreview, ProductionPreview의 Template 직접 surface 분기 모두 target을 전달한다. 미리보기 한 종류에서만 옮기면 나머지에서는 하단 버튼이 재등장하므로 세 분기를 같은 Task에서 처리한다.

### I04. 다중 선택 미리보기·선택에서 빼기와 최종 통합

- Related Files:
  - `components/workspace/production/ProductionWorkspace.tsx` :: selected/anchor/chooseSlide/selectIds/center — 다중 선택 흐름; modify
  - `components/workspace/production/ProductionAiPanel.tsx` — 선택한 rows와 요청; modify
  - `components/workspace/production/SlideNavigator.tsx` — T02 단축키와 selection 렌더; read-only unless integration fix is necessary
  - `components/workspace/shared/WorkspaceFlow.tsx` :: guarded proposal apply — read-only

#### Details

- **Signatures & Types**:

  ```typescript
  // ProductionWorkspace 내부 helper
  function removeSelectedSlide(id: string): void;
  // selected:string[]|null, anchor:string|null 기존 의미 유지
  // current/rows는 selectProductionSlides(view)의 실제 ID를 사용한다.
  ```

- **Data & Schema Fields**: `ids`는 rows에 현재 존재하는 ID만 유지한다. 여러 장이면 active preview를 맨 앞에 표시하고 나머지는 전체 rows 순서로 이어서 표시한다. 나머지 카드 header에는 전체 번호·소목차·섹션 내 페이지 `i/N`와 `선택에서 빼기`를 둔다. active를 두 번 렌더하지 않는다. 카드 간격22px, 헤더 아래8px, 전체 폭을 사용한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 다중 선택 대상이 다른 소목차여도 모두 실제 editable여야 일괄 요청 가능하다. 보관본은 조회만 가능하다. selected가 하나로 줄면 단일 editor로 돌아간다.
  2. Core Processing: 선택에서 빼기는 `guarded` → 현재 ids에서 해당 ID 제거 → 남은 active 또는 첫 번째 row를 focusId로 `selectIds`를 호출한다. 마지막 항목을 없애는 빈 selection은 만들지 않는다. 변경은 UI 선택만이며 slide 삭제와 구분한다.
  3. Error & Exception Handling: dirty editor의 guard 취소 시 기존 selected/current/anchor를 유지한다. Ctrl/Meta toggle, range, 회차 교체, 프로젝트 교체, 삭제 후 복구에서도 같은 보호 경로를 거친다. requestError/권한 상실 때 텍스트 입력을 임의 초기화하지 않는다.
  4. State Transition & Return: Escape 다중 선택 해제는 입력·IME·코멘트 dialog·메뉴 바깥에서만 동작하고 active 1개로 `chooseSlide(...,"single")`한다. 부모/목록의 같은 키 이벤트가 중복 실행되지 않도록 defaultPrevented/stopPropagation을 사용한다. `data-comment-control`은 toolbar/input/배치 작업 버튼을 감싸고 실제 slide surface는 감싸지 않는다.
  5. 최종 점검: Header와 제작에는 기존 ProjectHeader/WorkspaceSelection/WorkspaceFlow/CommentsProvider를 그대로 하나씩 사용한다. 별도 시연 앱·중복 runtime·신규 저장소를 생성하지 않는다. 다른 5개 메뉴의 공통 헤더와 모바일 메뉴/h1은 회귀 없이 유지한다.

## Acceptance Criteria

- [x] 중앙에 대목차 breadcrumb·소목차 picker·상태 select가 있고 코멘트 버튼은 상태 select 바로 왼쪽에 1개만 표시된다.
- [x] 입력 영역은 상단에 남고 실제 슬라이드 영역만 스크롤되며 좌우 패널과 독립적이다.
- [x] 제목/리딩/문단/리스트/표/이미지 데이터와 한국어 IME·붙여넣기·Ctrl+S·미저장 입력 보호가 유지된다.
- [x] 세 preview 종류에서 active slide의 버튼/aria-controls/좌표/포커스가 정확히 연결되고 썸네일에는 핀 UI가 없다.
- [x] 다중 선택 입력과 선택에서 빼기·Escape가 동작 계약을 만족하고 active preview/버튼 중복이 없다.
- [x] 저장·복사·삭제·undo·제안 비교/적용·보관본·권한 상실·회차 변경 보호를 유지한다.
- [x] HTML의 예시 프로젝트·슬라이드·전역 S 상태·시연 타이머를 이식하지 않는다.
- [x] 전체 타입/lint/build 성공 및 정적 대조를 기록하고 브라우저 시각 검증은 미실시로 남긴다.

## Validation

- `npm.cmd run typecheck` — 성공.
- `npm.cmd run lint` — 전체 lint 성공.
- `npm.cmd run build` — Next.js production build 성공. 환경 실패가 있으면 원인과 기존/신규 여부를 기록하고 통과로 쓰지 않는다. 이 검증 때문에 Azure 리소스·비밀·패키지를 변경하지 않는다.
- `git diff --check` — 공백 오류 없음.
- `rg -n 'commentCreateTarget|CommentCreateButton|data-production-scroll|requestPinMode|선택에서 빼기' components/comments components/workspace/production` — 세 renderer 전달, 단일 버튼 소유자, 새 스크롤 경계 및 guard 호출 확인.
- 정적 trace matrix: 단일 Basic/HtmlDemo/Template, 다중2/3장, current가 첫 번째가 아닌 선택, 선택2→1, 빈 소목차, dirty+다중, IME 중 전송, 저장 충돌, snapshot, 완성 상태, 담당 변경, 회차 변경, 접근 거절, 핀 생성 중 섹션 이동, offscreen surface, 팝오버 Escape·삭제 후 포커스, 너비 조절 후 좌표를 검토한다.
- 파일 추가 없이 타입/lint/build·정적 분석만 사용한다. `tests/`, CUA/브라우저/E2E/스크린샷/dev server를 생성·실행하지 않는다.
- 결과와 소스 대비 의도적 차이(실제 guard/제안 비교/원문 미연결/기존 데이터)는 `.memory/reports/2026-11-06-workspace-html-v13-parity-T03.md`에 기록한다. 실제 시각·마우스 검증을 통과로 기록하지 않는다.

## Commit Message

```text
feat(production): HTML v13 중앙 편집과 코멘트 도구 적용

Plan: 2026-11-06-workspace-html-v13-parity
Phase: P01-workspace-ui
Task: T03-production-editor

- 섹션 선택과 입력 도구를 고정하고 슬라이드 스크롤을 분리
- 상태 선택 왼쪽으로 코멘트 버튼을 옮기고 다중 선택 흐름 연결
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task를 포함한 `feat(production): HTML v13 중앙 편집과 코멘트 도구 적용` 커밋 (`git log -- 이 파일`로 조회)

검증과 커밋 후 phase를 done3/3, Plan P01을 done으로 갱신하고 `.memory/current.md` Active Task를 없음으로 변경한다. 검증 미통과 상태를 완료로 쓰지 않는다. 지정 변경·이 계획 기록만 커밋하며 current는 강제 stage하지 않는다. push/배포는 하지 않는다.

- 결과: [T03 검증·학습 기록](../../../reports/2026-11-06-workspace-html-v13-parity-T03.md). 시각·마우스 검증은 제외 정책에 따라 미실시.
