# Task: T06 중앙 상단 편집 입력과 상태별 노출

## Status: pending

## Goal

단일 슬라이드를 선택하면 중앙 상단에서 `편집` 입력과 `슬라이드에 반영`을 찾을 수 있고, 그 아래에서 저장된 슬라이드를 확인한다. 입력이 없는 상태에는 이유와 다음 동작을 명확히 표시한다.

## Decision Summary

- Plan: `2026-11-05-production-editor-panels`, Phase: `P01-production-editor`. T05 이후 순차 실행. D12의 편집 영역 피드백을 반영한다.
- 문서형 직접 편집을 기본으로 유지한다. 편집 엔진·초안·AI·권한 계약을 교체하지 않는다. 사용자 화면에서 입력이 안 보인 원인은 실측되지 않았으므로 `contenteditable 미구현` 또는 특정 데이터 오류로 단정하지 않는다.

## Implementation

### I01. 하나의 문서 입력을 분명하게 표시

- Related Files:
  - `components/workspace/production/SlideContentEditor.tsx` :: `SlideContentEditor`, `useStyles` — modify.
  - `lib/workspace/production/document-editor.ts` :: `createSlideDocument`, `readSlideDocument`, `applyDocumentCommand`, `parseSlidePaste` — read-only.
  - `hooks/workspace/use-slide-draft.ts` :: `useSlideDraft` — read-only.

#### Details

- **Signatures & Types**: 기존 public props를 유지한다.
  ```typescript
  interface DocumentEditorState {
    dirty: boolean; composing: boolean; error: string | null;
  }
  interface SlideContentEditorProps {
    value: SlideContent; readOnly: boolean; error: string | null;
    onChange(value: SlideContent): void; onSave(): void;
    busy?: boolean; onImage?(file: File): void;
    resetKey?: number;
    onEditorStateChange?(state: DocumentEditorState): void;
  }
  ```
- **Data & Schema Fields**:
  - `SlideContent`: `title:string`, `lead:string`, `blocks:ContentBlock[]`. 블록은 기존 text/list/table/image discriminated union을 그대로 사용한다. 제목/본문 문자열·목록 항목·표 행열·이미지·블록 ID를 보존한다.
  - `ContentBlock` 공통 `id:string`, `kind`별 필드: text=`text:string`; list=`items:string[]`; table=`columns:string[], rows:string[][]`; image=`blobId:string, alt:string, width:number, height:number, mime:"image/png"|"image/jpeg"`. 모두 기존 필수 필드이며 nullable 필드를 추가하지 않는다. 새 문서나 기본 데이터를 자동 생성하는 변경은 없다.
  - DOM·커서는 편집기에만 있으며 DB 모델로 추가하지 않는다. 기존 `content`, `baseline`, `stateRef`, `selection`, `appliedReset`, `resetFrame` ref와 `DocumentEditorState`를 유지한다.
  - 구조 도구의 펼침은 로컬 `<details>`로 관리하며 기본 닫힘이다. 문서 입력 자체를 details 안에 넣지 않는다. 새 저장 필드 없음.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 데이터가 있는 단일 슬라이드는 권한 상태와 무관하게 기존 문서 값을 표시할 수 있다. 읽기 전용은 입력 불가를 명시한다. 접근 거부 시 저장본을 숨기되 기존 dirty 초안을 보존하는 상위 정책을 유지한다.
  2. shell 상단에 눈에 보이는 `편집` 제목과 `읽기 전용`/미반영 상태를 배치한다. 문서 영역에 이 제목의 ID를 연결한다. 문서에는 `min-height:48px`, `max-height:180px`, `overflow-y:auto`, 현재 border/background/focus 스타일을 사용한다. title/lead/body의 기존 placeholder를 유지하고 입력 안내가 본문과 혼동되지 않게 한다.
  3. 기본 순서는 제목 → 문서 입력 → `슬라이드에 반영`·상태/오류 → 보조 `문서 도구` details다. 문단·목록·표·이미지 추가 및 블록/행열 조작은 기존 handler를 유지하고 details 안으로 옮긴다. 입력이 도구 아래로 밀리지 않게 한다.
  4. `readOnly`에서는 편집 불가 상태를 표시하고 mutation 도구·반영 버튼을 노출하지 않는다. `busy`, 조합 중, 파싱 오류 및 외부 오류 시 기존 저장 비활성 조건을 유지한다. 단순 blur/Enter로 저장하지 않는다.
  5. 기존 imperative DOM 초기화는 초기/명시 reset/clean 외부 변경 때만 실행한다. 제목·도구 위치를 바꾸는 작업으로 root key 변경, 매 render replaceChildren, 문자열 textarea 왕복을 도입하지 않는다. 한글 조합/Range/초안 보호를 보존한다.
  6. Error & Exception Handling: 문서 구조 오류·붙여넣기 대체 안내·저장 실패는 문서 가까이에 표시하고 입력을 지우지 않는다. `resetFrame`은 명시 reset/언마운트 때만 취소하는 기존 규칙을 보존한다.
  7. State Transition & Return: 반영 전 초안, 성공 뒤 저장본 미리보기 갱신이라는 기존 흐름을 유지한다. 입력 영역이 보이게 하는 작업으로 저장 동작·데이터 형식을 바꾸지 않는다.

### I02. 직접 편집 우선 순서와 선택별 상태

- Related Files:
  - `components/workspace/production/ProductionWorkspace.tsx` :: `ActiveSlide`, `ProductionWorkspace`, `center` — modify.
  - `components/workspace/production/ProductionAiPanel.tsx`, `ProductionPreview.tsx`, `SlideTemplatePicker.tsx` — read-only, 기존 렌더 재사용.
  - `components/workspace/WorkspaceSelectionProvider.tsx`, `lib/workspace/production/routing.ts` :: `resolveWorkspaceSelection` — read-only.

#### Details

- **Signatures & Types**:
  ```typescript
  // 파일 내부 ActiveSlide props에만 추가한다.
  aiControls?: React.ReactNode;
  aiFeedback?: React.ReactNode;
  // 기존 EditingSession 유지.
  interface EditingSession {
    slideId: string; round: number; snapshotId: string | null;
    lastSlide: ProposalSlide; dirty: boolean;
  }
  ```
- **Data & Schema Fields**:
  - 현재 선택: `WorkspaceSelection { projectId, sectionId, slideId, snapshotId }`, 각 값 `string|null`.
  - `active`는 전체 rows에서 선택 slide, 없으면 선택 section의 첫 slide, 없으면 null이다. `resolveWorkspaceSelection`은 기본 section을 결정하며 빈 섹션도 유효하다. 다른 섹션 첫 slide로 무조건 fallback하는 새 규칙을 넣지 않는다.
  - `selected:string[]|null`: null은 기본 단일 선택, `[]`는 명시적 선택 해제이다. `ids`가 없더라도 기존 활성 슬라이드 문서를 자동 삭제하거나 바꾸지 않는다.
- **Execution Flow / Logic**:
  1. 단일 선택: toolbar/슬라이드 조작 → ActiveSlide의 편집 입력 → 접힌 단일 AI 요청 → AI 피드백 → Template 보조 설정 → 저장된 슬라이드 순서로 렌더한다. AI UI를 상위에서 구성해 `aiControls`, `aiFeedback` 슬롯으로 전달하여 기존 AI 요청/권한 처리와 문서 초안 소유권을 유지한다. 피드백을 두 번 표시하지 않는다.
  2. 다중 선택: 중앙 상단에 `여러 슬라이드 편집`·선택 개수/대상, 기존 펼친 AI 요청 입력과 선택 미리보기를 표시한다. `한 장씩 편집` 버튼은 현재 선택 중 활성 slide(없으면 선택 첫 항목)를 `chooseSlide(id,"single")` 경로로 전환한다. `guarded`/runtime.navigate 안에서만 선택을 바꾸고 취소 후 state 변경을 하지 않는다.
  3. 기존 `<div hidden={ids.length > 1 && !session?.dirty}>`의 편집 세션 보존 의도를 유지한다. 패널 접기/모바일 전환/다중 선택 UI 변화 때문에 `ActiveSlide`를 key 교체 또는 조건부 재마운트하여 dirty DOM을 잃지 않는다. dirty 충돌 세션은 보관 입력이라는 설명과 함께 표시한다.
  4. 빈 섹션: `편집` 영역에 `이 소목차에는 슬라이드가 없습니다`를 표시하고 기존 권한 있는 추가/초안 생성 경로를 연결한다. 다른 섹션에 슬라이드가 있으면 `왼쪽 목록에서 다른 슬라이드를 선택할 수 있습니다`를 안내한다. 무단 자동 생성·선택 이동 없음. 목차도 없으면 기존 목차 메뉴 안내를 유지한다.
  5. 읽기 전용/완성본/보관본/고정 상태: 입력값과 저장본을 보여주되 쓰기 불가와 이유를 표시한다. 기존 허용된 고정 해제 버튼만 유지한다. 접근 오류는 현재 readOnlyError/accessDenied 경계를 사용하며 저장본 비공개·dirty 초안 유지 정책을 바꾸지 않는다.
  6. 외부 회차 변경·삭제·충돌: `session.lastSlide`를 보존하고 저장 차단·복사/폐기 경로를 유지한다. `ActiveSlide` key는 project:snapshot:slide이며 revision/round/권한을 새 key에 추가하지 않는다. `canSave`와 `onBusyChange(localBusy)`를 바꾸지 않는다.
  7. Error & Exception Handling: 오류가 났다는 이유로 문서 대신 빈 입력을 만들지 않는다. 미반영 초안이나 한글 조합 중 선택/AI 시작은 기존 DraftProtection을 거친다.
  8. State Transition & Return: 직접 편집·AI 요청·미리보기는 같은 활성 slide를 사용한다. 이번 작업에 새 서비스 호출·선택 전역 정책 변경은 없다.

## Acceptance Criteria

- [ ] 단일 선택의 중앙 상단에 `편집` 제목·문서 입력·반영 동작이 기본 표시된다.
- [ ] 직접 입력이 AI/Template보다 먼저이고, 구조 도구를 펼치지 않아도 편집할 수 있다.
- [ ] 입력은 기존 제목·lead·목록·표·이미지/ID를 보존하고 반영 후 저장본과 일치한다.
- [ ] 다중 선택, 명시적 선택 해제, 빈 섹션, 목차 없음, 읽기 전용, 접근 오류, dirty 충돌 각각의 표시가 명시되어 있다.
- [ ] 패널 전환/도구 펼침/readonly 갱신으로 초안 DOM을 재생성하지 않고 IME/저장/이동 보호를 유지한다.

## Validation

- `npm.cmd run typecheck`
- `npx.cmd eslint components/workspace/production/SlideContentEditor.tsx components/workspace/production/ProductionWorkspace.tsx`
- `git diff --check`
- 정적 상태표: 단일 clean/dirty, 다중, 선택 해제, 빈 section(다른 section에 slide 있음/없음), 목차 없음, snapshot, completed, locked, accessDenied+dirty, 회차 충돌 각각에서 표시되는 편집/AI/미리보기·쓰기 가능 여부를 기록한다. 선택 provider의 정상 복구를 중복 구현하지 않았는지 확인한다.
- 필요 시 기존 React/jsdom과 TypeScript transpile을 stdin `node --input-type=module`로 사용해 실제 `SlideContentEditor`의 props 재렌더 후 같은 문서 root 유지, readOnly 속성, 명시 reset, 도구 펼침 시 dirty 유지 확인. 라이브러리 보조만 단순화하고 검사 대상 컴포넌트는 실제 구현을 사용한다. 새 검증 파일/폴더 없음.
- CSS 수치 복제 테스트나 실제 브라우저 확인은 수행하지 않는다. `tests/`, CUA/E2E/스크린샷/IME/검증용 dev server 금지. 단순 타입 검사 통과를 화면 노출 실측으로 보고하지 않는다.

## Commit Message

```text
fix(write): 중앙 상단 편집 입력과 상태별 안내 정리

Plan: 2026-11-05-production-editor-panels
Phase: P01-production-editor
Task: T06-editor-visibility

- 직접 편집 입력을 AI와 보조 설정보다 먼저 표시
- 다중 선택과 빈 섹션 및 읽기 전용의 편집 상태 안내
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending

검증 후 관련 파일만 한국어 커밋한다. phase 진행률6/7, 로컬 ignored current는 T07로 갱신한다. 이전 완료 Task 재실행·force stage·push/배포 금지.
