# Task: T02 편집 높이 축소 및 중앙 외곽 카드·제목 정리

## Status: done

## Goal

제작 화면의 중앙 편집칸을 너비는 유지한 채 낮추고, 반영 아이콘을 입력칸 안으로 옮긴다. 별도 `편집`/`슬라이드` 제목과 중앙 공통 흰 외곽 카드를 제거하여 HTML처럼 편집칸만 흰 배경이고 슬라이드는 작업 배경 위에 바로 놓이도록 한다.

## Decision Summary

- 사용자는 높이 축소를 선택했다. HTML `.sl-body`의 최소 48px·최대 180px와 내부 스크롤을 기준으로 하고 상시 제목/안내 행을 제거한다.
- T01의 슬라이드 핀 표면과 기존 상태·저장·한글 입력·미저장 입력 보호를 유지한다. 스타일 변경을 이유로 문서 내용이나 model을 바꾸지 않는다.

## Prerequisites

- 같은 Phase의 T01이 done이고 타입/lint/build 및 핀 저장·생성 검증을 통과한 상태.
- T01은 `SlideCommentSurface.tsx`를 추가했고, ProductionPanels 중앙 section에 `data-production-scroll`을 달았으며, ActiveSlide에 `showPreview={!multiple}`를 전달해 중복 핀 표면을 제거했다. 이 계약을 유지한다.
- 기존 route `app/(authenticated)/workspace/[screen]/page.tsx`의 write 분기는 CommentsWorkspace다. route 수정은 필요 없다.
- `tests/` 생성·복원 및 브라우저/CUA/E2E/dev server/스크린샷 검증 금지. 이번 Task도 기존 타입/lint/build·stdin 검증을 사용한다.

## Implementation

### I01. 중앙 공통 외곽 카드 제거

- Related Files:
  - `components/workspace/production/ProductionPanels.tsx` :: `ProductionPanels`, `panel`, 중앙 section — 중앙 장식과 스크롤 구조 분리; modify
  - `components/comments/CommentsWorkspace.tsx` :: workspace surface — 현재 작업 배경·높이 확인; read-only
  - `components/workspace/production/ProductionToolbar.tsx` :: 현재 소목차/상태 조작 — 기능 보존 확인; read-only

#### Details

- **Signatures & Types** — 기존 시그니처 유지:

  ```typescript
  interface ProductionPanelsProps {
    namespace: string;
    left(toggleButton: React.ReactNode): React.ReactNode;
    center: React.ReactNode;
    right(toggleButton: React.ReactNode): React.ReactNode;
  }
  function ProductionPanels(props: ProductionPanelsProps): React.ReactElement;
  ```

- **Data & Schema Fields**: 영속 데이터 변경 없음. 기존 leftOpen/rightOpen/mobilePanel/leftWidth/rightWidth와 namespace별 저장을 유지한다. 중앙의 `data-production-scroll`, editorId, aria-label 및 모바일 표시 클래스는 유지한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 현재 `panel` 문자열은 box-border/min-h-0/rounded-xl/border/border-line/bg-card를 함께 포함하고 세 pane에 붙는다. 중앙에서 단순히 문자열 전체를 제거하면 높이 제약도 사라진다.
  2. Core Processing: 좌우 aside의 panel은 그대로 유지한다. 중앙 section에서는 rounded/border/bg-card만 제거하고 `tw:box-border tw:min-h-0 tw:min-w-0 tw:flex-1 tw:overflow-y-auto tw:overscroll-contain`을 명시적으로 유지한다. 중앙 배경은 투명하게 하고 parent 작업 배경을 사용한다.
  3. 중앙 여백은 현재 `tw:p-(--layout-card-inset)`를 유지한다. 이는 외곽 카드가 아니라 내용 간격과 T01의 3px offset 점선이 잘리지 않을 공간이다. 좌우 패널 너비·리사이저·mobile 전환·1180px 출처 overlay·761px 접기 rail을 바꾸지 않는다.
  4. Error & Exception Handling: 오류/빈 화면이 들어와도 중앙 overflow 경계와 flex min-height가 유지되어 페이지 전체 높이를 밀지 않아야 한다. 오류를 숨기거나 html/body에 임의 overflow:hidden을 추가해 문제를 가리지 않는다.
  5. State Transition & Return: 스크롤과 폭은 기존 패널이 관리하고, 보이는 흰 카드는 편집 입력만 남는다. 실제 슬라이드의 배경·테두리·그림자·핀 점선은 제거하지 않는다.

### I02. 편집칸을 본문과 안쪽 반영 버튼으로 축소

- Related Files:
  - `components/workspace/production/SlideContentEditor.tsx` :: `useStyles`, `SlideContentEditor`의 JSX — 제목/안내 행 제거, 내부 버튼·접근성; modify
  - `lib/workspace/production/document-editor.ts` :: `createSlideDocument`, `readSlideDocument`, `parseSlidePaste` — 문서 생성·읽기·붙여넣기 유지; read-only
  - `hooks/workspace/use-slide-draft.ts` :: `useSlideDraft` — 기존 저장·conflict·draft 계약; read-only
  - `components/ui/DadamControls.tsx` :: `DadamButton` — 기존 아이콘 버튼; read-only

#### Details

- **Signatures & Types** — public props와 callback 시그니처 유지:

  ```typescript
  interface DocumentEditorState {
    dirty: boolean;
    composing: boolean;
    error: string | null;
  }
  interface SlideContentEditorProps {
    value: SlideContent;
    readOnly: boolean;
    error: string | null;
    onChange(value: SlideContent): void;
    onSave(): void;
    busy?: boolean;
    resetKey?: number;
    onEditorStateChange?(state: DocumentEditorState): void;
  }
  function SlideContentEditor(props: SlideContentEditorProps): React.ReactElement;
  ```

- **Data & Schema Fields**:
  - `SlideContent.title: string`, `lead: string`, `blocks: ContentBlock[]`와 text/list/table/image 각 block 형태는 그대로다. 사용자에게 보이는 문서의 실제 제목 h2는 제거하지 않는다.
  - `state.dirty`, `state.composing`, `state.error`, `notice`, `resetKey`, baseline 및 selection ref는 모두 유지한다. 레이아웃 조정으로 onChange/onSave를 새로 호출하지 않는다.
  - headingId는 별도 제목 제거 후 필요 없어지므로 삭제한다. hintId는 유지하고 스크린리더용 안내를 연결한다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 현재 shell 안에는 `header(편집/직접 편집)`, paper, 오류·notice, footer(일반 안내/반영 버튼)가 있다. public props와 DOM 문서 편집 handlers를 유지하면서 장식 구조만 바꾼다.
  2. Core Processing: shell은 현재 흰 배경·테두리·테마 radius 유지. header와 상시 footer를 제거하고 `inputFrame`(position relative) 안에 paper와 반영 버튼을 형제로 둔다. 오류·notice·조건부 상태는 inputFrame **바깥**에 둔다. 오류가 생겨도 버튼이 오류 문구 아래로 이동하지 않게 한다.
  3. paper는 `boxSizing: border-box`, `minHeight: 48px`, `maxHeight: 180px`, `overflowY: auto`, `overscrollBehavior: contain`, `padding: 12px 52px 12px 16px`로 한다. 너비는 shell을 채운다. 긴 본문은 내부 스크롤로 읽고 입력할 수 있다. 폭 제한 또는 내용 자르기/삭제를 추가하지 않는다.
  4. 반영 버튼은 inputFrame의 right 10px/bottom 10px에 absolute 배치한다. 30×30px, minWidth/minHeight도 30px, padding 0, 원형으로 하고 기존 primary 테마와 ArrowUp20Regular를 사용한다. `aria-label`·title은 `슬라이드에 반영`. paper의 오른쪽 52px 여백으로 글자·스크롤과 버튼이 겹치지 않게 한다.
  5. readOnly에서는 기존처럼 반영 버튼을 숨긴다. disabled 조건 `blocked || !!state.error || !!error`와 onClick=onSave를 유지한다. 새로 dirty 조건을 추가해 기존 저장 정책을 바꾸지 않는다.
  6. `role=group`의 aria-labelledby를 삭제된 headingId에 남기지 않는다. `aria-label="슬라이드 내용 편집"`, aria-describedby=hintId로 대체한다. hintId의 설명은 visually-hidden 스타일로 남긴다. section의 `aria-label="슬라이드 문서 편집"`, data-comment-control은 유지한다.
  7. 기본 `직접 편집` 및 장문의 상시 안내는 보이지 않게 한다. readOnly 또는 state.dirty일 때만 짧은 상태 문구를 inputFrame 뒤에 표시한다. 동시에 true이면 읽기 전용과 미반영 내용 보존 사실을 함께 알린다. role=status 사용. state.error/error/붙여넣기 notice는 현재 역할·문구를 보존한다. 상태가 필요할 때 높이가 늘어나는 것은 허용한다.
  8. `onCompositionStart/End`, onInput, onBeforeInput, onKeyDown, onPaste, 초기 문서 생성과 reset effect를 그대로 유지한다. 저장 중 조합 입력 보호, 빈 block의 임시 편집 문단, table 셀 이동, HTML 붙여넣기 검사, Ctrl/Meta+S bubbling을 바꾸지 않는다.
  9. Error & Exception Handling: 문서 구조 읽기 실패는 state.error로 남고 저장 버튼이 비활성화된다. 직접 DOM을 truncate하거나 textarea 하나로 변환해 표·이미지·목록 구조를 잃지 않는다.
  10. State Transition & Return: 동일 문서·동일 저장 동작을 더 낮은 입력칸에서 제공한다. header/title/footer에만 쓰이던 styles/import/headingId는 정리해 lint를 통과시킨다.

### I03. 중앙의 불필요한 제목과 빈 상태 정리

- Related Files:
  - `components/workspace/production/ProductionWorkspace.tsx` :: `ActiveSlide`, 편집 빈 상태, 다중 선택 미리보기 — UI 제목만 제거; modify
  - `components/workspace/production/ProductionAiPanel.tsx` :: 기존 2줄 다중 요청 입력 — 변경 불필요 확인; read-only
  - `components/comments/SlideCommentSurface.tsx` :: T01 표면 — 배치 호환 확인; read-only

#### Details

- **Signatures & Types**: T01의 ActiveSlide showPreview boolean 및 기존 props 유지. 새 영속 모델이나 hook을 추가하지 않는다.
- **Data & Schema Fields**: `editingSlide`, `session`, `documentState`, `multiple`, `ids`, draft 보호는 유지한다. 보이는 UI label과 실제 slide.content.title을 구별한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: ActiveSlide의 저장본 section에는 고정 문자열 `<h3>슬라이드</h3>`가 있고, 편집 빈 상태에는 `<h2>편집</h2>`가 있다. 사용자 요청은 이 고정 UI 제목과 편집기의 고정 제목을 제거하는 것이다.
  2. Core Processing: 두 고정 제목만 삭제한다. `section aria-label="저장된 슬라이드"`, 빈 상태의 aria-label과 설명 문구는 유지한다. 빈 상태 외곽 border/rounded 카드도 제거해 비어 있을 때만 중앙에 다른 큰 카드가 생기지 않도록 한다.
  3. 다중 선택의 `번호. 실제 제목 / 소목차` 및 `N장 선택`은 문서를 구별하는 정보이므로 유지한다. 실제 슬라이드 면 안 제목·슬라이드 번호·HTML 예시 레이블을 변경하지 않는다.
  4. 기본 편집→슬라이드 간격은 현재 `--layout-section-gap`을 사용한다. 제목을 지운 빈 margin wrapper가 남지 않도록 한다. T01의 각 slide 아래 핀 생성 버튼과 오류/초과 안내는 유지한다.
  5. 다중 요청은 기존 rows=2와 반영 아이콘, instruction trim/maxLength 4000, IME/Enter 처리 및 편집 가능 여부를 유지한다. 이 요청 입력은 원래 별도 입력 카드이므로 새 부모 카드로 다시 감싸지 않는다. 임의로 단일 AI 입력을 추가하지 않는다.
  6. Error & Exception Handling: accessDenied·externalConflict·빈 소목차·없어진 slide 설명이 사라지지 않게 한다. T01에서 유지한 미저장 편집 세션과 showPreview 조건을 제거하지 않는다.
  7. State Transition & Return: 정상/빈/읽기 전용/다중 선택 모두 같은 중앙 구조와 스크롤 경계를 사용한다.

## Acceptance Criteria

- [x] 중앙 section에는 공통 흰 배경·테두리·둥근 외곽 카드가 없다. 좌우 패널은 기존 모습과 기능을 유지한다.
- [x] 편집 입력만 흰 배경이며 기본 너비가 유지된다. 본문 높이는 border-box 기준 48~180px, 초과 내용은 내부 스크롤이다.
- [x] 반영 버튼은 입력칸 오른쪽 아래에 있고 본문·오류 문구와 겹치지 않는다.
- [x] 고정 `편집`/`슬라이드` 제목과 상시 일반 안내 행이 없다. 접근성 이름·필요한 상태·오류 안내는 남는다.
- [x] 실제 slide 제목·리딩 메시지·본문의 데이터와 편집 동작은 유지된다.
- [x] dirty/IME/읽기 전용/저장 충돌/붙여넣기 보호 및 Ctrl/Meta+S가 유지된다.
- [x] 다중 선택·빈 상태에서도 추가 외곽 카드나 중복 핀 표면이 생기지 않는다.
- [x] 중앙 min-height/overflow 경계와 T01의 표면·portal 배치가 유지된다.

## Validation

프로젝트 루트 PowerShell에서 실행한다.

- `npm.cmd run typecheck` — 타입 오류 0.
- `npm.cmd run lint` — 미사용 headingId/styles/import 등 오류 0.
- `npm.cmd run build` — production build 성공.
- `git diff --check` — 공백 오류 0.
- `rg -n 'data-production-scroll|min-h-0|overflow-y-auto|bg-\(--kpc-card\)' components/workspace/production/ProductionPanels.tsx` — 중앙 스크롤 제약 유지와 좌우 카드 범위 정적 검토.
- `rg -n 'minHeight|maxHeight|boxSizing|padding|aria-label|aria-describedby|onComposition|onSave' components/workspace/production/SlideContentEditor.tsx` — 입력 높이/접근성/저장·조합 입력 handler의 보존 검토.

필요한 상호작용 검증은 literal here-string을 `node --import tsx`로 넘기는 stdin 방식으로 작성·실행한다. 검증 파일·tests/를 만들지 않는다. 기존 React/jsdom/tsx를 사용하고 DOM/ResizeObserver만 모의 처리한다.

| 대상 | 실제 호출·조작 | 기대 결과와 이유 |
| :--- | :--- | :--- |
| 편집 구조 | 실제 SlideContentEditor를 jsdom/createRoot/React.act로 렌더 | 고정 편집 heading/footer 없음, 문서 제목은 남음, group의 aria 이름과 hint 연결 유효 |
| 스타일 | 렌더된 Griffel 규칙과 소스값에서 paper border-box/max-height/padding, button absolute/right/bottom 확인 | DOM 크기 계산이 없는 jsdom에서 눈에 보이는 결과를 확인했다고 주장하지 않음 |
| 문서 값 | 제목·lead·text/list/table을 가진 value를 렌더, 실제 document-editor로 읽기 | 레이아웃 변경 전후 같은 구조와 문자열 |
| 입력/저장 | 문서 editable에 input, 반영 버튼 클릭 | onChange와 onSave 유지, 기존 데이터 변환 규칙 유지 |
| 한글 조합 | compositionstart → input → 반영 버튼/저장 키 → compositionend | 조합 중 저장 억제, 끝난 뒤 정상 반영, 임의 DOM 재생성 없음 |
| 상태 표시 | clean/dirty/readOnly/error/notice 각각 렌더 | clean은 상시 안내 없음, 다른 상태 안내·오류 표시, readOnly 버튼 없음 |
| 패널 구조 | 실제 ProductionPanels를 desktop/mobile 상태로 렌더하여 class/aria/marker 검사 | 좌우 카드/토글 유지, 중앙에만 bg/border/radius 제거, min-height/overflow 유지 |
| 통합 | 실제 ProductionWorkspace에서 single/multiple/empty/dirty 상태를 렌더 | 고정 슬라이드 제목 없음, 실제 제목·핀 버튼 유지, ActiveSlide 중복 preview 없음 |

T01의 도메인 검증을 변경 없이 전부 반복할 필요는 없다. T02 수정이 핀 표면·팝업 표시 구조에 영향을 주므로 단일/다중 표면 수와 스크롤 경계·portal 유지에 대한 통합 확인은 수행한다. 실제 브라우저 수동 검증은 사용자가 할 수 있도록 완료 보고서에 `/workspace/write?project=production-html-demo` 경로를 안내하되 자동 실행하지 않는다.

## Commit Message

```text
제작 편집 입력 높이를 줄이고 중앙 슬라이드 배치를 정리

Plan: 2026-11-05-production-slide-pin-layout
Phase: P01-slide-pin-layout
Task: T02-compact-editor-layout

- 편집 입력 내부에 반영 버튼을 배치하고 상시 제목 및 안내 행 제거
- 중앙 공통 외곽 카드를 제거하고 편집칸과 슬라이드 배경 분리
- 기존 문서 편집과 한글 입력 보호 및 패널 스크롤 유지
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 문서를 포함한 T02 완료 커밋. 해시는 로컬 current.md와 사용자 완료 보고에 기록한다.

완료 후 이 Task의 Status를 done으로 바꾸고 실제 검증 결과·커밋을 기록한다. phase.md는 done 2/2, Plan은 done으로 갱신한다. `.memory/current.md`는 Active Task 없음으로 전진하고 `.memory/reports/2026-11-05-production-slide-pin-layout.md`에 완료 범위·검증·한계를 기록한다. current.md 강제 stage 금지. push·배포 없음.

## Execution Result (2026-11-06)

- ProductionPanels 중앙 장식만 제거하고 box-border/min-h-0/overflow/data-production-scroll과 여백을 유지했다.
- SlideContentEditor의 고정 제목·상시 안내를 제거하고 본문을 border-box 48~180px로 제한했다. 반영 버튼은 입력칸 안쪽 30×30px 원형으로 배치했다. 접근성 설명은 숨김 텍스트로 유지하고 dirty/readOnly/error/notice만 필요한 때 표시한다.
- ProductionWorkspace의 고정 슬라이드/빈 편집 제목 및 빈 상태 카드를 제거했다. 실제 제목·다중 선택 식별·초안 보존·핀 표면은 유지했다.
- npm.cmd run typecheck / lint / build 및 git diff --check 통과.
- stdin 검증 118개 통과: 실제 편집기/패널 80, 실제 ProductionWorkspace/미리보기/핀 표면/팝업 통합 38. 별도로 기존 editor 상태/effect/입력/IME/붙여넣기/키보드 handler가 이전 커밋과 동일함을 비교 확인했다.
- 편집기는 실제 문서 parser와 DOM 이벤트를 사용했고, 패널은 실제 저장 hook과 namespace별 localStorage를 사용했다. 통합 검증은 실제 useSlideDraft와 controller를 사용하고 query/runtime/인접 패널 데이터는 메모리 fixture로 대체했다.
- Griffel 버튼 크기는 DOM에 주입된 atomic CSS 규칙으로 검증했다. jsdom의 styleSheets 등록 순서와 실제 style DOM 순서 차이 때문에 computedStyle만으로 브라우저 렌더 결과를 판단하지 않는다.
- 실제 브라우저 육안 검증 및 tests/ 생성 없음. 사용자 수동 확인: /workspace/write?project=production-html-demo.
- 범위 밖 추가 문제: 특이사항 없음.
